-- pgTAP Test: 091_audit_content.test.sql
BEGIN;
SELECT plan(6);

-- 1. Guardar conteo inicial de audit_logs
CREATE TEMP TABLE _audit_count_before AS SELECT COUNT(*)::integer AS count FROM app.audit_logs;

-- 2. Ejecutar una RPC que falla con throws_ok (sin envolver en lives_ok!)
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "d1111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);
SELECT throws_ok(
  $$ SELECT api.submit_check_in('99999999-9999-4999-8999-999999999999'::uuid, 1::smallint, 1::smallint) $$,
  'Asignación de check-in no encontrada'
);

-- 3. Confirmar que el conteo final es idéntico al inicial (cero audit logs creados tras fallo)
RESET ROLE;
SELECT results_eq(
  'SELECT COUNT(*)::integer FROM app.audit_logs',
  'SELECT count FROM _audit_count_before'
);

-- 4. Intentar insertar directamente un audit log con clave prohibida (notes) es rechazado por el trigger defensivo
SELECT throws_ok(
  $$ INSERT INTO app.audit_logs (actor_id, organization_id, action, resource_type, details)
     VALUES ('a0000000-0000-4000-8000-000000000000', '11111111-1111-4111-8111-111111111111', 'TEST', 'test', '{"notes": "secreto"}'::jsonb) $$,
  'El registro de auditoría contiene información clínica o confidencial prohibida'
);

-- 5. Intentar insertar un audit log con detalles que no son un objeto JSON es rechazado
SELECT throws_ok(
  $$ INSERT INTO app.audit_logs (actor_id, organization_id, action, resource_type, details)
     VALUES ('a0000000-0000-4000-8000-000000000000', '11111111-1111-4111-8111-111111111111', 'TEST', 'test', '"string"'::jsonb) $$,
  'Los detalles del registro de auditoría deben ser un objeto JSON'
);

-- 6. Verificar que audit_logs es inmutable
SELECT throws_ok(
  $$ UPDATE app.audit_logs SET action = 'MODIFIED' $$,
  'Los registros de auditoría son inmutables y no pueden modificarse ni eliminarse.'
);

SELECT * FROM finish();
ROLLBACK;
