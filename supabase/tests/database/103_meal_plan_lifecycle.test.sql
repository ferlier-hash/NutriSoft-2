-- pgTAP Test: ciclo completo del plan individual y publicación explícita.
BEGIN;
SELECT plan(19);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "b2222222-2222-4222-8222-222222222222", "role": "authenticated"}', true);

CREATE TEMP TABLE meal_plan_test_context AS
WITH content AS (
  SELECT jsonb_build_object(
    'days', jsonb_agg(
      jsonb_build_object(
        'id', gen_random_uuid(),
        'title', 'Día ' || day_number,
        'meals', jsonb_build_array(
          jsonb_build_object(
            'id', gen_random_uuid(),
            'type', 'Almuerzo',
            'alternatives', '',
            'items', jsonb_build_array(
              jsonb_build_object(
                'id', gen_random_uuid(),
                'description', 'Preparación del día ' || day_number,
                'quantity', '1 porción'
              )
            )
          )
        )
      ) ORDER BY day_number
    )
  ) AS value
  FROM generate_series(1, 7) AS day_number
)
SELECT
  api.create_meal_plan(
    '11111111-1111-4111-8111-111111111111',
    'Plan individual de María',
    content.value
  ) AS plan_id,
  content.value AS original_content,
  (content.value->'days'->0->>'id')::uuid AS day_id,
  (content.value->'days'->0->'meals'->0->>'id')::uuid AS meal_id
FROM content;

SELECT results_eq(
  'SELECT count(*)::integer FROM api.professional_meal_plans WHERE id = (SELECT plan_id FROM meal_plan_test_context)',
  ARRAY[1],
  'La autora ve el borrador recién creado'
);

SELECT is(
  (SELECT status FROM api.professional_meal_plans WHERE id = (SELECT plan_id FROM meal_plan_test_context)),
  'draft',
  'El plan comienza como borrador'
);

ALTER TABLE meal_plan_test_context ADD COLUMN assignment_id uuid;
UPDATE meal_plan_test_context
SET assignment_id = api.assign_meal_plan(
  plan_id,
  'f1111111-1111-4111-8111-111111111111',
  'primary'
);

SELECT is(
  (SELECT assignment_status FROM api.professional_meal_plans WHERE id = (SELECT plan_id FROM meal_plan_test_context)),
  'pending',
  'Asignar liga el plan al paciente sin publicarlo todavía'
);

SELECT results_eq(
  'SELECT count(*)::integer FROM api.patient_current_meal_plans WHERE id = (SELECT plan_id FROM meal_plan_test_context)',
  ARRAY[0],
  'El borrador asignado aún no está expuesto como plan vigente'
);

SELECT lives_ok(
  $$ SELECT api.publish_meal_plan((SELECT plan_id FROM meal_plan_test_context)) $$,
  'La autora asignada puede publicar el plan explícitamente'
);

SELECT is(
  (SELECT assignment_status FROM api.professional_meal_plans WHERE id = (SELECT plan_id FROM meal_plan_test_context)),
  'active',
  'La publicación activa la asignación'
);

