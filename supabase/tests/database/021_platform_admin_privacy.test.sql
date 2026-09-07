-- pgTAP Test: 021_platform_admin_privacy.test.sql
BEGIN;
SELECT plan(6);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "a0000000-0000-4000-8000-000000000000", "role": "authenticated"}', true);

-- 1. Platform admin solo ve su propio perfil en app.profiles (1 fila)
SELECT results_eq('SELECT COUNT(*)::integer FROM app.profiles', ARRAY[1]);
SELECT results_eq('SELECT email FROM app.profiles', ARRAY['admin@nutrisoft.test']);

-- 2. Platform admin no ve perfiles ajenos (0 filas de otros)
SELECT results_eq('SELECT COUNT(*)::integer FROM app.profiles WHERE id != ''a0000000-0000-4000-8000-000000000000''', ARRAY[0]);

-- 3. Platform admin no puede ver la lista de pacientes
SELECT results_eq('SELECT COUNT(*)::integer FROM app.patients', ARRAY[0]);

-- 4. Platform admin no puede ver el registro de auditoría de las organizaciones
SELECT results_eq('SELECT COUNT(*)::integer FROM app.audit_logs', ARRAY[0]);

-- 5. Platform admin sí puede consultar métricas agregadas
SELECT is(api.get_admin_metrics()->>'organizations_total', '3');

SELECT * FROM finish();
ROLLBACK;
