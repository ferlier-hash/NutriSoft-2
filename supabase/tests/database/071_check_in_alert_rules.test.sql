-- pgTAP Test: 071_check_in_alert_rules.test.sql
BEGIN;
SELECT plan(6);

-- 1. Crear asignación de prueba para María (d1111111)
RESET ROLE;
INSERT INTO app.check_in_assignments (id, organization_id, patient_id, created_by, status, due_date)
VALUES ('c9999999-9999-4999-8999-999999999999', '11111111-1111-4111-8111-111111111111', 'f1111111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222', 'pending', NOW() + INTERVAL '1 day');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "d1111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);

-- 2. Enviar respuesta que dispara las 3 alertas simultáneas (energía=1, adherencia=1, help_requested=true)
SELECT lives_ok(
  $$ SELECT api.submit_check_in('c9999999-9999-4999-8999-999999999999'::uuid, 1::smallint, 1::smallint, true, 'Solicitud urgente') $$
);

-- 3. Autenticar como Lic. Andrea N. para verificar las 3 alertas generadas
SELECT set_config('request.jwt.claims', '{"sub": "b2222222-2222-4222-8222-222222222222", "role": "authenticated"}', true);

SELECT results_eq(
  'SELECT rule_code FROM app.alerts WHERE patient_id = ''f1111111-1111-4111-8111-111111111111'' ORDER BY rule_code',
  ARRAY['HELP_REQUESTED', 'LOW_ADHERENCE', 'LOW_ENERGY']
);

SELECT results_eq(
  'SELECT priority FROM app.alerts WHERE patient_id = ''f1111111-1111-4111-8111-111111111111'' AND rule_code = ''HELP_REQUESTED''',
  ARRAY['high']
);

SELECT results_eq(
  'SELECT priority FROM app.alerts WHERE patient_id = ''f1111111-1111-4111-8111-111111111111'' AND rule_code = ''LOW_ADHERENCE''',
  ARRAY['medium']
);

SELECT results_eq(
  'SELECT priority FROM app.alerts WHERE patient_id = ''f1111111-1111-4111-8111-111111111111'' AND rule_code = ''LOW_ENERGY''',
  ARRAY['high']
);

SELECT * FROM finish();
ROLLBACK;
