-- pgTAP Test: 030_tenant_isolation.test.sql
BEGIN;
SELECT plan(3);

-- Simular autenticación como Owner de Centro NutriVida (c1111111-1111-4111-8111-111111111111)
SELECT set_config('request.jwt.claims', '{"sub": "c1111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);

-- 1. Ve únicamente su organización (Centro NutriVida)
SELECT results_eq('SELECT COUNT(*)::integer FROM app.organizations', ARRAY[1]);

-- 2. Ve únicamente su paciente (Esteban NutriVida)
SELECT results_eq('SELECT COUNT(*)::integer FROM app.patients', ARRAY[1]);

-- 3. NO ve pacientes de Clínica Bienestar
SELECT results_eq('SELECT COUNT(*)::integer FROM app.patients WHERE organization_id = ''11111111-1111-4111-8111-111111111111''', ARRAY[0]);

SELECT * FROM finish();
ROLLBACK;
