-- pgTAP Test: 020_platform_admin_rls.test.sql
BEGIN;
SELECT plan(6);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "a0000000-0000-4000-8000-000000000000", "role": "authenticated"}', true);

SELECT results_eq('SELECT COUNT(*)::integer FROM app.organizations', ARRAY[3]);

SELECT is(api.get_admin_metrics()->>'organizations_total', '3');

SELECT results_eq('SELECT COUNT(*)::integer FROM app.patients', ARRAY[0]);
SELECT results_eq('SELECT COUNT(*)::integer FROM app.check_in_responses', ARRAY[0]);
SELECT results_eq('SELECT COUNT(*)::integer FROM app.alerts', ARRAY[0]);
SELECT results_eq('SELECT COUNT(*)::integer FROM app.patient_recommendations', ARRAY[0]);

SELECT * FROM finish();
ROLLBACK;
