-- pgTAP Test: 060_assistant_permissions.test.sql
BEGIN;
SELECT plan(4);

-- Autenticar como Carlos Asistente (b4444444-4444-4444-8444-444444444444)
SELECT set_config('request.jwt.claims', '{"sub": "b4444444-4444-4444-8444-444444444444", "role": "authenticated"}', true);

-- 1. Asistente PUEDE ver el directorio administrativo de pacientes
SELECT results_eq('SELECT COUNT(*)::integer FROM api.patient_directory', ARRAY[3]);

-- 2. Asistente PUEDE ver los estados de asignación de check-ins
SELECT results_eq('SELECT COUNT(*)::integer FROM api.check_in_assignments', ARRAY[2]);

-- 3. Asistente NO PUEDE leer respuestas clínicas (Check-in responses)
SELECT results_eq('SELECT COUNT(*)::integer FROM app.check_in_responses', ARRAY[0]);

-- 4. Asistente NO PUEDE leer alertas clínicas
SELECT results_eq('SELECT COUNT(*)::integer FROM app.alerts', ARRAY[0]);

SELECT * FROM finish();
ROLLBACK;
