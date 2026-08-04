-- pgTAP Test: 050_patient_access.test.sql
BEGIN;
SELECT plan(4);

-- Autenticar como María González (d1111111-1111-4111-8111-111111111111)
SELECT set_config('request.jwt.claims', '{"sub": "d1111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);

-- María ve únicamente su ficha clínica en el portal
SELECT results_eq('SELECT COUNT(*)::integer FROM api.patient_portal_home', ARRAY[1]);

-- María ve sus check-ins pendientes
SELECT results_eq('SELECT COUNT(*)::integer FROM api.check_in_assignments', ARRAY[1]);

-- María NO ve el directorio completo de pacientes
SELECT results_eq('SELECT COUNT(*)::integer FROM app.patients', ARRAY[1]);

-- María NO ve la bandeja de alertas internas
SELECT results_eq('SELECT COUNT(*)::integer FROM app.alerts', ARRAY[0]);

SELECT * FROM finish();
ROLLBACK;
