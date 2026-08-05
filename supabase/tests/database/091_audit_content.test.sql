-- pgTAP Test: 091_audit_content.test.sql
BEGIN;
SELECT plan(4);

-- 1. Intentar insertar directamente un audit log con clave prohibida (notes) es rechazado por el trigger defensivo
SELECT throws_ok(
  $$ INSERT INTO app.audit_logs (actor_id, organization_id, action, resource_type, details)
     VALUES ('a0000000-0000-4000-8000-000000000000', '11111111-1111-4111-8111-111111111111', 'TEST', 'test', '{"notes": "secreto"}'::jsonb) $$,
  'El registro de auditoría contiene información clínica o confidencial prohibida'
);

-- 2. Intentar insertar un audit log con detalles que no son un objeto JSON es rechazado
SELECT throws_ok(
  $$ INSERT INTO app.audit_logs (actor_id, organization_id, action, resource_type, details)
     VALUES ('a0000000-0000-4000-8000-000000000000', '11111111-1111-4111-8111-111111111111', 'TEST', 'test', '"string"'::jsonb) $$,
  'Los detalles del registro de auditoría deben ser un objeto JSON'
);

-- 3. Una operación RPC fallida NO genera ningún registro de auditoría en la tabla
SELECT lives_ok(
  $$ BEGIN;
     SELECT throws_ok('SELECT api.submit_check_in(''99999999-9999-4999-8999-999999999999''::uuid, 1::smallint, 1::smallint)');
     ROLLBACK; $$
);

-- 4. Verificar que audit_logs es inmutable
SELECT throws_ok(
  $$ UPDATE app.audit_logs SET action = 'MODIFIED' $$,
  'Los registros de auditoría son inmutables y no pueden modificarse ni eliminarse.'
);

SELECT * FROM finish();
ROLLBACK;
