-- pgTAP Test: 020_platform_admin_rls.test.sql
BEGIN;
SELECT plan(6);

-- Simular autenticación como Platform Admin (a0000000-0000-4000-8000-000000000000)
SELECT set_config('request.jwt.claims', '{"sub": "a0000000-0000-4000-8000-000000000000", "role": "authenticated"}', true);

-- Platform Admin PUEDE ver organizaciones
SELECT results_eq('SELECT COUNT(*)::integer FROM app.organizations', ARRAY[3]);

-- Platform Admin PUEDE llamar a RPC de métricas agregadas desidentificadas
SELECT is(api.get_admin_metrics()->>'organizations_total', '3');

-- Platform Admin NO PUEDE ver datos clínicos (patients, responses, alerts, recommendations)
SELECT results_eq('SELECT COUNT(*)::integer FROM app.patients', ARRAY[0]);
SELECT results_eq('SELECT COUNT(*)::integer FROM app.check_in_responses', ARRAY[0]);
SELECT results_eq('SELECT COUNT(*)::integer FROM app.alerts', ARRAY[0]);
SELECT results_eq('SELECT COUNT(*)::integer FROM app.patient_recommendations', ARRAY[0]);

SELECT * FROM finish();
ROLLBACK;
