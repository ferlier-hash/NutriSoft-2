-- pgTAP Test: 050_patient_access.test.sql
BEGIN;
SELECT plan(4);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "d1111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);

SELECT results_eq('SELECT COUNT(*)::integer FROM api.patient_portal_home', ARRAY[1]);
SELECT results_eq('SELECT COUNT(*)::integer FROM api.check_in_assignments', ARRAY[1]);
SELECT results_eq('SELECT COUNT(*)::integer FROM app.patients', ARRAY[1]);
SELECT results_eq('SELECT COUNT(*)::integer FROM app.alerts', ARRAY[0]);

SELECT * FROM finish();
ROLLBACK;