SELECT set_config('request.jwt.claims', '{"sub": "d1111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);

SELECT results_eq(
  'SELECT count(*)::integer FROM api.patient_current_meal_plans WHERE id = (SELECT plan_id FROM meal_plan_test_context)',
  ARRAY[1],
  'La paciente titular ve el plan publicado'
);

ALTER TABLE meal_plan_test_context ADD COLUMN activity_id uuid;
UPDATE meal_plan_test_context
SET activity_id = api.set_meal_plan_meal_activity(plan_id, day_id, meal_id, 'completed', 'Me resultó fácil de preparar');

SELECT is(
  (SELECT patient_comment FROM api.meal_plan_meal_activity WHERE id = (SELECT activity_id FROM meal_plan_test_context)),
  'Me resultó fácil de preparar',
  'La paciente puede registrar cumplimiento y comentario en una comida vigente'
);

SELECT set_config('request.jwt.claims', '{"sub": "b2222222-2222-4222-8222-222222222222", "role": "authenticated"}', true);

SELECT is(
  (SELECT pending_comment_count FROM api.professional_meal_plans WHERE id = (SELECT plan_id FROM meal_plan_test_context)),
  1,
  'El comentario nuevo aparece pendiente para la profesional asignada'
);

SELECT lives_ok(
  $$ SELECT api.review_meal_plan_comment((SELECT activity_id FROM meal_plan_test_context)) $$,
  'La profesional asignada puede marcar el comentario como revisado'
);

SELECT is(
  (SELECT pending_comment_count FROM api.professional_meal_plans WHERE id = (SELECT plan_id FROM meal_plan_test_context)),
  0,
  'El indicador pendiente se limpia al revisar el comentario'
);

SELECT lives_ok(
  $$
    SELECT api.update_meal_plan_draft(
      (SELECT plan_id FROM meal_plan_test_context),
      'Plan de María actualizado',
      (SELECT original_content FROM meal_plan_test_context)
    )
  $$,
  'Editar un plan publicado crea una nueva versión borrador'
);

SELECT set_config('request.jwt.claims', '{"sub": "d1111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);
SELECT is(
  (SELECT title FROM api.patient_current_meal_plans WHERE id = (SELECT plan_id FROM meal_plan_test_context)),
  'Plan individual de María',
  'La paciente conserva la versión anterior mientras los cambios son borrador'
);

SELECT set_config('request.jwt.claims', '{"sub": "b2222222-2222-4222-8222-222222222222", "role": "authenticated"}', true);
SELECT lives_ok(
  $$ SELECT api.publish_meal_plan((SELECT plan_id FROM meal_plan_test_context)) $$,
  'Publicar cambios sustituye la versión visible de forma explícita'
);

SELECT set_config('request.jwt.claims', '{"sub": "d1111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);
SELECT is(
  (SELECT title FROM api.patient_current_meal_plans WHERE id = (SELECT plan_id FROM meal_plan_test_context)),
  'Plan de María actualizado',
  'La paciente recibe la nueva versión después de publicar cambios'
);

SELECT set_config('request.jwt.claims', '{"sub": "b2222222-2222-4222-8222-222222222222", "role": "authenticated"}', true);
SELECT lives_ok(
  $$ SELECT api.retire_meal_plan((SELECT plan_id FROM meal_plan_test_context)) $$,
  'La profesional asignada puede retirar el plan'
);

ALTER TABLE meal_plan_test_context ADD COLUMN duplicate_id uuid;
UPDATE meal_plan_test_context
SET duplicate_id = api.duplicate_meal_plan(plan_id, 'Plan reutilizado para otra persona');

SELECT results_eq(
  'SELECT count(*)::integer FROM api.professional_meal_plans WHERE id = (SELECT duplicate_id FROM meal_plan_test_context) AND patient_id IS NULL AND status = ''draft''',
  ARRAY[1],
  'Duplicar crea un borrador nuevo y sin paciente'
);

SELECT isnt(
  (SELECT editable_content->'days'->0->>'id' FROM api.professional_meal_plans WHERE id = (SELECT plan_id FROM meal_plan_test_context)),
  (SELECT editable_content->'days'->0->>'id' FROM api.professional_meal_plans WHERE id = (SELECT duplicate_id FROM meal_plan_test_context)),
  'La copia regenera identificadores y no mezcla progreso clínico'
);

SELECT set_config('request.jwt.claims', '{"sub": "d1111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);
SELECT results_eq(
  'SELECT count(*)::integer FROM api.patient_current_meal_plans WHERE id = (SELECT plan_id FROM meal_plan_test_context)',
  ARRAY[0],
  'Un plan retirado desaparece inmediatamente del portal Paciente'
);

SELECT * FROM finish();
ROLLBACK;
