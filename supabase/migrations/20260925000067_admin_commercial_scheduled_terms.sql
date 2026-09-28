-- Show the single open tariff even before its effective date so scheduled prices
-- remain visible in Platform Admin instead of appearing as "pending".
CREATE OR REPLACE FUNCTION api.get_admin_platform_revenue_report(p_from date,p_to date)
RETURNS TABLE(
  organization_id uuid,organization_name text,organization_slug text,current_plan text,
  term_id uuid,term_plan text,billing_frequency text,term_amount numeric,term_currency text,effective_from date,
  term_history jsonb,received_by_currency jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path=''
AS $$
BEGIN
  IF NOT security.is_current_platform_admin() THEN RAISE EXCEPTION 'Acceso no autorizado: requiere rol platform_admin'; END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_from>=p_to OR p_to-p_from>366 THEN RAISE EXCEPTION 'Elegí un período válido de hasta 366 días.'; END IF;
  RETURN QUERY
  WITH current_terms AS (
    SELECT DISTINCT ON (t.organization_id) t.* FROM app.organization_commercial_terms t
    WHERE t.effective_to IS NULL
    ORDER BY t.organization_id,t.effective_from DESC,t.created_at DESC
  ), receipts AS (
    SELECT r.organization_id,r.currency,sum(r.amount)::numeric(14,2) AS amount,count(*)::integer AS receipt_count
    FROM app.organization_commercial_receipts r
    WHERE r.status='received' AND r.received_on>=p_from AND r.received_on<p_to
    GROUP BY r.organization_id,r.currency
  ), receipts_by_org AS (
    SELECT r.organization_id,jsonb_agg(jsonb_build_object('currency',r.currency,'amount',r.amount,'receipt_count',r.receipt_count) ORDER BY r.currency) AS totals
    FROM receipts r GROUP BY r.organization_id
  ), terms_by_org AS (
    SELECT t.organization_id,jsonb_agg(jsonb_build_object(
      'term_id',t.id,'plan',t.plan_slug,'billing_frequency',t.billing_frequency,
      'amount',t.amount,'currency',t.currency,'effective_from',t.effective_from,'effective_to',t.effective_to
    ) ORDER BY t.effective_from DESC,t.created_at DESC) AS history
    FROM app.organization_commercial_terms t GROUP BY t.organization_id
  )
  SELECT o.id,o.name,o.slug,s.plan_slug,t.id,t.plan_slug,t.billing_frequency,t.amount,t.currency,t.effective_from,
    coalesce(h.history,'[]'::jsonb),coalesce(r.totals,'[]'::jsonb)
  FROM app.organizations o
  LEFT JOIN app.organization_subscriptions s ON s.organization_id=o.id
  LEFT JOIN current_terms t ON t.organization_id=o.id
  LEFT JOIN terms_by_org h ON h.organization_id=o.id
  LEFT JOIN receipts_by_org r ON r.organization_id=o.id
  ORDER BY o.name,o.id;
END;
$$;
