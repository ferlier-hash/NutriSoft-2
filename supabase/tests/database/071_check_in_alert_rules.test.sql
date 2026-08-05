-- pgTAP Test: 071_check_in_alert_rules.test.sql
BEGIN;
SELECT plan(13);

-- Escenario A: 0 Alertas (energía=4, adherencia=4, help_requested=false)
RESET ROLE;
INSERT INTO app.check_in_assignments (id, organization_id, patient_id, created_by, status, due_date)
VALUES ('c9000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'f1111111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222', 'pending', NOW() + INTERVAL '1 day');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "d1111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);
SELECT lives_ok($$ SELECT api.submit_check_in('c9000000-0000-4000-8000-000000000001'::uuid, 4::smallint, 4::smallint, false) $$);

SELECT set_config('request.jwt.claims', '{"sub": "b2222222-2222-4222-8222-222222222222", "role": "authenticated"}', true);
SELECT results_eq(
  'SELECT COUNT(*)::integer FROM app.alerts WHERE response_id IN (SELECT id FROM app.check_in_responses WHERE assignment_id = ''c9000000-0000-4000-8000-000000000001'')',
  ARRAY[0]
);

-- Escenario B: Sólo HELP_REQUESTED
RESET ROLE;
INSERT INTO app.check_in_assignments (id, organization_id, patient_id, created_by, status, due_date)
VALUES ('c9000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'f1111111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222', 'pending', NOW() + INTERVAL '1 day');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "d1111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);
SELECT lives_ok($$ SELECT api.submit_check_in('c9000000-0000-4000-8000-000000000002'::uuid, 4::smallint, 4::smallint, true) $$);

SELECT set_config('request.jwt.claims', '{"sub": "b2222222-2222-4222-8222-222222222222", "role": "authenticated"}', true);
SELECT results_eq(
  'SELECT rule_code FROM app.alerts WHERE response_id IN (SELECT id FROM app.check_in_responses WHERE assignment_id = ''c9000000-0000-4000-8000-000000000002'')',
  ARRAY['HELP_REQUESTED']
);
SELECT results_eq(
  'SELECT priority FROM app.alerts WHERE response_id IN (SELECT id FROM app.check_in_responses WHERE assignment_id = ''c9000000-0000-4000-8000-000000000002'')',
  ARRAY['high']
);

-- Escenario C: Sólo LOW_ENERGY
RESET ROLE;
INSERT INTO app.check_in_assignments (id, organization_id, patient_id, created_by, status, due_date)
VALUES ('c9000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'f1111111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222', 'pending', NOW() + INTERVAL '1 day');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "d1111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);
SELECT lives_ok($$ SELECT api.submit_check_in('c9000000-0000-4000-8000-000000000003'::uuid, 1::smallint, 4::smallint, false) $$);

SELECT set_config('request.jwt.claims', '{"sub": "b2222222-2222-4222-8222-222222222222", "role": "authenticated"}', true);
SELECT results_eq(
  'SELECT rule_code FROM app.alerts WHERE response_id IN (SELECT id FROM app.check_in_responses WHERE assignment_id = ''c9000000-0000-4000-8000-000000000003'')',
  ARRAY['LOW_ENERGY']
);
SELECT results_eq(
  'SELECT priority FROM app.alerts WHERE response_id IN (SELECT id FROM app.check_in_responses WHERE assignment_id = ''c9000000-0000-4000-8000-000000000003'')',
  ARRAY['high']
);

-- Escenario D: Sólo LOW_ADHERENCE
RESET ROLE;
INSERT INTO app.check_in_assignments (id, organization_id, patient_id, created_by, status, due_date)
VALUES ('c9000000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'f1111111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222', 'pending', NOW() + INTERVAL '1 day');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "d1111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);
SELECT lives_ok($$ SELECT api.submit_check_in('c9000000-0000-4000-8000-000000000004'::uuid, 4::smallint, 1::smallint, false) $$);

SELECT set_config('request.jwt.claims', '{"sub": "b2222222-2222-4222-8222-222222222222", "role": "authenticated"}', true);
SELECT results_eq(
  'SELECT rule_code FROM app.alerts WHERE response_id IN (SELECT id FROM app.check_in_responses WHERE assignment_id = ''c9000000-0000-4000-8000-000000000004'')',
  ARRAY['LOW_ADHERENCE']
);
SELECT results_eq(
  'SELECT priority FROM app.alerts WHERE response_id IN (SELECT id FROM app.check_in_responses WHERE assignment_id = ''c9000000-0000-4000-8000-000000000004'')',
  ARRAY['medium']
);

-- Escenario E: Tres alertas simultáneas
RESET ROLE;
INSERT INTO app.check_in_assignments (id, organization_id, patient_id, created_by, status, due_date)
VALUES ('c9000000-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', 'f1111111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222', 'pending', NOW() + INTERVAL '1 day');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "d1111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);
SELECT lives_ok($$ SELECT api.submit_check_in('c9000000-0000-4000-8000-000000000005'::uuid, 1::smallint, 1::smallint, true) $$);

SELECT set_config('request.jwt.claims', '{"sub": "b2222222-2222-4222-8222-222222222222", "role": "authenticated"}', true);
SELECT results_eq(
  'SELECT rule_code FROM app.alerts WHERE response_id IN (SELECT id FROM app.check_in_responses WHERE assignment_id = ''c9000000-0000-4000-8000-000000000005'') ORDER BY rule_code',
  ARRAY['HELP_REQUESTED', 'LOW_ADHERENCE', 'LOW_ENERGY']
);

SELECT * FROM finish();
ROLLBACK;
