-- pgTAP Test: 070_check_in_logic.test.sql
BEGIN;
SELECT plan(4);

-- Evita que un contenedor local persistente convierta esta prueba funcional en
-- una prueba accidental de vencimiento por el paso del tiempo.
UPDATE app.check_in_assignments
SET due_date = now() + interval '1 day'
WHERE id = 'c1111111-1111-4111-8111-111111111111';

-- Autenticar como María González (d1111111-1111-4111-8111-111111111111)
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "d1111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);

-- 1. Verificar definidor de función api.submit_check_in
SELECT is_definer('api', 'submit_check_in', ARRAY['uuid', 'smallint', 'smallint', 'boolean', 'text']);

-- 2. Ejecutar la función RPC de respuesta
SELECT lives_ok(
  $$ SELECT api.submit_check_in('c1111111-1111-4111-8111-111111111111'::uuid, 1::smallint, 1::smallint, true, 'Notas de prueba') $$
);

-- 3. La asignación cambia a estado completed
SELECT results_eq(
  'SELECT status FROM app.check_in_assignments WHERE id = ''c1111111-1111-4111-8111-111111111111''',
  ARRAY['completed']
);

-- 4. Re-intentar responder la misma asignación lanza excepción
SELECT throws_ok(
  $$ SELECT api.submit_check_in('c1111111-1111-4111-8111-111111111111'::uuid, 4::smallint, 4::smallint, false) $$,
  'La asignación no está en estado pendiente'
);

SELECT * FROM finish();
ROLLBACK;
