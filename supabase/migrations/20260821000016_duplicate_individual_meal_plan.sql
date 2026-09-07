-- Migration: 20260821000016_duplicate_individual_meal_plan.sql
-- Description: Duplicación segura de estructura sin paciente, progreso ni identificadores clínicos compartidos.

CREATE OR REPLACE FUNCTION app.clone_meal_plan_content_with_new_ids(p_content jsonb)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SET search_path = ''
AS $$
DECLARE
  v_day jsonb;
  v_meal jsonb;
  v_item jsonb;
  v_days jsonb := '[]'::jsonb;
  v_meals jsonb;
  v_items jsonb;
BEGIN
  PERFORM app.validate_meal_plan_content(p_content, false);
  FOR v_day IN SELECT value FROM jsonb_array_elements(p_content->'days') LOOP
    v_meals := '[]'::jsonb;
    FOR v_meal IN SELECT value FROM jsonb_array_elements(v_day->'meals') LOOP
      v_items := '[]'::jsonb;
      FOR v_item IN SELECT value FROM jsonb_array_elements(v_meal->'items') LOOP
        v_items := v_items || jsonb_build_array(
          jsonb_set(v_item, '{id}', to_jsonb(gen_random_uuid()::text), true)
        );
      END LOOP;
      v_meals := v_meals || jsonb_build_array(
        jsonb_set(
          jsonb_set(v_meal, '{id}', to_jsonb(gen_random_uuid()::text), true),
          '{items}', v_items, true
        )
      );
    END LOOP;
    v_days := v_days || jsonb_build_array(
      jsonb_set(
        jsonb_set(v_day, '{id}', to_jsonb(gen_random_uuid()::text), true),
        '{meals}', v_meals, true
      )
    );
  END LOOP;
  RETURN jsonb_set(p_content, '{days}', v_days, true);
END;
$$;

REVOKE EXECUTE ON FUNCTION app.clone_meal_plan_content_with_new_ids(jsonb) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION app.clone_meal_plan_content_with_new_ids(jsonb) TO service_role;

CREATE OR REPLACE FUNCTION api.duplicate_meal_plan(p_source_meal_plan_id uuid, p_title text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_source app.meal_plans%ROWTYPE;
  v_source_version app.meal_plan_versions%ROWTYPE;
  v_new_plan_id uuid;
  v_new_title text;
  v_new_content jsonb;
BEGIN
  SELECT * INTO v_source FROM app.meal_plans WHERE id = p_source_meal_plan_id FOR UPDATE;
  IF v_source.id IS NULL OR v_source.owner_nutritionist_user_id <> auth.uid()
     OR NOT security.can_current_read_meal_plan(v_source.id) THEN
    RAISE EXCEPTION 'Plan de origen no encontrado o sin permisos para duplicarlo';
  END IF;

  SELECT * INTO v_source_version
  FROM app.meal_plan_versions
  WHERE meal_plan_id = v_source.id
  ORDER BY CASE status WHEN 'draft' THEN 0 WHEN 'published' THEN 1 ELSE 2 END, version_number DESC
  LIMIT 1;
  IF v_source_version.id IS NULL THEN RAISE EXCEPTION 'El plan de origen no contiene una versión reutilizable'; END IF;

  v_new_title := coalesce(nullif(trim(p_title), ''), v_source_version.title || ' (copia)');
  v_new_content := app.clone_meal_plan_content_with_new_ids(v_source_version.content);

  INSERT INTO app.meal_plans (organization_id, owner_nutritionist_user_id, title)
  VALUES (v_source.organization_id, auth.uid(), v_new_title)
  RETURNING id INTO v_new_plan_id;

  INSERT INTO app.meal_plan_versions (
    organization_id, meal_plan_id, version_number, title, content, created_by
  ) VALUES (
    v_source.organization_id, v_new_plan_id, 1, v_new_title, v_new_content, auth.uid()
  );

  INSERT INTO app.audit_logs (actor_id, organization_id, action, resource_type, resource_id, details)
  VALUES (
    auth.uid(), v_source.organization_id, 'DUPLICATE_MEAL_PLAN', 'meal_plan', v_new_plan_id,
    jsonb_build_object('source_meal_plan_id', v_source.id)
  );
  RETURN v_new_plan_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION api.duplicate_meal_plan(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.duplicate_meal_plan(uuid, text) TO authenticated;

