ALTER TABLE app.organization_commercial_terms
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL;

DROP INDEX IF EXISTS app.uq_organization_commercial_terms_open;
CREATE UNIQUE INDEX uq_organization_commercial_terms_open
  ON app.organization_commercial_terms(organization_id)
  WHERE effective_to IS NULL AND cancelled_at IS NULL;

CREATE OR REPLACE FUNCTION api.set_admin_organization_commercial_term(
  p_organization_id uuid,p_plan_slug text,p_billing_frequency text,p_amount numeric,p_currency text,p_effective_from date
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  v_old app.organization_commercial_terms%ROWTYPE;
  v_predecessor app.organization_commercial_terms%ROWTYPE;
  v_org app.organizations%ROWTYPE;
  v_new_id uuid;
  v_last_paid_end date;
  v_replacing_schedule boolean := false;
BEGIN
  IF NOT security.is_current_platform_admin() THEN RAISE EXCEPTION 'Sólo Platform Admin puede configurar tarifas.'; END IF;
  IF p_plan_slug NOT IN ('pro','ultra','custom') OR p_billing_frequency NOT IN ('monthly','yearly')
    OR p_amount IS NULL OR p_amount<0 OR p_amount>9999999999.99 OR p_currency !~ '^[A-Z]{3}$'
    OR p_effective_from IS NULL THEN
    RAISE EXCEPTION 'La tarifa, moneda, frecuencia o vigencia no es válida.';
  END IF;

  SELECT * INTO v_org FROM app.organizations WHERE id=p_organization_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Consultorio no encontrado.'; END IF;
  SELECT * INTO v_old FROM app.organization_commercial_terms
    WHERE organization_id=p_organization_id AND effective_to IS NULL AND cancelled_at IS NULL
    FOR UPDATE;

  IF FOUND AND v_old.effective_from>CURRENT_DATE THEN
    IF EXISTS(SELECT 1 FROM app.organization_commercial_receipts WHERE term_id=v_old.id) THEN
      RAISE EXCEPTION 'No se puede mover una tarifa programada después de registrar cobros para ella.';
    END IF;
    v_replacing_schedule:=true;
    UPDATE app.organization_commercial_terms
      SET cancelled_at=clock_timestamp(),cancelled_by=auth.uid()
      WHERE id=v_old.id;
    INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details)
      VALUES(auth.uid(),p_organization_id,'RESCHEDULE_PLATFORM_COMMERCIAL_TERM','commercial_term',v_old.id,
        jsonb_build_object('previous_plan',v_old.plan_slug,'previous_amount',v_old.amount,'previous_currency',v_old.currency,
          'previous_frequency',v_old.billing_frequency,'previous_effective_from',v_old.effective_from,
          'organization_name',v_org.name,'organization_slug',v_org.slug));
    SELECT * INTO v_predecessor FROM app.organization_commercial_terms
      WHERE organization_id=p_organization_id AND cancelled_at IS NULL AND effective_to IS NOT NULL
        AND effective_from<v_old.effective_from
      ORDER BY effective_from DESC,created_at DESC LIMIT 1 FOR UPDATE;
    IF FOUND THEN
      UPDATE app.organization_commercial_terms SET effective_to=NULL WHERE id=v_predecessor.id;
      v_old:=v_predecessor;
    ELSE
      v_old:=NULL;
    END IF;
  END IF;

  IF v_old.id IS NOT NULL THEN
    SELECT max(period_end) INTO v_last_paid_end FROM app.organization_commercial_receipts
      WHERE term_id=v_old.id AND status='received';
    IF v_last_paid_end IS NOT NULL AND p_effective_from<=v_last_paid_end THEN
      RAISE EXCEPTION 'La nueva vigencia debe comenzar después del último período ya cobrado (%).',v_last_paid_end;
    END IF;
    IF p_effective_from<=v_old.effective_from THEN
      IF v_last_paid_end IS NOT NULL THEN
        RAISE EXCEPTION 'No se puede retroceder la vigencia de una tarifa con períodos ya cobrados.';
      END IF;
      IF EXISTS(SELECT 1 FROM app.organization_commercial_receipts WHERE term_id=v_old.id) THEN
        RAISE EXCEPTION 'No se puede reemplazar una tarifa que ya tiene historial de cobros.';
      END IF;
      -- A no-cobro term may be moved before its old start; retain the superseded
      -- version as a cancelled row rather than rewriting its effective date.
      UPDATE app.organization_commercial_terms
        SET cancelled_at=clock_timestamp(),cancelled_by=auth.uid(),effective_to=NULL
        WHERE id=v_old.id;
      INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details)
        VALUES(auth.uid(),p_organization_id,'RESCHEDULE_PLATFORM_COMMERCIAL_TERM',
          'commercial_term',v_old.id,jsonb_build_object('previous_effective_from',v_old.effective_from,
            'replacement_effective_from',p_effective_from,'organization_name',v_org.name,'organization_slug',v_org.slug));
      v_old:=NULL;
    END IF;
  END IF;

  IF v_old.id IS NOT NULL THEN
    UPDATE app.organization_commercial_terms SET effective_to=p_effective_from-1 WHERE id=v_old.id;
  ELSIF EXISTS(
    SELECT 1 FROM app.organization_commercial_terms t
    WHERE t.organization_id=p_organization_id AND t.cancelled_at IS NULL
      AND t.effective_from<=p_effective_from AND (t.effective_to IS NULL OR t.effective_to>=p_effective_from)
  ) THEN
    RAISE EXCEPTION 'La fecha elegida se superpone con una tarifa histórica.';
  END IF;

  INSERT INTO app.organization_commercial_terms(organization_id,plan_slug,billing_frequency,amount,currency,effective_from,created_by)
    VALUES(p_organization_id,p_plan_slug,p_billing_frequency,p_amount,p_currency,p_effective_from,auth.uid())
    RETURNING id INTO v_new_id;
  INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details)
    VALUES(auth.uid(),p_organization_id,'SET_PLATFORM_COMMERCIAL_TERM','commercial_term',v_new_id,
      jsonb_build_object('plan_slug',p_plan_slug,'billing_frequency',p_billing_frequency,'amount',p_amount,
        'currency',p_currency,'effective_from',p_effective_from,'replaced_scheduled_term',v_replacing_schedule,
        'organization_name',v_org.name,'organization_slug',v_org.slug));
  RETURN v_new_id;
