-- pgTAP Test: 031_cross_tenant_integrity.test.sql
BEGIN;
SELECT plan(5);

-- Autenticar como Lic. Andrea N. (b2222222-2222-4222-8222-222222222222)
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "b2222222-2222-4222-8222-222222222222", "role": "authenticated"}', true);

-- 1. Rechazar recomendación vinculada a respuesta de OTRO paciente (María con respuesta de Pablo)
SELECT throws_ok(
  $$ SELECT api.create_recommendation('11111111-1111-4111-8111-111111111111'::uuid, 'f1111111-1111-4111-8111-111111111111'::uuid, 'Texto de prueba', '00000000-0000-4000-8000-000000000001'::uuid) $$,
  'La respuesta de check-in especificada no existe o no pertenece al paciente u organización'
);

-- 2. Rechazar recomendación con response_id inexistente
SELECT throws_ok(
  $$ SELECT api.create_recommendation('11111111-1111-4111-8111-111111111111'::uuid, 'f1111111-1111-4111-8111-111111111111'::uuid, 'Texto de prueba', '99999999-9999-4999-8999-999999999999'::uuid) $$,
  'La respuesta de check-in especificada no existe o no pertenece al paciente u organización'
);

-- 3. Rechazar recomendación con texto vacío
SELECT throws_ok(
  $$ SELECT api.create_recommendation('11111111-1111-4111-8111-111111111111'::uuid, 'f1111111-1111-4111-8111-111111111111'::uuid, '   ') $$,
  'El texto de la recomendación no puede estar vacío'
);

-- 4. Rechazar recomendación para paciente de otra organización
SELECT throws_ok(
  $$ SELECT api.create_recommendation('11111111-1111-4111-8111-111111111111'::uuid, 'f4444444-4444-4444-8444-444444444444'::uuid, 'Texto de prueba') $$,
  'El paciente no pertenece a la organización especificada'
);

-- 5. Permitir recomendación válida para Pablo asociada a su propia respuesta
SELECT lives_ok(
  $$ SELECT api.create_recommendation('11111111-1111-4111-8111-111111111111'::uuid, 'f2222222-2222-4222-8222-222222222222'::uuid, 'Recomendación válida', '00000000-0000-4000-8000-000000000001'::uuid) $$
);

SELECT * FROM finish();
ROLLBACK;
