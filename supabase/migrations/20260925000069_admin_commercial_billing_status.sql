CREATE OR REPLACE FUNCTION app.commercial_cycle_boundary(p_anchor date,p_frequency text,p_index integer)
RETURNS date LANGUAGE plpgsql IMMUTABLE STRICT SET search_path='' AS $$
DECLARE v_month date; v_last_day date; v_month_number integer; v_anchor_day integer;
BEGIN
  IF p_index<0 OR p_frequency NOT IN ('monthly','yearly') THEN RAISE EXCEPTION 'Ciclo comercial no válido.'; END IF;
  v_anchor_day:=extract(day FROM p_anchor)::integer;
  IF p_frequency='monthly' THEN
    v_month:=(date_trunc('month',p_anchor::timestamp)+make_interval(months=>p_index))::date;
    v_last_day:=(date_trunc('month',v_month::timestamp)+interval '1 month - 1 day')::date;
    RETURN v_month+least(v_anchor_day,extract(day FROM v_last_day)::integer)-1;
  END IF;
  v_month_number:=extract(month FROM p_anchor)::integer;
  v_month:=make_date(extract(year FROM p_anchor)::integer+p_index,v_month_number,1);
  v_last_day:=(date_trunc('month',v_month::timestamp)+interval '1 month - 1 day')::date;
  RETURN make_date(extract(year FROM v_month)::integer,v_month_number,least(v_anchor_day,extract(day FROM v_last_day)::integer));
END;
$$;

CREATE TABLE app.organization_commercial_due_date_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE RESTRICT,
  term_id uuid NOT NULL REFERENCES app.organization_commercial_terms(id) ON DELETE RESTRICT,
  period_start date NOT NULL,
  period_end date NOT NULL,
  previous_due_date date NOT NULL,
  new_due_date date NOT NULL,
  changed_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (period_end>=period_start),
  CHECK (new_due_date>previous_due_date)
);
CREATE INDEX ix_commercial_due_date_changes_cycle
  ON app.organization_commercial_due_date_changes(term_id,period_start,changed_at DESC);
ALTER TABLE app.organization_commercial_due_date_changes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app.organization_commercial_due_date_changes FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION api.extend_admin_commercial_billing_due_date(
  p_term_id uuid,p_period_start date,p_new_due_date date
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  v_term app.organization_commercial_terms%ROWTYPE;
  v_org app.organizations%ROWTYPE;
  v_period_end date;
  v_period_index integer;
  v_current_due date;
  v_received numeric;
  v_change_id uuid;
BEGIN
  IF NOT security.is_current_platform_admin() THEN RAISE EXCEPTION 'Sólo Platform Admin puede otorgar prórrogas comerciales.'; END IF;
  IF p_term_id IS NULL OR p_period_start IS NULL OR p_new_due_date IS NULL THEN RAISE EXCEPTION 'Completá el ciclo y la nueva fecha de vencimiento.'; END IF;
  SELECT * INTO v_term FROM app.organization_commercial_terms WHERE id=p_term_id AND cancelled_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tarifa no encontrada o cancelada.'; END IF;
  SELECT * INTO v_org FROM app.organizations WHERE id=v_term.organization_id;
  v_period_index:=CASE WHEN v_term.billing_frequency='monthly'
    THEN (extract(year FROM p_period_start)-extract(year FROM v_term.effective_from))*12+extract(month FROM p_period_start)-extract(month FROM v_term.effective_from)
    ELSE extract(year FROM p_period_start)-extract(year FROM v_term.effective_from) END;
  IF v_period_index<0 OR app.commercial_cycle_boundary(v_term.effective_from,v_term.billing_frequency,v_period_index)<>p_period_start THEN
    RAISE EXCEPTION 'El ciclo seleccionado no coincide con el calendario de esta tarifa.';
  END IF;
  v_period_end:=app.commercial_cycle_boundary(v_term.effective_from,v_term.billing_frequency,v_period_index+1)-1;
  IF v_term.effective_to IS NOT NULL AND v_period_end>v_term.effective_to THEN RAISE EXCEPTION 'El ciclo queda fuera de la vigencia de esta tarifa.'; END IF;
  SELECT coalesce(max(new_due_date),p_period_start) INTO v_current_due
    FROM app.organization_commercial_due_date_changes
    WHERE term_id=p_term_id AND period_start=p_period_start AND period_end=v_period_end;
  IF p_new_due_date<=v_current_due OR p_new_due_date<CURRENT_DATE THEN
    RAISE EXCEPTION 'La nueva fecha debe ser posterior al vencimiento actual y no puede estar en el pasado.';
  END IF;
  SELECT coalesce(sum(amount),0) INTO v_received FROM app.organization_commercial_receipts
    WHERE term_id=p_term_id AND period_start=p_period_start AND period_end=v_period_end AND status='received';
  IF v_received>=v_term.amount THEN RAISE EXCEPTION 'El ciclo ya está pagado; no requiere prórroga.'; END IF;

  INSERT INTO app.organization_commercial_due_date_changes(organization_id,term_id,period_start,period_end,previous_due_date,new_due_date,changed_by)
    VALUES(v_term.organization_id,p_term_id,p_period_start,v_period_end,v_current_due,p_new_due_date,auth.uid())
    RETURNING id INTO v_change_id;
  INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details)
    VALUES(auth.uid(),v_term.organization_id,'EXTEND_PLATFORM_COMMERCIAL_DUE_DATE','commercial_billing_cycle',v_change_id,
      jsonb_build_object('period_start',p_period_start,'period_end',v_period_end,'previous_due_date',v_current_due,
        'new_due_date',p_new_due_date,'organization_name',v_org.name,'organization_slug',v_org.slug));
  RETURN v_change_id;
