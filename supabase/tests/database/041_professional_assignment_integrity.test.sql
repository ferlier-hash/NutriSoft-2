-- pgTAP Test: 041_professional_assignment_integrity.test.sql
BEGIN;
SELECT plan(5);

-- 1. Intentar asignar un assistant como profesional clínico (b4444444-4444-4444-8444-444444444444 es assistant en Bienestar)
SELECT throws_ok(
  $$ INSERT INTO app.patient_assignments (organization_id, patient_id, nutritionist_user_id, is_primary, status)
     VALUES ('11111111-1111-4111-8111-111111111111', 'f1111111-1111-4111-8111-111111111111', 'b4444444-4444-4444-8444-444444444444', false, 'active') $$,
  'El profesional asignado debe tener un rol activo de nutricionista u owner'
);

-- 2. Intentar asignar un usuario de otra organización
SELECT throws_ok(
  $$ INSERT INTO app.patient_assignments (organization_id, patient_id, nutritionist_user_id, is_primary, status)
     VALUES ('11111111-1111-4111-8111-111111111111', 'f1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111', false, 'active') $$,
  'foreign key constraint "fk_patient_assignments_member_composite"'
);

-- 3. Intentar desactivar a un nutricionista con asignaciones clínicas activas (Andrea b2222222)
SELECT throws_ok(
  $$ UPDATE app.organization_members SET status = 'inactive' WHERE user_id = 'b2222222-2222-4222-8222-222222222222' $$,
  'No se puede desactivar o cambiar el rol de un miembro con asignaciones clínicas activas'
);

-- 4. Intentar cambiar el rol de un nutricionista activo a assistant
SELECT throws_ok(
  $$ UPDATE app.organization_members SET role = 'assistant' WHERE user_id = 'b2222222-2222-4222-8222-222222222222' $$,
  'No se puede desactivar o cambiar el rol de un miembro con asignaciones clínicas activas'
);

-- 5. Asignación válida de Owner (Elena b1111111) como nutricionista secundario
SELECT lives_ok(
  $$ INSERT INTO app.patient_assignments (organization_id, patient_id, nutritionist_user_id, is_primary, status)
     VALUES ('11111111-1111-4111-8111-111111111111', 'f1111111-1111-4111-8111-111111111111', 'b1111111-1111-4111-8111-111111111111', false, 'active') $$
);

SELECT * FROM finish();
ROLLBACK;
