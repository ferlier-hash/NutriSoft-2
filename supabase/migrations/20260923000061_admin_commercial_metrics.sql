-- Aggregated commercial metrics for Platform Admin. No clinical content is exposed.
CREATE OR REPLACE FUNCTION api.get_admin_metrics()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_result jsonb;
BEGIN
  IF NOT security.is_current_platform_admin() THEN RAISE EXCEPTION 'Acceso no autorizado: requiere rol platform_admin'; END IF;
  SELECT jsonb_build_object(
    'organizations_total',(SELECT count(*) FROM app.organizations),
    'organizations_active',(SELECT count(*) FROM app.organizations WHERE status='active'),
    'organizations_suspended',(SELECT count(*) FROM app.organizations WHERE status='suspended'),
    'nutritionists_total',(SELECT count(*) FROM app.organization_members WHERE role IN ('organization_owner','nutritionist') AND status='active'),
    'patients_total',(SELECT count(*) FROM app.patients WHERE status='active'),
    'subscriptions_by_plan',coalesce((SELECT jsonb_object_agg(plan_slug,total) FROM (SELECT s.plan_slug,count(*) total FROM app.organization_subscriptions s GROUP BY s.plan_slug) grouped),'{}'::jsonb),
    'subscriptions_by_status',coalesce((SELECT jsonb_object_agg(status,total) FROM (SELECT s.status,count(*) total FROM app.organization_subscriptions s GROUP BY s.status) grouped),'{}'::jsonb),
    'included_professionals_total',coalesce((SELECT sum(p.included_professionals) FROM app.organization_subscriptions s JOIN app.plan_catalog p ON p.slug=s.plan_slug),0),
    'extra_professionals_total',coalesce((SELECT sum(s.extra_professionals) FROM app.organization_subscriptions s),0),
    'custom_enabled_total',coalesce((SELECT count(*) FROM app.organization_subscriptions s JOIN app.plan_catalog p ON p.slug=s.plan_slug WHERE p.custom_branding_enabled),0)
  ) INTO v_result;
  RETURN v_result;
END; $$;
REVOKE EXECUTE ON FUNCTION api.get_admin_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.get_admin_metrics() TO authenticated;
NOTIFY pgrst,'reload schema';
