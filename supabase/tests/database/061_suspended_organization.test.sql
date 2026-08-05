-- pgTAP Test: 061_suspended_organization.test.sql
BEGIN;
SELECT plan(6);

-- 1. Owner de organización suspendida intentando crear paciente
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "c2222222-2222-4222-8222-222222222222", "role": "authenticated"}', true);
SELECT throws_ok(
  $$ SELECT api.create_patient('33333333-3333-4333-8333-333333333333'::uuid, 'Test', 'Patient') $$,
  'La organización no está activa'
);

-- 2. Nutricionista de organización suspendida intentando asignar check-in
SELECT set_config('request.jwt.claims', '{"sub": "c3333333-3333-4333-8333-333333333333", "role": "authenticated"}', true);
SELECT throws_ok(
  $$ SELECT api.assign_check_in('33333333-3333-4333-8333-333333333333'::uuid, 'f5555555-5555-4555-8555-555555555555'::uuid) $$,
  'La organización no está activa'
);

-- 3. Assistant de organización suspendida ve 0 pacientes en el directorio
SELECT set_config('request.jwt.claims', '{"sub": "c4444444-4444-4444-8444-444444444444", "role": "authenticated"}', true);
SELECT results_eq('SELECT COUNT(*)::integer FROM api.patient_directory', ARRAY[0]);

-- 4. Paciente de organización suspendida no puede enviar su respuesta de check-in
SELECT set_config('request.jwt.claims', '{"sub": "d5555555-5555-4555-8555-555555555555", "role": "authenticated"}', true);
SELECT throws_ok(
  $$ SELECT api.submit_check_in('c5555555-5555-4555-8555-555555555555'::uuid, 4::smallint, 4::smallint) $$,
  'La organización del paciente no está activa'
);

-- 5. Platform admin reactiva la organización suspendida
SELECT set_config('request.jwt.claims', '{"sub": "a0000000-0000-4000-8000-000000000000", "role": "authenticated"}', true);
SELECT lives_ok(
  $$ SELECT api.set_organization_status('33333333-3333-4333-8333-333333333333'::uuid, 'active') $$
);

-- 6. Tras reactivar, el paciente sí puede responder
SELECT set_config('request.jwt.claims', '{"sub": "d5555555-5555-4555-8555-555555555555", "role": "authenticated"}', true);
SELECT lives_ok(
  $$ SELECT api.submit_check_in('c5555555-5555-4555-8555-555555555555'::uuid, 4::smallint, 4::smallint) $$
);

SELECT * FROM finish();
ROLLBACK;
