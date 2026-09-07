-- pgTAP Test: 071_check_in_alert_rules.test.sql
BEGIN;
SELECT plan(12);

-- El seed conserva un check-in pendiente para el recorrido demo. Este test
-- necesita crear cinco asignaciones sucesivas para el mismo paciente, por lo
-- que neutraliza ese fixture dentro de su transacción aislada.
UPDATE app.check_in_assignments
SET status = 'cancelled'
WHERE organization_id = '11111111-1111-4111-8111-111111111111'
  AND patient_id = 'f1111111-1111-4111-8111-111111111111'
  AND status = 'pending';

-- Escenario A: valores esperados, sin alertas.
INSERT INTO app.check_in_assignments (id, organization_id, patient_id, created_by, status, due_date)
VALUES ('c9000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'f1111111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222', 'pending', NOW() + INTERVAL '1 day');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "d1111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);
SELECT lives_ok($$ SELECT api.submit_check_in('c9000000-0000-4000-8000-000000000001'::uuid, 4::smallint, 4::smallint, false) $$, 'Una respuesta normal se procesa');

RESET ROLE;
SELECT results_eq(
  $$ SELECT COUNT(*)::integer FROM app.alerts WHERE response_id IN (SELECT id FROM app.check_in_responses WHERE assignment_id = 'c9000000-0000-4000-8000-000000000001') $$,
  ARRAY[0],
  'Una respuesta normal no crea alertas'
);

-- Escenario B: HELP_REQUESTED.
INSERT INTO app.check_in_assignments (id, organization_id, patient_id, created_by, status, due_date)
VALUES ('c9000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'f1111111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222', 'pending', NOW() + INTERVAL '1 day');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "d1111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);
SELECT lives_ok($$ SELECT api.submit_check_in('c9000000-0000-4000-8000-000000000002'::uuid, 4::smallint, 4::smallint, true) $$, 'Una solicitud de ayuda se procesa');

RESET ROLE;
SELECT results_eq(
  $$
    SELECT concat_ws('|', a.rule_code, a.priority, a.recommended_action, a.organization_id::text, a.patient_id::text)
    FROM app.alerts a
    JOIN app.check_in_responses r ON r.id = a.response_id
    WHERE r.assignment_id = 'c9000000-0000-4000-8000-000000000002'
  $$,
  ARRAY['HELP_REQUESTED|high|Contactar al paciente de manera prioritaria.|11111111-1111-4111-8111-111111111111|f1111111-1111-4111-8111-111111111111'],
  'HELP_REQUESTED conserva regla, prioridad, acción y relaciones multi-tenant'
);

-- Escenario C: LOW_ENERGY.
INSERT INTO app.check_in_assignments (id, organization_id, patient_id, created_by, status, due_date)
VALUES ('c9000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'f1111111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222', 'pending', NOW() + INTERVAL '1 day');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "d1111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);
SELECT lives_ok($$ SELECT api.submit_check_in('c9000000-0000-4000-8000-000000000003'::uuid, 1::smallint, 4::smallint, false) $$, 'Una respuesta con energía baja se procesa');

RESET ROLE;
SELECT results_eq(
  $$
    SELECT concat_ws('|', a.rule_code, a.priority, a.recommended_action, a.organization_id::text, a.patient_id::text)
    FROM app.alerts a
    JOIN app.check_in_responses r ON r.id = a.response_id
    WHERE r.assignment_id = 'c9000000-0000-4000-8000-000000000003'
  $$,
  ARRAY['LOW_ENERGY|high|Revisar el estado general y contactar al paciente.|11111111-1111-4111-8111-111111111111|f1111111-1111-4111-8111-111111111111'],
  'LOW_ENERGY conserva regla, prioridad, acción y relaciones multi-tenant'
);

-- Escenario D: LOW_ADHERENCE.
INSERT INTO app.check_in_assignments (id, organization_id, patient_id, created_by, status, due_date)
VALUES ('c9000000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'f1111111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222', 'pending', NOW() + INTERVAL '1 day');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "d1111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);
SELECT lives_ok($$ SELECT api.submit_check_in('c9000000-0000-4000-8000-000000000004'::uuid, 4::smallint, 1::smallint, false) $$, 'Una respuesta con adherencia baja se procesa');

RESET ROLE;
SELECT results_eq(
  $$
    SELECT concat_ws('|', a.rule_code, a.priority, a.recommended_action, a.organization_id::text, a.patient_id::text)
    FROM app.alerts a
    JOIN app.check_in_responses r ON r.id = a.response_id
    WHERE r.assignment_id = 'c9000000-0000-4000-8000-000000000004'
  $$,
  ARRAY['LOW_ADHERENCE|medium|Revisar las dificultades de adherencia con el paciente.|11111111-1111-4111-8111-111111111111|f1111111-1111-4111-8111-111111111111'],
  'LOW_ADHERENCE conserva regla, prioridad, acción y relaciones multi-tenant'
);

-- Escenario E: las tres reglas simultáneas, sin duplicados.
INSERT INTO app.check_in_assignments (id, organization_id, patient_id, created_by, status, due_date)
VALUES ('c9000000-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', 'f1111111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222', 'pending', NOW() + INTERVAL '1 day');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "d1111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);
SELECT lives_ok($$ SELECT api.submit_check_in('c9000000-0000-4000-8000-000000000005'::uuid, 1::smallint, 1::smallint, true) $$, 'Una respuesta crítica se procesa atómicamente');

RESET ROLE;
SELECT results_eq(
  $$
    SELECT concat_ws('|', a.rule_code, a.priority, a.recommended_action, a.organization_id::text, a.patient_id::text)
    FROM app.alerts a
    JOIN app.check_in_responses r ON r.id = a.response_id
    WHERE r.assignment_id = 'c9000000-0000-4000-8000-000000000005'
    ORDER BY a.rule_code
  $$,
  ARRAY[
    'HELP_REQUESTED|high|Contactar al paciente de manera prioritaria.|11111111-1111-4111-8111-111111111111|f1111111-1111-4111-8111-111111111111',
    'LOW_ADHERENCE|medium|Revisar las dificultades de adherencia con el paciente.|11111111-1111-4111-8111-111111111111|f1111111-1111-4111-8111-111111111111',
    'LOW_ENERGY|high|Revisar el estado general y contactar al paciente.|11111111-1111-4111-8111-111111111111|f1111111-1111-4111-8111-111111111111'
  ],
  'Las tres alertas contienen códigos, prioridades, acciones y relaciones correctas'
);

SELECT throws_ok(
  $$
    INSERT INTO app.alerts (organization_id, patient_id, response_id, rule_code, priority, recommended_action, status)
    SELECT organization_id, patient_id, id, 'LOW_ENERGY', 'high', 'Duplicada', 'unresolved'
    FROM app.check_in_responses
    WHERE assignment_id = 'c9000000-0000-4000-8000-000000000005'
  $$,
  '23505',
  NULL,
  'La restricción única rechaza una regla duplicada para la misma respuesta'
);

SELECT results_eq(
  $$
    SELECT COUNT(*)::integer
    FROM app.alerts a
    JOIN app.check_in_responses r ON r.id = a.response_id
    WHERE r.assignment_id = 'c9000000-0000-4000-8000-000000000005'
  $$,
  ARRAY[3],
  'El intento duplicado no modifica las tres alertas existentes'
);

SELECT * FROM finish();
ROLLBACK;
