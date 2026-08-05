-- pgTAP Test: 040_nutritionist_scope.test.sql
BEGIN;
SELECT plan(4);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "b2222222-2222-4222-8222-222222222222", "role": "authenticated"}', true);

SELECT results_eq('SELECT COUNT(*)::integer FROM app.patients', ARRAY[2]);
SELECT results_eq('SELECT COUNT(*)::integer FROM app.patients WHERE id = ''f3333333-3333-4333-8333-333333333333''', ARRAY[0]);

SELECT set_config('request.jwt.claims', '{"sub": "b3333333-3333-4333-8333-333333333333", "role": "authenticated"}', true);

SELECT results_eq('SELECT COUNT(*)::integer FROM app.patients', ARRAY[1]);
SELECT results_eq('SELECT COUNT(*)::integer FROM app.patients WHERE id IN (''f1111111-1111-4111-8111-111111111111'', ''f2222222-2222-4222-8222-222222222222'')', ARRAY[0]);

SELECT * FROM finish();
ROLLBACK;
