-- pgTAP Test: 070_check_in_logic.test.sql
BEGIN;
SELECT plan(4);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "d1111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);

SELECT is_definer('api', 'submit_check_in', ARRAY['uuid', 'smallint', 'smallint', 'boolean', 'text']);

SELECT lives_ok(
  $$ SELECT api.submit_check_in('c1111111-1111-4111-8111-111111111111'::uuid, 1::smallint, 1::smallint, true, 'Notas de prueba') $$
);

SELECT results_eq(
  'SELECT status FROM app.check_in_assignments WHERE id = ''c1111111-1111-4111-8111-111111111111''',
  ARRAY['completed']
);

SELECT throws_ok(
  $$ SELECT api.submit_check_in('c1111111-1111-4111-8111-111111111111'::uuid, 4::smallint, 4::smallint, false) $$,
  'La asignación no está en estado pendiente'
);

SELECT * FROM finish();
ROLLBACK;
