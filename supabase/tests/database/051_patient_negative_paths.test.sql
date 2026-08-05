-- pgTAP Test: 051_patient_negative_paths.test.sql
BEGIN;
SELECT plan(5);

-- Autenticar como María González (d1111111-1111-4111-8111-111111111111)
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "d1111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);

-- 1. Paciente intentando insertar directamente en app.check_in_responses (DML directo bloqueado)
SELECT throws_ok(
  $$ INSERT INTO app.check_in_responses (organization_id, assignment_id, patient_id, submitted_by, energy, adherence)
     VALUES ('11111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111', 'f1111111-1111-4111-8111-111111111111', 'd1111111-1111-4111-8111-111111111111', 4, 4) $$,
  'permission denied for table check_in_responses'
);

-- 2. Paciente intentando responder un check-in de OTRO paciente (Pablo c2222222)
SELECT throws_ok(
  $$ SELECT api.submit_check_in('c2222222-2222-4222-8222-222222222222'::uuid, 5::smallint, 5::smallint) $$,
  'No autorizado para responder este check-in'
);

-- 3. Paciente intentando modificar su respuesta enviada previamente
SELECT throws_ok(
  $$ UPDATE app.check_in_responses SET energy = 5 WHERE id = '00000000-0000-4000-8000-000000000001' $$,
  'permission denied for table check_in_responses'
);

-- 4. Paciente intentando eliminar su respuesta enviada previamente
SELECT throws_ok(
  $$ DELETE FROM app.check_in_responses WHERE id = '00000000-0000-4000-8000-000000000001' $$,
  'permission denied for table check_in_responses'
);

-- 5. Paciente no ve alertas clínicas en la vista de inbox
SELECT results_eq('SELECT COUNT(*)::integer FROM api.attention_inbox', ARRAY[0]);

SELECT * FROM finish();
ROLLBACK;
