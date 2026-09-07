-- pgTAP Test: 091_audit_content.test.sql
BEGIN;
SELECT plan(10);

CREATE TEMP TABLE _audit_count_before AS
SELECT COUNT(*)::integer AS count FROM app.audit_logs;

-- Una RPC fallida no debe dejar evidencia engañosa en auditoría.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "d1111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);
SELECT throws_ok(
  $$ SELECT api.submit_check_in('99999999-9999-4999-8999-999999999999'::uuid, 1::smallint, 1::smallint) $$,
  'Asignación de check-in no encontrada',
  'La RPC fallida devuelve el error esperado'
);

RESET ROLE;
SELECT results_eq(
  'SELECT COUNT(*)::integer FROM app.audit_logs',
  'SELECT count FROM _audit_count_before',
  'La RPC fallida no modifica el conteo de auditoría'
);
SELECT results_eq(
  $$ SELECT COUNT(*)::integer FROM app.audit_logs WHERE action = 'SUBMIT_CHECK_IN' AND resource_id = '99999999-9999-4999-8999-999999999999' $$,
  ARRAY[0],
  'No existe una fila de auditoría asociada al recurso fallido'
);

-- El trigger defensivo rechaza contenido sensible o estructuras inválidas.
SELECT throws_ok(
  $$ INSERT INTO app.audit_logs (actor_id, organization_id, action, resource_type, details)
     VALUES ('a0000000-0000-4000-8000-000000000000', '11111111-1111-4111-8111-111111111111', 'TEST', 'test', '{"notes": "secreto"}'::jsonb) $$,
  'El registro de auditoría contiene información clínica o confidencial prohibida',
  'Las claves clínicas prohibidas son rechazadas'
);
SELECT throws_ok(
  $$ INSERT INTO app.audit_logs (actor_id, organization_id, action, resource_type, details)
     VALUES ('a0000000-0000-4000-8000-000000000000', '11111111-1111-4111-8111-111111111111', 'TEST', 'test', '"string"'::jsonb) $$,
  'Los detalles del registro de auditoría deben ser un objeto JSON',
  'Los detalles que no son objetos JSON son rechazados'
);

-- La tabla es append-only.
SELECT throws_ok(
  $$ UPDATE app.audit_logs SET action = 'MODIFIED' $$,
  'Los registros de auditoría son inmutables y no pueden modificarse ni eliminarse.',
  'UPDATE sobre auditoría está bloqueado'
);
SELECT throws_ok(
  $$ DELETE FROM app.audit_logs $$,
  'Los registros de auditoría son inmutables y no pueden modificarse ni eliminarse.',
  'DELETE sobre auditoría está bloqueado'
);

-- Una RPC válida crea exactamente una fila desidentificada y atribuible.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "b2222222-2222-4222-8222-222222222222", "role": "authenticated"}', true);
CREATE TEMP TABLE _valid_recommendation AS
SELECT api.create_recommendation(
  '11111111-1111-4111-8111-111111111111'::uuid,
  'f1111111-1111-4111-8111-111111111111'::uuid,
  'Recomendación ficticia para prueba de auditoría',
  NULL
) AS id;

RESET ROLE;
SELECT results_eq(
  $$
    SELECT COUNT(*)::integer
    FROM app.audit_logs a
    JOIN _valid_recommendation r ON r.id = a.resource_id
    WHERE a.action = 'CREATE_RECOMMENDATION'
  $$,
  ARRAY[1],
  'La RPC válida crea exactamente una fila de auditoría'
);
SELECT results_eq(
  $$
    SELECT COUNT(*)::integer
    FROM app.audit_logs a
    JOIN _valid_recommendation r ON r.id = a.resource_id
    WHERE a.actor_id = 'b2222222-2222-4222-8222-222222222222'
  $$,
  ARRAY[1],
  'La fila de auditoría conserva el actor correcto'
);
SELECT results_eq(
  $$
    SELECT COUNT(*)::integer
    FROM app.audit_logs a
    JOIN _valid_recommendation r ON r.id = a.resource_id
    WHERE jsonb_typeof(a.details) = 'object'
      AND NOT (a.details ?| ARRAY['first_name', 'last_name', 'email', 'phone', 'notes', 'recommendation_text', 'energy', 'adherence', 'help_requested', 'password', 'token', 'secret'])
  $$,
  ARRAY[1],
  'La auditoría válida contiene un objeto seguro y desidentificado'
);

SELECT * FROM finish();
ROLLBACK;
