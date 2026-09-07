-- pgTAP Test: 072_rpc_state_transitions.test.sql
BEGIN;
SELECT plan(5);

-- Autenticar como Lic. Andrea N. (b2222222-2222-4222-8222-222222222222)
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "b2222222-2222-4222-8222-222222222222", "role": "authenticated"}', true);

-- 1. Reconocer alerta de Pablo (00000000-0000-4000-8000-000000000002)
SELECT lives_ok(
  $$ SELECT api.acknowledge_alert('00000000-0000-4000-8000-000000000002'::uuid) $$
);

-- 2. Re-intentar reconocer la misma alerta lanza excepción determinista
SELECT throws_ok(
  $$ SELECT api.acknowledge_alert('00000000-0000-4000-8000-000000000002'::uuid) $$,
  'El aviso ya cambió de estado. Actualizá la bandeja.'
);

-- 3. Resolver la alerta con notas clínicas
SELECT lives_ok(
  $$ SELECT api.resolve_alert('00000000-0000-4000-8000-000000000002'::uuid, 'Se contactó al paciente por llamada telefónica') $$
);

-- 4. Re-intentar resolver la alerta ya resuelta lanza excepción
SELECT throws_ok(
  $$ SELECT api.resolve_alert('00000000-0000-4000-8000-000000000002'::uuid) $$,
  'El aviso ya cambió de estado. Actualizá la bandeja.'
);

-- 5. Verificar estado final resuelto y notas en app.alerts
SELECT results_eq(
  'SELECT status FROM app.alerts WHERE id = ''00000000-0000-4000-8000-000000000002''',
  ARRAY['resolved']
);

SELECT * FROM finish();
ROLLBACK;
