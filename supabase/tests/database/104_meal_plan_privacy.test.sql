-- pgTAP Test: aislamiento clínico, privilegio mínimo y vínculo permanente.
BEGIN;
SELECT plan(15);

SELECT has_table('app', 'meal_plans', 'Existe la tabla interna de planes');
SELECT has_table('app', 'meal_plan_versions', 'Existe la tabla interna de versiones');
SELECT has_table('app', 'meal_plan_assignments', 'Existe la tabla interna de asignaciones');
SELECT has_table('app', 'meal_plan_meal_activity', 'Existe la tabla interna de actividad');

SELECT ok(
  NOT has_table_privilege('authenticated', 'app.meal_plans', 'INSERT, UPDATE, DELETE'),
  'authenticated no recibe DML directo sobre planes'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'app.meal_plan_meal_activity', 'INSERT, UPDATE, DELETE'),
  'authenticated no recibe DML directo sobre seguimiento clínico'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "b2222222-2222-4222-8222-222222222222", "role": "authenticated"}', true);

CREATE TEMP TABLE meal_plan_privacy_context AS
WITH content AS (
  SELECT jsonb_build_object(
    'days', jsonb_agg(
      jsonb_build_object(
        'id', gen_random_uuid(),
        'title', 'Día ' || day_number,
        'meals', jsonb_build_array(
          jsonb_build_object(
            'id', gen_random_uuid(),
            'type', 'Cena',
            'items', jsonb_build_array(
              jsonb_build_object('id', gen_random_uuid(), 'description', 'Preparación privada')
            )
          )
        )
      )
    )
  ) AS value
  FROM generate_series(1, 7) AS day_number
), plan AS (
  SELECT api.create_meal_plan(
    '11111111-1111-4111-8111-111111111111',
    'Plan clínico privado',
    content.value
  ) AS id
  FROM content
)
SELECT id AS plan_id FROM plan;

SELECT api.assign_meal_plan(
  (SELECT plan_id FROM meal_plan_privacy_context),
  'f1111111-1111-4111-8111-111111111111',
  'primary'
);
SELECT api.publish_meal_plan((SELECT plan_id FROM meal_plan_privacy_context));

SELECT set_config('request.jwt.claims', '{"sub": "a0000000-0000-4000-8000-000000000000", "role": "authenticated"}', true);
SELECT results_eq(
  'SELECT count(*)::integer FROM api.professional_meal_plans',
  ARRAY[0],
  'Platform Admin no ve planes clínicos'
);
SELECT results_eq(
  'SELECT count(*)::integer FROM api.meal_plan_meal_activity',
  ARRAY[0],
  'Platform Admin no ve adherencia ni comentarios'
);

SELECT set_config('request.jwt.claims', '{"sub": "b1111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);
SELECT results_eq(
  'SELECT count(*)::integer FROM api.professional_meal_plans',
  ARRAY[0],
  'El responsable no clínico no ve planes'
);

SELECT set_config('request.jwt.claims', '{"sub": "b3333333-3333-4333-8333-333333333333", "role": "authenticated"}', true);
SELECT results_eq(
  'SELECT count(*)::integer FROM api.professional_meal_plans',
  ARRAY[0],
  'Otra nutricionista del mismo consultorio no ve planes ajenos'
);

SELECT set_config('request.jwt.claims', '{"sub": "d2222222-2222-4222-8222-222222222222", "role": "authenticated"}', true);
SELECT results_eq(
  'SELECT count(*)::integer FROM api.patient_current_meal_plans',
  ARRAY[0],
  'Otro paciente del mismo consultorio no ve el plan de María'
);

SELECT set_config('request.jwt.claims', '{"sub": "c1111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);
SELECT results_eq(
  'SELECT count(*)::integer FROM api.professional_meal_plans',
  ARRAY[0],
  'Un miembro de otro consultorio no ve planes fuera de su tenant'
);

SELECT set_config('request.jwt.claims', '{"sub": "d4444444-4444-4444-8444-444444444444", "role": "authenticated"}', true);
SELECT results_eq(
  'SELECT count(*)::integer FROM api.patient_current_meal_plans',
  ARRAY[0],
  'Un paciente de otro consultorio recibe cero filas'
);

RESET ROLE;
UPDATE app.patient_assignments
SET nutritionist_user_id = 'b3333333-3333-4333-8333-333333333333'
WHERE patient_id = 'f1111111-1111-4111-8111-111111111111'
  AND status = 'active';
SET LOCAL ROLE authenticated;

SELECT set_config('request.jwt.claims', '{"sub": "b2222222-2222-4222-8222-222222222222", "role": "authenticated"}', true);
SELECT results_eq(
  'SELECT count(*)::integer FROM api.professional_meal_plans',
  ARRAY[0],
  'La profesional anterior pierde acceso inmediatamente al ser reasignado el paciente'
);

SELECT set_config('request.jwt.claims', '{"sub": "b3333333-3333-4333-8333-333333333333", "role": "authenticated"}', true);
SELECT results_eq(
  'SELECT count(*)::integer FROM api.professional_meal_plans',
  ARRAY[0],
  'La nueva profesional no hereda el plan sin una transferencia explícita'
);

SELECT * FROM finish();
ROLLBACK;