END;
$$;

CREATE OR REPLACE FUNCTION api.get_admin_platform_billing_report(p_from date,p_to date)
RETURNS TABLE(
  organization_id uuid,organization_name text,organization_slug text,term_id uuid,plan_slug text,billing_frequency text,
  expected_amount numeric,currency text,period_start date,period_end date,base_due_date date,due_date date,
  received_amount numeric,balance numeric,payment_status text,due_status text,extension_count integer,latest_extension_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT security.is_current_platform_admin() THEN RAISE EXCEPTION 'Acceso no autorizado: requiere rol platform_admin'; END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_from>p_to OR p_to-p_from>366 THEN RAISE EXCEPTION 'Elegí un período válido de hasta 366 días.'; END IF;
  RETURN QUERY
  WITH eligible_terms AS (
    SELECT t.*,o.name,o.slug FROM app.organization_commercial_terms t
    JOIN app.organizations o ON o.id=t.organization_id
    WHERE t.cancelled_at IS NULL AND t.effective_from<=p_to AND (t.effective_to IS NULL OR t.effective_to>=p_from)
  ), ranges AS (
    SELECT t.*,
      greatest(0,CASE WHEN t.billing_frequency='monthly'
        THEN (extract(year FROM p_from)-extract(year FROM t.effective_from))*12+extract(month FROM p_from)-extract(month FROM t.effective_from)-1
        ELSE extract(year FROM p_from)-extract(year FROM t.effective_from)-1 END)::integer AS first_index,
      greatest(0,CASE WHEN t.billing_frequency='monthly'
        THEN (extract(year FROM p_to)-extract(year FROM t.effective_from))*12+extract(month FROM p_to)-extract(month FROM t.effective_from)+1
        ELSE extract(year FROM p_to)-extract(year FROM t.effective_from)+1 END)::integer AS last_index
    FROM eligible_terms t
  ), cycles AS (
    SELECT r.organization_id,r.name,r.slug,r.id AS term_id,r.plan_slug,r.billing_frequency,r.amount,r.currency,r.effective_to,
      app.commercial_cycle_boundary(r.effective_from,r.billing_frequency,g.index_value) AS period_start,
      app.commercial_cycle_boundary(r.effective_from,r.billing_frequency,g.index_value+1)-1 AS period_end
    FROM ranges r CROSS JOIN LATERAL generate_series(r.first_index,r.last_index) AS g(index_value)
  ), selected_cycles AS (
    SELECT c.* FROM cycles c
    WHERE c.period_start>=p_from AND c.period_start<=p_to
      AND (c.effective_to IS NULL OR c.period_end<=c.effective_to)
  ), amounts AS (
    SELECT c.*,
      coalesce((SELECT sum(rc.amount) FROM app.organization_commercial_receipts rc
        WHERE rc.term_id=c.term_id AND rc.period_start=c.period_start AND rc.period_end=c.period_end AND rc.status='received'),0)::numeric AS amount_received,
      coalesce((SELECT max(dc.new_due_date) FROM app.organization_commercial_due_date_changes dc
        WHERE dc.term_id=c.term_id AND dc.period_start=c.period_start AND dc.period_end=c.period_end),c.period_start) AS effective_due_date,
      (SELECT count(*)::integer FROM app.organization_commercial_due_date_changes dc
        WHERE dc.term_id=c.term_id AND dc.period_start=c.period_start AND dc.period_end=c.period_end) AS extensions,
      (SELECT max(dc.changed_at) FROM app.organization_commercial_due_date_changes dc
        WHERE dc.term_id=c.term_id AND dc.period_start=c.period_start AND dc.period_end=c.period_end) AS latest_extension_at
    FROM selected_cycles c
  )
  SELECT a.organization_id,a.name,a.slug,a.term_id,a.plan_slug,a.billing_frequency,a.amount,a.currency,
    a.period_start,a.period_end,a.period_start,a.effective_due_date,a.amount_received,
    greatest(a.amount-a.amount_received,0)::numeric,
    CASE WHEN a.amount_received>=a.amount THEN 'paid' WHEN a.amount_received>0 THEN 'partial' ELSE 'unpaid' END,
    CASE WHEN a.amount_received>=a.amount THEN 'settled'
      WHEN a.extensions>0 AND CURRENT_DATE>a.period_start AND a.effective_due_date>=CURRENT_DATE THEN 'grace'
      WHEN a.effective_due_date<CURRENT_DATE THEN 'overdue'
      WHEN a.effective_due_date=CURRENT_DATE THEN 'due_today'
      ELSE 'upcoming' END,
    a.extensions,a.latest_extension_at
  FROM amounts a ORDER BY a.period_start DESC,a.name,a.term_id;
END;
$$;

REVOKE ALL ON FUNCTION api.extend_admin_commercial_billing_due_date(uuid,date,date),api.get_admin_platform_billing_report(date,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION api.extend_admin_commercial_billing_due_date(uuid,date,date),api.get_admin_platform_billing_report(date,date) TO authenticated;
NOTIFY pgrst,'reload schema';
