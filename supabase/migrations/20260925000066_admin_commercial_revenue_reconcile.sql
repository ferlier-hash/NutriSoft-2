-- Idempotent reconciliation for environments where migration 65 was already
-- applied before negotiated tariffs and manual platform receipts were added.
CREATE TABLE IF NOT EXISTS app.organization_commercial_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE RESTRICT,
  plan_slug text NOT NULL CHECK (plan_slug IN ('pro','ultra','custom')),
  billing_frequency text NOT NULL CHECK (billing_frequency IN ('monthly','yearly')),
  amount numeric(12,2) NOT NULL CHECK (amount>=0),
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  effective_from date NOT NULL,
  effective_to date NULL CHECK (effective_to IS NULL OR effective_to>=effective_from),
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_organization_commercial_terms_open ON app.organization_commercial_terms(organization_id) WHERE effective_to IS NULL;
CREATE INDEX IF NOT EXISTS ix_organization_commercial_terms_history ON app.organization_commercial_terms(organization_id,effective_from DESC);

CREATE TABLE IF NOT EXISTS app.organization_commercial_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE RESTRICT,
  term_id uuid NOT NULL REFERENCES app.organization_commercial_terms(id) ON DELETE RESTRICT,
  request_id uuid NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount>0),
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  received_on date NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL CHECK (period_end>=period_start),
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','voided')),
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  voided_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  voided_at timestamptz NULL,
  UNIQUE(created_by,request_id),
  CHECK ((status='received' AND voided_by IS NULL AND voided_at IS NULL) OR (status='voided' AND voided_by IS NOT NULL AND voided_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS ix_organization_commercial_receipts_period ON app.organization_commercial_receipts(received_on DESC,organization_id);
ALTER TABLE app.organization_commercial_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.organization_commercial_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app.organization_commercial_terms,app.organization_commercial_receipts FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION api.set_admin_organization_commercial_term(
  p_organization_id uuid,p_plan_slug text,p_billing_frequency text,p_amount numeric,p_currency text,p_effective_from date
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_old app.organization_commercial_terms%ROWTYPE; v_org app.organizations%ROWTYPE; v_new_id uuid;
BEGIN
  IF NOT security.is_current_platform_admin() THEN RAISE EXCEPTION 'Sólo Platform Admin puede configurar tarifas.'; END IF;
  IF p_plan_slug NOT IN ('pro','ultra','custom') OR p_billing_frequency NOT IN ('monthly','yearly')
    OR p_amount IS NULL OR p_amount<0 OR p_amount>9999999999.99 OR p_currency !~ '^[A-Z]{3}$'
    OR p_effective_from IS NULL OR extract(day FROM p_effective_from)<>1 THEN
    RAISE EXCEPTION 'La tarifa, moneda, frecuencia o vigencia no es válida.';
  END IF;
  SELECT * INTO v_org FROM app.organizations WHERE id=p_organization_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Consultorio no encontrado.'; END IF;
  SELECT * INTO v_old FROM app.organization_commercial_terms WHERE organization_id=p_organization_id AND effective_to IS NULL FOR UPDATE;
  IF FOUND THEN
    IF p_effective_from<=v_old.effective_from THEN RAISE EXCEPTION 'La nueva tarifa debe comenzar después de la vigencia actual.'; END IF;
    IF v_old.billing_frequency='yearly' AND (extract(month FROM p_effective_from)<>extract(month FROM v_old.effective_from) OR extract(day FROM p_effective_from)<>extract(day FROM v_old.effective_from)) THEN
      RAISE EXCEPTION 'La tarifa anual sólo puede cambiar en su fecha de renovación.';
    END IF;
    UPDATE app.organization_commercial_terms SET effective_to=p_effective_from-1 WHERE id=v_old.id;
  ELSIF EXISTS(SELECT 1 FROM app.organization_commercial_terms t WHERE t.organization_id=p_organization_id AND t.effective_to>=p_effective_from) THEN
    RAISE EXCEPTION 'La vigencia se superpone con una tarifa histórica.';
  END IF;
  INSERT INTO app.organization_commercial_terms(organization_id,plan_slug,billing_frequency,amount,currency,effective_from,created_by)
  VALUES(p_organization_id,p_plan_slug,p_billing_frequency,p_amount,p_currency,p_effective_from,auth.uid()) RETURNING id INTO v_new_id;
  INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details)
  VALUES(auth.uid(),p_organization_id,'SET_PLATFORM_COMMERCIAL_TERM','commercial_term',v_new_id,
    jsonb_build_object('plan_slug',p_plan_slug,'billing_frequency',p_billing_frequency,'amount',p_amount,'currency',p_currency,'effective_from',p_effective_from,'organization_name',v_org.name,'organization_slug',v_org.slug));
  RETURN v_new_id;
END;
$$;

CREATE OR REPLACE FUNCTION api.record_admin_organization_commercial_receipt(
  p_organization_id uuid,p_term_id uuid,p_request_id uuid,p_amount numeric,p_currency text,
  p_received_on date,p_period_start date,p_period_end date
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_term app.organization_commercial_terms%ROWTYPE; v_existing uuid; v_new_id uuid; v_expected_end date;
BEGIN
  IF NOT security.is_current_platform_admin() THEN RAISE EXCEPTION 'Sólo Platform Admin puede registrar cobros de plataforma.'; END IF;
  IF p_request_id IS NULL OR p_amount IS NULL OR p_amount<=0 OR p_amount>9999999999.99
    OR p_currency !~ '^[A-Z]{3}$' OR p_received_on IS NULL OR p_received_on>CURRENT_DATE
    OR p_period_start IS NULL OR p_period_end IS NULL OR p_period_end<p_period_start THEN
    RAISE EXCEPTION 'Los datos del cobro no son válidos.';
  END IF;
  SELECT * INTO v_term FROM app.organization_commercial_terms t WHERE t.id=p_term_id AND t.organization_id=p_organization_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'No existe una tarifa vigente para el consultorio.'; END IF;
  IF p_currency<>v_term.currency OR p_period_start<v_term.effective_from OR (v_term.effective_to IS NOT NULL AND p_period_start>v_term.effective_to) THEN
    RAISE EXCEPTION 'Moneda o período no corresponde a la tarifa acordada.';
  END IF;
  v_expected_end:=CASE WHEN v_term.billing_frequency='monthly'
    THEN (date_trunc('month',p_period_start::timestamp)+interval '1 month - 1 day')::date
    ELSE (p_period_start+interval '1 year - 1 day')::date END;
  IF p_period_end<>v_expected_end THEN RAISE EXCEPTION 'El período no coincide con la frecuencia de cobro acordada.'; END IF;
  IF v_term.billing_frequency='monthly' AND p_period_start<>date_trunc('month',p_period_start::timestamp)::date THEN RAISE EXCEPTION 'El período mensual debe comenzar el primer día del mes.'; END IF;
  IF v_term.billing_frequency='yearly' AND (extract(month FROM p_period_start)<>extract(month FROM v_term.effective_from) OR extract(day FROM p_period_start)<>extract(day FROM v_term.effective_from)) THEN RAISE EXCEPTION 'El período anual debe comenzar en la fecha de renovación.'; END IF;
  SELECT id INTO v_existing FROM app.organization_commercial_receipts WHERE created_by=auth.uid() AND request_id=p_request_id;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;
  INSERT INTO app.organization_commercial_receipts(organization_id,term_id,request_id,amount,currency,received_on,period_start,period_end,created_by)
  VALUES(p_organization_id,p_term_id,p_request_id,p_amount,p_currency,p_received_on,p_period_start,p_period_end,auth.uid()) RETURNING id INTO v_new_id;
  RETURN v_new_id;
END;
$$;

CREATE OR REPLACE FUNCTION api.void_admin_organization_commercial_receipt(p_receipt_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT security.is_current_platform_admin() THEN RAISE EXCEPTION 'Sólo Platform Admin puede corregir cobros de plataforma.'; END IF;
  UPDATE app.organization_commercial_receipts SET status='voided',voided_by=auth.uid(),voided_at=clock_timestamp() WHERE id=p_receipt_id AND status='received';
  IF NOT FOUND THEN RAISE EXCEPTION 'El cobro no existe o ya fue anulado.'; END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION api.get_admin_platform_revenue_report(p_from date,p_to date)
RETURNS TABLE(organization_id uuid,organization_name text,organization_slug text,current_plan text,term_id uuid,term_plan text,billing_frequency text,term_amount numeric,term_currency text,effective_from date,term_history jsonb,received_by_currency jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT security.is_current_platform_admin() THEN RAISE EXCEPTION 'Acceso no autorizado: requiere rol platform_admin'; END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_from>=p_to OR p_to-p_from>366 THEN RAISE EXCEPTION 'Elegí un período válido de hasta 366 días.'; END IF;
  RETURN QUERY
  WITH current_terms AS (
    SELECT DISTINCT ON (t.organization_id) t.* FROM app.organization_commercial_terms t
    WHERE t.effective_from<=CURRENT_DATE AND (t.effective_to IS NULL OR t.effective_to>=CURRENT_DATE)
    ORDER BY t.organization_id,t.effective_from DESC,t.created_at DESC
  ), receipts AS (
    SELECT r.organization_id,r.currency,sum(r.amount)::numeric(14,2) AS amount,count(*)::integer AS receipt_count
    FROM app.organization_commercial_receipts r WHERE r.status='received' AND r.received_on>=p_from AND r.received_on<p_to
    GROUP BY r.organization_id,r.currency
  ), receipts_by_org AS (
    SELECT r.organization_id,jsonb_agg(jsonb_build_object('currency',r.currency,'amount',r.amount,'receipt_count',r.receipt_count) ORDER BY r.currency) AS totals
    FROM receipts r GROUP BY r.organization_id
  ), terms_by_org AS (
    SELECT t.organization_id,jsonb_agg(jsonb_build_object('term_id',t.id,'plan',t.plan_slug,'billing_frequency',t.billing_frequency,'amount',t.amount,'currency',t.currency,'effective_from',t.effective_from,'effective_to',t.effective_to) ORDER BY t.effective_from DESC,t.created_at DESC) AS history
    FROM app.organization_commercial_terms t GROUP BY t.organization_id
  )
  SELECT o.id,o.name,o.slug,s.plan_slug,t.id,t.plan_slug,t.billing_frequency,t.amount,t.currency,t.effective_from,coalesce(h.history,'[]'::jsonb),coalesce(r.totals,'[]'::jsonb)
  FROM app.organizations o LEFT JOIN app.organization_subscriptions s ON s.organization_id=o.id
  LEFT JOIN current_terms t ON t.organization_id=o.id LEFT JOIN terms_by_org h ON h.organization_id=o.id
  LEFT JOIN receipts_by_org r ON r.organization_id=o.id ORDER BY o.name,o.id;
END;
$$;

CREATE OR REPLACE FUNCTION api.get_admin_platform_receipts(p_from date,p_to date,p_limit integer DEFAULT 50,p_offset integer DEFAULT 0)
RETURNS TABLE(receipt_id uuid,organization_id uuid,organization_name text,received_on date,period_start date,period_end date,amount numeric,currency text,status text,billing_frequency text,voided_at timestamptz,total_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT security.is_current_platform_admin() THEN RAISE EXCEPTION 'Acceso no autorizado: requiere rol platform_admin'; END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_from>=p_to OR p_to-p_from>366 THEN RAISE EXCEPTION 'Elegí un período válido de hasta 366 días.'; END IF;
  IF p_limit IS NULL OR p_limit<1 OR p_limit>100 OR p_offset IS NULL OR p_offset<0 OR p_offset>100000 THEN RAISE EXCEPTION 'Paginación no válida.'; END IF;
  RETURN QUERY
  WITH filtered AS (
    SELECT r.id,r.organization_id,o.name,r.received_on,r.period_start,r.period_end,r.amount,r.currency,r.status,t.billing_frequency,r.voided_at
    FROM app.organization_commercial_receipts r JOIN app.organizations o ON o.id=r.organization_id
    JOIN app.organization_commercial_terms t ON t.id=r.term_id WHERE r.received_on>=p_from AND r.received_on<p_to
  ),paged AS (SELECT f.*,count(*) OVER() AS total FROM filtered f ORDER BY f.received_on DESC,f.id DESC LIMIT p_limit OFFSET p_offset)
  SELECT p.id,p.organization_id,p.name,p.received_on,p.period_start,p.period_end,p.amount,p.currency,p.status,p.billing_frequency,p.voided_at,p.total FROM paged p;
END;
$$;

REVOKE ALL ON FUNCTION api.set_admin_organization_commercial_term(uuid,text,text,numeric,text,date),api.record_admin_organization_commercial_receipt(uuid,uuid,uuid,numeric,text,date,date,date),api.void_admin_organization_commercial_receipt(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION api.set_admin_organization_commercial_term(uuid,text,text,numeric,text,date),api.record_admin_organization_commercial_receipt(uuid,uuid,uuid,numeric,text,date,date,date),api.void_admin_organization_commercial_receipt(uuid) TO authenticated;
REVOKE ALL ON FUNCTION api.get_admin_platform_revenue_report(date,date),api.get_admin_platform_receipts(date,date,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION api.get_admin_platform_revenue_report(date,date),api.get_admin_platform_receipts(date,date,integer,integer) TO authenticated;
NOTIFY pgrst,'reload schema';