END;
$$;

CREATE OR REPLACE FUNCTION api.record_admin_organization_commercial_receipt(
  p_organization_id uuid,p_term_id uuid,p_request_id uuid,p_amount numeric,p_currency text,
  p_received_on date,p_period_start date,p_period_end date
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  v_term app.organization_commercial_terms%ROWTYPE;
  v_existing uuid;
  v_new_id uuid;
  v_expected_start date;
  v_next_start date;
  v_expected_end date;
  v_anchor_day integer;
  v_month_start date;
  v_next_month_start date;
  v_anchor_month integer;
  v_anchor_date date;
BEGIN
  IF NOT security.is_current_platform_admin() THEN RAISE EXCEPTION 'Sólo Platform Admin puede registrar cobros de plataforma.'; END IF;
  IF p_request_id IS NULL OR p_amount IS NULL OR p_amount<=0 OR p_amount>9999999999.99
    OR p_currency !~ '^[A-Z]{3}$' OR p_received_on IS NULL OR p_received_on>CURRENT_DATE
    OR p_period_start IS NULL OR p_period_end IS NULL OR p_period_end<p_period_start THEN
    RAISE EXCEPTION 'Los datos del cobro no son válidos.';
  END IF;
  SELECT * INTO v_term FROM app.organization_commercial_terms t
    WHERE t.id=p_term_id AND t.organization_id=p_organization_id AND t.cancelled_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'No existe una tarifa activa para el consultorio.'; END IF;
  IF p_currency<>v_term.currency OR p_period_start<v_term.effective_from
    OR (v_term.effective_to IS NOT NULL AND p_period_start>v_term.effective_to)
    OR (v_term.effective_to IS NOT NULL AND p_period_end>v_term.effective_to) THEN
    RAISE EXCEPTION 'Moneda o período no corresponde a la vigencia de la tarifa acordada.';
  END IF;

  IF v_term.billing_frequency='monthly' THEN
    v_anchor_day:=extract(day FROM v_term.effective_from)::integer;
    v_month_start:=date_trunc('month',p_period_start::timestamp)::date;
    v_expected_start:=v_month_start+least(v_anchor_day,extract(day FROM (v_month_start+interval '1 month - 1 day')::date)::integer)-1;
    v_next_month_start:=(v_month_start+interval '1 month')::date;
    v_next_start:=v_next_month_start+least(v_anchor_day,extract(day FROM (v_next_month_start+interval '1 month - 1 day')::date)::integer)-1;
    v_expected_end:=v_next_start-1;
  ELSE
    v_anchor_month:=extract(month FROM v_term.effective_from)::integer;
    v_anchor_day:=extract(day FROM v_term.effective_from)::integer;
    v_anchor_date:=make_date(extract(year FROM p_period_start)::integer,v_anchor_month,
      least(v_anchor_day,extract(day FROM (make_date(extract(year FROM p_period_start)::integer,v_anchor_month,1)+interval '1 month - 1 day')::date)::integer));
    v_expected_start:=v_anchor_date;
    v_anchor_date:=make_date(extract(year FROM p_period_start)::integer+1,v_anchor_month,
      least(v_anchor_day,extract(day FROM (make_date(extract(year FROM p_period_start)::integer+1,v_anchor_month,1)+interval '1 month - 1 day')::date)::integer));
    v_expected_end:=v_anchor_date-1;
  END IF;

  IF p_period_start<>v_expected_start OR p_period_end<>v_expected_end THEN
    RAISE EXCEPTION 'El período debe ser un ciclo completo contado desde la fecha de inicio de la tarifa.';
  END IF;
  SELECT id INTO v_existing FROM app.organization_commercial_receipts
    WHERE created_by=auth.uid() AND request_id=p_request_id;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;
  INSERT INTO app.organization_commercial_receipts(organization_id,term_id,request_id,amount,currency,received_on,period_start,period_end,created_by)
    VALUES(p_organization_id,p_term_id,p_request_id,p_amount,p_currency,p_received_on,p_period_start,p_period_end,auth.uid())
    RETURNING id INTO v_new_id;
  RETURN v_new_id;
END;
$$;

CREATE OR REPLACE FUNCTION api.get_admin_platform_revenue_report(p_from date,p_to date)
RETURNS TABLE(
  organization_id uuid,organization_name text,organization_slug text,current_plan text,
  term_id uuid,term_plan text,billing_frequency text,term_amount numeric,term_currency text,effective_from date,
  term_history jsonb,received_by_currency jsonb
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT security.is_current_platform_admin() THEN RAISE EXCEPTION 'Acceso no autorizado: requiere rol platform_admin'; END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_from>=p_to OR p_to-p_from>366 THEN RAISE EXCEPTION 'Elegí un período válido de hasta 366 días.'; END IF;
  RETURN QUERY
  WITH current_terms AS (
    SELECT DISTINCT ON (t.organization_id) t.* FROM app.organization_commercial_terms t
    WHERE t.effective_to IS NULL AND t.cancelled_at IS NULL
    ORDER BY t.organization_id,t.effective_from DESC,t.created_at DESC
  ), receipts AS (
    SELECT r.organization_id,r.currency,sum(r.amount)::numeric(14,2) AS amount,count(*)::integer AS receipt_count
    FROM app.organization_commercial_receipts r WHERE r.status='received' AND r.received_on>=p_from AND r.received_on<p_to
    GROUP BY r.organization_id,r.currency
  ), receipts_by_org AS (
    SELECT r.organization_id,jsonb_agg(jsonb_build_object('currency',r.currency,'amount',r.amount,'receipt_count',r.receipt_count) ORDER BY r.currency) AS totals
    FROM receipts r GROUP BY r.organization_id
  ), terms_by_org AS (
    SELECT t.organization_id,jsonb_agg(jsonb_build_object('term_id',t.id,'plan',t.plan_slug,
      'billing_frequency',t.billing_frequency,'amount',t.amount,'currency',t.currency,
      'effective_from',t.effective_from,'effective_to',t.effective_to,'cancelled_at',t.cancelled_at)
      ORDER BY t.effective_from DESC,t.created_at DESC) AS history
    FROM app.organization_commercial_terms t GROUP BY t.organization_id
  )
  SELECT o.id,o.name,o.slug,s.plan_slug,t.id,t.plan_slug,t.billing_frequency,t.amount,t.currency,t.effective_from,
    coalesce(h.history,'[]'::jsonb),coalesce(r.totals,'[]'::jsonb)
  FROM app.organizations o LEFT JOIN app.organization_subscriptions s ON s.organization_id=o.id
  LEFT JOIN current_terms t ON t.organization_id=o.id LEFT JOIN terms_by_org h ON h.organization_id=o.id
  LEFT JOIN receipts_by_org r ON r.organization_id=o.id ORDER BY o.name,o.id;
END;
$$;

REVOKE ALL ON FUNCTION api.set_admin_organization_commercial_term(uuid,text,text,numeric,text,date),
  api.record_admin_organization_commercial_receipt(uuid,uuid,uuid,numeric,text,date,date,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION api.set_admin_organization_commercial_term(uuid,text,text,numeric,text,date),
  api.record_admin_organization_commercial_receipt(uuid,uuid,uuid,numeric,text,date,date,date) TO authenticated;
NOTIFY pgrst,'reload schema';
