-- pgTAP Test: 060_assistant_permissions.test.sql
BEGIN;
SELECT plan(4);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "b4444444-4444-4444-8444-444444444444", "role": "authenticated"}', true);

SELECT results_eq('SELECT COUNT(*)::integer FROM api.patient_directory', ARRAY[3]);
SELECT results_eq('SELECT COUNT(*)::integer FROM api.check_in_assignments', ARRAY[2]);
SELECT results_eq('SELECT COUNT(*)::integer FROM app.check_in_responses', ARRAY[0]);
SELECT results_eq('SELECT COUNT(*)::integer FROM app.alerts', ARRAY[0]);

SELECT * FROM finish();
ROLLBACK;
