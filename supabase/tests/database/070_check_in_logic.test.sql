-- pgTAP Test: 070_check_in_logic.test.sql
BEGIN;
SELECT plan(4);

-- Autenticar como María González (p1111111-1111-4111-8111-111111111111)
SELECT set_config('request.jwt.claims', '{"sub": "p1111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);

-- 1. María envía su respuesta de check-in (energía=1, adherencia=1, help_requested=true) -> genera 3 alertas
SELECT is_definer('api', 'submit_check_in', ARRAY['uuid', 'smallint', 'smallint', 'boolean', 'text']);

-- 2. Ejecutar la función RPC
SELECT lives_ok(
  $$ SELECT api.submit_check_in('chk11111-1111-4111-8111-111111111111'::uuid, 1::smallint, 1::smallint, true, 'Notas de prueba') $$
);

-- 3. La asignación cambia a estado completed
SELECT results_eq(
  'SELECT status FROM app.check_in_assignments WHERE id = ''chk11111-1111-4111-8111-111111111111''',
  ARRAY['completed']
);

-- 4. Re-intentar responder la misma asignación lanza excepción
SELECT throws_ok(
  $$ SELECT api.submit_check_in('chk11111-1111-4111-8111-111111111111'::uuid, 4::smallint, 4::smallint, false) $$,
  'La asignación no está en estado pendiente'
);

SELECT * FROM finish();
ROLLBACK;
