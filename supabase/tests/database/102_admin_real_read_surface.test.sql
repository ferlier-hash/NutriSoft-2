-- pgTAP Test: 102_admin_real_read_surface.test.sql
BEGIN;
SELECT plan(4);

SET LOCAL ROLE authenticated;

SELECT set_config('request.jwt.claims', '{"sub": "a0000000-0000-4000-8000-000000000000", "role": "authenticated"}', true);
SELECT results_eq(
  'SELECT COUNT(*)::integer FROM api.admin_organizations',
  ARRAY[3],
  'Platform Admin puede consultar el directorio administrativo real'
);

SELECT is(
  api.get_admin_metrics()->>'patients_total',
  '5',
  'Platform Admin recibe pacientes únicamente como conteo agregado'
);

SELECT set_config('request.jwt.claims', '{"sub": "b1111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);
SELECT results_eq(
  'SELECT COUNT(*)::integer FROM api.admin_organizations',
  ARRAY[0],
  'Un owner no puede consultar el directorio global de consultorios'
);

SELECT throws_ok(
  $$ SELECT api.get_admin_metrics() $$,
  'Acceso no autorizado: requiere rol platform_admin',
  'Un owner no puede consultar métricas globales'
);

SELECT * FROM finish();
ROLLBACK;
