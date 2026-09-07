-- Migration: 20260821000015_individual_meal_plan_foundation.sql
-- Description: Planes alimentarios individuales, versiones publicables y seguimiento por comida.

-- -----------------------------------------------------------------------------
-- 1. Persistencia interna
-- -----------------------------------------------------------------------------

CREATE TABLE app.meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE RESTRICT,
  owner_nutritionist_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  bound_patient_id uuid NULL,
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 120),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_meal_plans_org_id UNIQUE (organization_id, id),
  CONSTRAINT fk_meal_plans_owner_member
    FOREIGN KEY (organization_id, owner_nutritionist_user_id)
    REFERENCES app.organization_members(organization_id, user_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_meal_plans_bound_patient
    FOREIGN KEY (organization_id, bound_patient_id)
    REFERENCES app.patients(organization_id, id)
    ON DELETE RESTRICT
);

CREATE TRIGGER trg_meal_plans_updated_at
  BEFORE UPDATE ON app.meal_plans
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE TABLE app.meal_plan_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  meal_plan_id uuid NOT NULL,
  version_number integer NOT NULL CHECK (version_number > 0),
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 120),
  content jsonb NOT NULL DEFAULT '{"days":[]}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'superseded')),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_by uuid NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  published_at timestamptz NULL,
  CONSTRAINT uq_meal_plan_versions_number UNIQUE (meal_plan_id, version_number),
  CONSTRAINT uq_meal_plan_versions_org_plan_id UNIQUE (organization_id, meal_plan_id, id),
  CONSTRAINT fk_meal_plan_versions_plan
    FOREIGN KEY (organization_id, meal_plan_id)
    REFERENCES app.meal_plans(organization_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT ck_meal_plan_versions_publication
    CHECK (
      (status = 'draft' AND published_by IS NULL AND published_at IS NULL)
      OR (status IN ('published', 'superseded') AND published_by IS NOT NULL AND published_at IS NOT NULL)
    )
);

CREATE UNIQUE INDEX idx_meal_plan_versions_one_draft
  ON app.meal_plan_versions(meal_plan_id)
  WHERE status = 'draft';

CREATE UNIQUE INDEX idx_meal_plan_versions_one_published
  ON app.meal_plan_versions(meal_plan_id)
  WHERE status = 'published';

CREATE TABLE app.meal_plan_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  meal_plan_id uuid NOT NULL UNIQUE,
  patient_id uuid NOT NULL,
  assignment_kind text NOT NULL CHECK (assignment_kind IN ('primary', 'complement')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'ended')),
  visible_version_id uuid NULL,
  assigned_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz NULL,
  ended_at timestamptz NULL,
  CONSTRAINT uq_meal_plan_assignments_scope UNIQUE (organization_id, id, meal_plan_id, patient_id),
  CONSTRAINT fk_meal_plan_assignments_plan
    FOREIGN KEY (organization_id, meal_plan_id)
    REFERENCES app.meal_plans(organization_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_meal_plan_assignments_patient
    FOREIGN KEY (organization_id, patient_id)
    REFERENCES app.patients(organization_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_meal_plan_assignments_visible_version
    FOREIGN KEY (organization_id, meal_plan_id, visible_version_id)
    REFERENCES app.meal_plan_versions(organization_id, meal_plan_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT ck_meal_plan_assignments_state
    CHECK (
      (status = 'pending' AND visible_version_id IS NULL AND activated_at IS NULL AND ended_at IS NULL)
      OR (status = 'active' AND visible_version_id IS NOT NULL AND activated_at IS NOT NULL AND ended_at IS NULL)
      OR (status = 'ended' AND ended_at IS NOT NULL)
    )
);

CREATE UNIQUE INDEX idx_meal_plan_assignments_one_active_kind
  ON app.meal_plan_assignments(organization_id, patient_id, assignment_kind)
  WHERE status = 'active';

CREATE UNIQUE INDEX idx_meal_plan_assignments_one_pending_kind
  ON app.meal_plan_assignments(organization_id, patient_id, assignment_kind)
  WHERE status = 'pending';

CREATE TABLE app.meal_plan_meal_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  assignment_id uuid NOT NULL,
  meal_plan_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  day_id uuid NOT NULL,
  meal_id uuid NOT NULL,
  adherence_status text NULL CHECK (adherence_status IN ('completed', 'partial', 'not_completed')),
  patient_comment text NULL CHECK (patient_comment IS NULL OR char_length(patient_comment) <= 500),
  comment_updated_at timestamptz NULL,
  reviewed_by uuid NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  reviewed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_meal_plan_meal_activity UNIQUE (assignment_id, day_id, meal_id),
  CONSTRAINT fk_meal_plan_meal_activity_assignment
    FOREIGN KEY (organization_id, assignment_id, meal_plan_id, patient_id)
    REFERENCES app.meal_plan_assignments(organization_id, id, meal_plan_id, patient_id)
    ON DELETE RESTRICT,
  CONSTRAINT ck_meal_plan_meal_activity_review
    CHECK (
      (reviewed_at IS NULL AND reviewed_by IS NULL)
      OR (reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL)
    )
);

CREATE TRIGGER trg_meal_plan_meal_activity_updated_at
  BEFORE UPDATE ON app.meal_plan_meal_activity
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE INDEX idx_meal_plans_owner ON app.meal_plans(organization_id, owner_nutritionist_user_id);
CREATE INDEX idx_meal_plans_patient ON app.meal_plans(organization_id, bound_patient_id);
CREATE INDEX idx_meal_plan_versions_plan ON app.meal_plan_versions(meal_plan_id, version_number DESC);
CREATE INDEX idx_meal_plan_assignments_patient ON app.meal_plan_assignments(organization_id, patient_id, status);
CREATE INDEX idx_meal_plan_activity_unreviewed ON app.meal_plan_meal_activity(meal_plan_id, comment_updated_at DESC)
  WHERE patient_comment IS NOT NULL AND reviewed_at IS NULL;

-- Una versión publicada es un snapshot. Sólo los borradores pueden editarse.
CREATE OR REPLACE FUNCTION app.prevent_published_meal_plan_version_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.status = 'published'
     AND TG_OP = 'UPDATE'
     AND NEW.status = 'superseded'
     AND NEW.title = OLD.title
     AND NEW.content = OLD.content
     AND NEW.version_number = OLD.version_number
     AND NEW.published_by = OLD.published_by
     AND NEW.published_at = OLD.published_at THEN
    RETURN NEW;
  END IF;
  IF OLD.status <> 'draft' THEN
    RAISE EXCEPTION 'Las versiones publicadas del plan son inmutables';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_published_meal_plan_version_mutation
  BEFORE UPDATE OR DELETE ON app.meal_plan_versions
  FOR EACH ROW EXECUTE FUNCTION app.prevent_published_meal_plan_version_mutation();

-- Valida el contrato JSON sin depender de extensiones externas.
CREATE OR REPLACE FUNCTION app.validate_meal_plan_content(p_content jsonb, p_for_publication boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_day jsonb;
  v_meal jsonb;
  v_item jsonb;
  v_day_count integer;
  v_meal_count integer;
  v_day_ids uuid[] := ARRAY[]::uuid[];
  v_meal_ids uuid[] := ARRAY[]::uuid[];
  v_id uuid;
BEGIN
  IF p_content IS NULL OR jsonb_typeof(p_content) <> 'object' OR jsonb_typeof(p_content->'days') <> 'array' THEN
    RAISE EXCEPTION 'El contenido del plan debe incluir una lista de días';
  END IF;

  v_day_count := jsonb_array_length(p_content->'days');
  IF v_day_count > 30 OR (p_for_publication AND v_day_count < 7) THEN
    RAISE EXCEPTION 'Un plan publicado debe contener entre 7 y 30 días';
  END IF;

  FOR v_day IN SELECT value FROM jsonb_array_elements(p_content->'days') LOOP
    IF jsonb_typeof(v_day) <> 'object' OR jsonb_typeof(v_day->'meals') <> 'array' THEN
      RAISE EXCEPTION 'Cada día debe incluir una lista de comidas';
    END IF;
    v_id := (v_day->>'id')::uuid;
    IF v_id = ANY(v_day_ids) THEN RAISE EXCEPTION 'Los identificadores de día deben ser únicos'; END IF;
    v_day_ids := array_append(v_day_ids, v_id);

    v_meal_count := jsonb_array_length(v_day->'meals');
    IF v_meal_count > 4 THEN RAISE EXCEPTION 'Cada día admite hasta cuatro comidas'; END IF;

    FOR v_meal IN SELECT value FROM jsonb_array_elements(v_day->'meals') LOOP
      IF jsonb_typeof(v_meal) <> 'object' OR jsonb_typeof(v_meal->'items') <> 'array' THEN
        RAISE EXCEPTION 'Cada comida debe incluir una lista de elementos';
      END IF;
      v_id := (v_meal->>'id')::uuid;
      IF v_id = ANY(v_meal_ids) THEN RAISE EXCEPTION 'Los identificadores de comida deben ser únicos'; END IF;
      v_meal_ids := array_append(v_meal_ids, v_id);
      IF p_for_publication AND jsonb_array_length(v_meal->'items') = 0 THEN
        RAISE EXCEPTION 'Cada comida publicada debe contener al menos un elemento';
      END IF;
      FOR v_item IN SELECT value FROM jsonb_array_elements(v_meal->'items') LOOP
        IF jsonb_typeof(v_item) <> 'object' OR nullif(trim(v_item->>'description'), '') IS NULL THEN
          RAISE EXCEPTION 'Cada elemento debe tener una descripción';
        END IF;
        PERFORM (v_item->>'id')::uuid;
      END LOOP;
    END LOOP;
  END LOOP;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. Autorización clínica de usuario actual
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION security.is_current_clinical_professional(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL
    AND security.is_current_active_org_member(p_org_id)
    AND (
      security.has_current_org_role(p_org_id, ARRAY['nutritionist'])
      OR EXISTS (
        SELECT 1
        FROM app.patient_assignments pa
        WHERE pa.organization_id = p_org_id
          AND pa.nutritionist_user_id = auth.uid()
          AND pa.status = 'active'
      )
    );
$$;

REVOKE EXECUTE ON FUNCTION security.is_current_clinical_professional(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION security.is_current_clinical_professional(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION security.can_current_read_meal_plan(p_meal_plan_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app.meal_plans mp
    JOIN app.organizations o ON o.id = mp.organization_id AND o.status = 'active'
    WHERE mp.id = p_meal_plan_id
      AND (
        (
          mp.owner_nutritionist_user_id = auth.uid()
          AND security.is_current_clinical_professional(mp.organization_id)
          AND (mp.bound_patient_id IS NULL OR security.is_current_assigned_nutritionist(mp.bound_patient_id))
        )
        OR EXISTS (
          SELECT 1
          FROM app.meal_plan_assignments mpa
          WHERE mpa.meal_plan_id = mp.id
            AND mpa.status = 'active'
            AND security.has_current_patient_portal_access(mpa.patient_id)
        )
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION security.can_current_read_meal_plan(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION security.can_current_read_meal_plan(uuid) TO authenticated, service_role;

ALTER TABLE app.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.meal_plan_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.meal_plan_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.meal_plan_meal_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY meal_plans_select_authorized ON app.meal_plans
  FOR SELECT TO authenticated
  USING (security.can_current_read_meal_plan(id));

CREATE POLICY meal_plan_versions_select_authorized ON app.meal_plan_versions
  FOR SELECT TO authenticated
  USING (security.can_current_read_meal_plan(meal_plan_id));

CREATE POLICY meal_plan_assignments_select_authorized ON app.meal_plan_assignments
  FOR SELECT TO authenticated
  USING (
    security.can_current_read_meal_plan(meal_plan_id)
    AND (
      security.is_current_assigned_nutritionist(patient_id)
      OR (security.has_current_patient_portal_access(patient_id) AND status = 'active')
    )
  );

CREATE POLICY meal_plan_activity_select_authorized ON app.meal_plan_meal_activity
  FOR SELECT TO authenticated
  USING (
    security.can_current_read_meal_plan(meal_plan_id)
    AND (
      security.is_current_assigned_nutritionist(patient_id)
      OR security.has_current_patient_portal_access(patient_id)
    )
  );

GRANT SELECT ON app.meal_plans, app.meal_plan_versions, app.meal_plan_assignments, app.meal_plan_meal_activity TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.meal_plans, app.meal_plan_versions, app.meal_plan_assignments, app.meal_plan_meal_activity TO service_role;
REVOKE INSERT, UPDATE, DELETE ON app.meal_plans, app.meal_plan_versions, app.meal_plan_assignments, app.meal_plan_meal_activity FROM authenticated;

-- -----------------------------------------------------------------------------
-- 3. Vistas de lectura
-- -----------------------------------------------------------------------------

CREATE VIEW api.professional_meal_plans
WITH (security_invoker = true) AS
SELECT
  mp.id,
  mp.organization_id,
  mp.owner_nutritionist_user_id,
  mp.bound_patient_id AS patient_id,
  p.first_name AS patient_first_name,
  p.last_name AS patient_last_name,
  mp.title,
  mp.status,
  mpa.assignment_kind,
  mpa.status AS assignment_status,
  mpa.visible_version_id,
  draft.id AS draft_version_id,
  COALESCE(draft.version_number, published.version_number) AS editable_version_number,
  COALESCE(draft.title, published.title, mp.title) AS editable_title,
  COALESCE(draft.content, published.content, '{"days":[]}'::jsonb) AS editable_content,
  published.version_number AS published_version_number,
  published.published_at,
  (
    SELECT count(*)::integer
    FROM app.meal_plan_meal_activity activity
    WHERE activity.meal_plan_id = mp.id
      AND activity.patient_comment IS NOT NULL
      AND activity.reviewed_at IS NULL
  ) AS pending_comment_count,
  mp.created_at,
  mp.updated_at
FROM app.meal_plans mp
LEFT JOIN app.patients p
  ON p.organization_id = mp.organization_id AND p.id = mp.bound_patient_id
LEFT JOIN app.meal_plan_assignments mpa ON mpa.meal_plan_id = mp.id
LEFT JOIN app.meal_plan_versions draft
  ON draft.meal_plan_id = mp.id AND draft.status = 'draft'
LEFT JOIN app.meal_plan_versions published
  ON published.meal_plan_id = mp.id AND published.status = 'published'
WHERE mp.owner_nutritionist_user_id = auth.uid();

CREATE VIEW api.patient_current_meal_plans
WITH (security_invoker = true) AS
SELECT
  mp.id,
  mp.organization_id,
  mpa.patient_id,
  mpa.assignment_kind,
  mpa.id AS assignment_id,
  version.id AS version_id,
  version.version_number,
  version.title,
  version.content,
  version.published_at
FROM app.meal_plan_assignments mpa
JOIN app.meal_plans mp ON mp.id = mpa.meal_plan_id AND mp.organization_id = mpa.organization_id
JOIN app.meal_plan_versions version
  ON version.id = mpa.visible_version_id
  AND version.meal_plan_id = mpa.meal_plan_id
  AND version.organization_id = mpa.organization_id
WHERE mpa.status = 'active';

CREATE VIEW api.meal_plan_meal_activity
WITH (security_invoker = true) AS
SELECT
  id,
  organization_id,
  assignment_id,
  meal_plan_id,
  patient_id,
  day_id,
  meal_id,
  adherence_status,
  patient_comment,
  comment_updated_at,
  reviewed_at,
  created_at,
  updated_at
FROM app.meal_plan_meal_activity;

GRANT SELECT ON api.professional_meal_plans, api.patient_current_meal_plans, api.meal_plan_meal_activity TO authenticated;

-- -----------------------------------------------------------------------------
-- 4. RPC transaccionales
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION api.create_meal_plan(p_org_id uuid, p_title text, p_content jsonb DEFAULT '{"days":[]}'::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_plan_id uuid;
BEGIN
  IF nullif(trim(p_title), '') IS NULL THEN RAISE EXCEPTION 'El título del plan es obligatorio'; END IF;
  IF NOT security.is_current_clinical_professional(p_org_id) THEN
    RAISE EXCEPTION 'No autorizado para crear planes en esta organización';
  END IF;
  PERFORM app.validate_meal_plan_content(p_content, false);

  INSERT INTO app.meal_plans (organization_id, owner_nutritionist_user_id, title)
  VALUES (p_org_id, auth.uid(), trim(p_title)) RETURNING id INTO v_plan_id;

  INSERT INTO app.meal_plan_versions (organization_id, meal_plan_id, version_number, title, content, created_by)
  VALUES (p_org_id, v_plan_id, 1, trim(p_title), p_content, auth.uid());

  INSERT INTO app.audit_logs (actor_id, organization_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), p_org_id, 'CREATE_MEAL_PLAN', 'meal_plan', v_plan_id, '{}'::jsonb);
  RETURN v_plan_id;
END;
$$;

CREATE OR REPLACE FUNCTION api.update_meal_plan_draft(p_meal_plan_id uuid, p_title text, p_content jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_plan app.meal_plans%ROWTYPE;
  v_version_id uuid;
  v_next integer;
BEGIN
  SELECT * INTO v_plan FROM app.meal_plans WHERE id = p_meal_plan_id FOR UPDATE;
  IF v_plan.id IS NULL OR v_plan.owner_nutritionist_user_id <> auth.uid()
     OR NOT security.can_current_read_meal_plan(v_plan.id) THEN
    RAISE EXCEPTION 'Plan no encontrado o sin permisos de edición';
  END IF;
  IF v_plan.status = 'archived' THEN RAISE EXCEPTION 'Un plan archivado no puede editarse'; END IF;
  IF nullif(trim(p_title), '') IS NULL THEN RAISE EXCEPTION 'El título del plan es obligatorio'; END IF;
  PERFORM app.validate_meal_plan_content(p_content, false);

  SELECT id INTO v_version_id FROM app.meal_plan_versions
  WHERE meal_plan_id = v_plan.id AND status = 'draft' FOR UPDATE;
  IF v_version_id IS NULL THEN
    SELECT coalesce(max(version_number), 0) + 1 INTO v_next
    FROM app.meal_plan_versions WHERE meal_plan_id = v_plan.id;
    INSERT INTO app.meal_plan_versions (organization_id, meal_plan_id, version_number, title, content, created_by)
    VALUES (v_plan.organization_id, v_plan.id, v_next, trim(p_title), p_content, auth.uid())
    RETURNING id INTO v_version_id;
  ELSE
    UPDATE app.meal_plan_versions
    SET title = trim(p_title), content = p_content, updated_at = now()
    WHERE id = v_version_id;
  END IF;
  UPDATE app.meal_plans SET title = trim(p_title) WHERE id = v_plan.id;
  INSERT INTO app.audit_logs (actor_id, organization_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), v_plan.organization_id, 'UPDATE_MEAL_PLAN_DRAFT', 'meal_plan', v_plan.id, '{}'::jsonb);
  RETURN v_version_id;
END;
$$;

CREATE OR REPLACE FUNCTION api.assign_meal_plan(p_meal_plan_id uuid, p_patient_id uuid, p_assignment_kind text DEFAULT 'primary')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_plan app.meal_plans%ROWTYPE;
  v_assignment_id uuid;
BEGIN
  SELECT * INTO v_plan FROM app.meal_plans WHERE id = p_meal_plan_id FOR UPDATE;
  IF v_plan.id IS NULL OR v_plan.owner_nutritionist_user_id <> auth.uid()
     OR NOT security.is_current_clinical_professional(v_plan.organization_id) THEN
    RAISE EXCEPTION 'Plan no encontrado o sin permisos de asignación';
  END IF;
  IF p_assignment_kind NOT IN ('primary', 'complement') THEN RAISE EXCEPTION 'Tipo de asignación inválido'; END IF;
  IF NOT EXISTS (SELECT 1 FROM app.patients WHERE id = p_patient_id AND organization_id = v_plan.organization_id AND status = 'active')
     OR NOT security.is_current_assigned_nutritionist(p_patient_id) THEN
    RAISE EXCEPTION 'Paciente no encontrado o no asignado al profesional actual';
  END IF;
  IF v_plan.bound_patient_id IS NOT NULL AND v_plan.bound_patient_id <> p_patient_id THEN
    RAISE EXCEPTION 'Este plan ya quedó ligado a otro paciente';
  END IF;
  IF EXISTS (SELECT 1 FROM app.meal_plan_assignments WHERE meal_plan_id = v_plan.id) THEN
    RAISE EXCEPTION 'Este plan ya posee una asignación histórica';
  END IF;

  UPDATE app.meal_plans SET bound_patient_id = p_patient_id WHERE id = v_plan.id;
  INSERT INTO app.meal_plan_assignments (
    organization_id, meal_plan_id, patient_id, assignment_kind, assigned_by
  ) VALUES (
    v_plan.organization_id, v_plan.id, p_patient_id, p_assignment_kind, auth.uid()
  ) RETURNING id INTO v_assignment_id;

  INSERT INTO app.audit_logs (actor_id, organization_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), v_plan.organization_id, 'ASSIGN_MEAL_PLAN_PENDING', 'meal_plan_assignment', v_assignment_id,
    jsonb_build_object('meal_plan_id', v_plan.id, 'patient_id', p_patient_id, 'assignment_kind', p_assignment_kind));
  RETURN v_assignment_id;
END;
$$;

CREATE OR REPLACE FUNCTION api.publish_meal_plan(p_meal_plan_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_plan app.meal_plans%ROWTYPE;
  v_assignment app.meal_plan_assignments%ROWTYPE;
  v_draft app.meal_plan_versions%ROWTYPE;
BEGIN
  SELECT * INTO v_plan FROM app.meal_plans WHERE id = p_meal_plan_id FOR UPDATE;
  SELECT * INTO v_assignment FROM app.meal_plan_assignments WHERE meal_plan_id = p_meal_plan_id FOR UPDATE;
  SELECT * INTO v_draft FROM app.meal_plan_versions WHERE meal_plan_id = p_meal_plan_id AND status = 'draft' FOR UPDATE;
  IF v_plan.id IS NULL OR v_assignment.id IS NULL OR v_draft.id IS NULL
     OR v_plan.owner_nutritionist_user_id <> auth.uid()
     OR NOT security.is_current_assigned_nutritionist(v_assignment.patient_id) THEN
    RAISE EXCEPTION 'Plan no encontrado, sin borrador publicable o sin permisos';
  END IF;
  PERFORM app.validate_meal_plan_content(v_draft.content, true);

  UPDATE app.meal_plan_versions
  SET status = 'superseded'
  WHERE meal_plan_id = v_plan.id AND status = 'published';

  UPDATE app.meal_plan_versions
  SET status = 'published', published_by = auth.uid(), published_at = now(), updated_at = now()
  WHERE id = v_draft.id;

  UPDATE app.meal_plan_assignments
  SET status = 'ended', ended_at = now()
  WHERE organization_id = v_assignment.organization_id
    AND patient_id = v_assignment.patient_id
    AND assignment_kind = v_assignment.assignment_kind
    AND status = 'active'
    AND id <> v_assignment.id;

  UPDATE app.meal_plan_assignments
  SET status = 'active', visible_version_id = v_draft.id,
      activated_at = coalesce(activated_at, now()), ended_at = NULL
  WHERE id = v_assignment.id;

  UPDATE app.meal_plans SET status = 'published', title = v_draft.title WHERE id = v_plan.id;

  INSERT INTO app.audit_logs (actor_id, organization_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), v_plan.organization_id, 'PUBLISH_MEAL_PLAN', 'meal_plan_version', v_draft.id,
    jsonb_build_object('meal_plan_id', v_plan.id, 'version_number', v_draft.version_number));
  RETURN v_draft.id;
END;
$$;

CREATE OR REPLACE FUNCTION api.retire_meal_plan(p_meal_plan_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_plan app.meal_plans%ROWTYPE;
BEGIN
  SELECT * INTO v_plan FROM app.meal_plans WHERE id = p_meal_plan_id FOR UPDATE;
  IF v_plan.id IS NULL OR v_plan.owner_nutritionist_user_id <> auth.uid()
     OR (v_plan.bound_patient_id IS NOT NULL AND NOT security.is_current_assigned_nutritionist(v_plan.bound_patient_id)) THEN
    RAISE EXCEPTION 'Plan no encontrado o sin permisos para retirarlo';
  END IF;
  UPDATE app.meal_plan_assignments SET status = 'ended', ended_at = now()
  WHERE meal_plan_id = v_plan.id AND status IN ('pending', 'active');
  UPDATE app.meal_plans SET status = 'archived' WHERE id = v_plan.id;
  INSERT INTO app.audit_logs (actor_id, organization_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), v_plan.organization_id, 'RETIRE_MEAL_PLAN', 'meal_plan', v_plan.id, '{}'::jsonb);
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION api.set_meal_plan_meal_activity(
  p_meal_plan_id uuid,
  p_day_id uuid,
  p_meal_id uuid,
  p_adherence_status text DEFAULT NULL,
  p_comment text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_assignment app.meal_plan_assignments%ROWTYPE;
  v_content jsonb;
  v_activity_id uuid;
  v_comment text := nullif(trim(p_comment), '');
  v_old_comment text;
BEGIN
  SELECT * INTO v_assignment FROM app.meal_plan_assignments
  WHERE meal_plan_id = p_meal_plan_id AND status = 'active' FOR UPDATE;
  IF v_assignment.id IS NULL OR NOT security.has_current_patient_portal_access(v_assignment.patient_id) THEN
    RAISE EXCEPTION 'Plan vigente no encontrado o sin permisos';
  END IF;
  IF p_adherence_status IS NOT NULL AND p_adherence_status NOT IN ('completed', 'partial', 'not_completed') THEN
    RAISE EXCEPTION 'Estado de cumplimiento inválido';
  END IF;
  IF v_comment IS NOT NULL AND char_length(v_comment) > 500 THEN RAISE EXCEPTION 'El comentario supera 500 caracteres'; END IF;

  SELECT content INTO v_content FROM app.meal_plan_versions WHERE id = v_assignment.visible_version_id;
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_content->'days') day
    CROSS JOIN LATERAL jsonb_array_elements(day->'meals') meal
    WHERE day->>'id' = p_day_id::text AND meal->>'id' = p_meal_id::text
  ) THEN RAISE EXCEPTION 'La comida ya no forma parte del plan vigente'; END IF;

  SELECT patient_comment INTO v_old_comment FROM app.meal_plan_meal_activity
  WHERE assignment_id = v_assignment.id AND day_id = p_day_id AND meal_id = p_meal_id;

  INSERT INTO app.meal_plan_meal_activity (
    organization_id, assignment_id, meal_plan_id, patient_id, day_id, meal_id,
    adherence_status, patient_comment, comment_updated_at
  ) VALUES (
    v_assignment.organization_id, v_assignment.id, v_assignment.meal_plan_id, v_assignment.patient_id,
    p_day_id, p_meal_id, p_adherence_status, v_comment,
    CASE WHEN v_comment IS NULL THEN NULL ELSE now() END
  )
  ON CONFLICT (assignment_id, day_id, meal_id) DO UPDATE SET
    adherence_status = EXCLUDED.adherence_status,
    patient_comment = EXCLUDED.patient_comment,
    comment_updated_at = CASE
      WHEN app.meal_plan_meal_activity.patient_comment IS DISTINCT FROM EXCLUDED.patient_comment
        THEN CASE WHEN EXCLUDED.patient_comment IS NULL THEN NULL ELSE now() END
      ELSE app.meal_plan_meal_activity.comment_updated_at
    END,
    reviewed_by = CASE
      WHEN app.meal_plan_meal_activity.patient_comment IS DISTINCT FROM EXCLUDED.patient_comment THEN NULL
      ELSE app.meal_plan_meal_activity.reviewed_by
    END,
    reviewed_at = CASE
      WHEN app.meal_plan_meal_activity.patient_comment IS DISTINCT FROM EXCLUDED.patient_comment THEN NULL
      ELSE app.meal_plan_meal_activity.reviewed_at
    END
  RETURNING id INTO v_activity_id;

  INSERT INTO app.audit_logs (actor_id, organization_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), v_assignment.organization_id, 'UPDATE_MEAL_ADHERENCE', 'meal_plan_meal_activity', v_activity_id,
    jsonb_build_object('meal_plan_id', v_assignment.meal_plan_id, 'comment_changed', v_old_comment IS DISTINCT FROM v_comment));
  RETURN v_activity_id;
END;
$$;

CREATE OR REPLACE FUNCTION api.review_meal_plan_comment(p_activity_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_activity app.meal_plan_meal_activity%ROWTYPE;
  v_owner uuid;
BEGIN
  SELECT * INTO v_activity FROM app.meal_plan_meal_activity WHERE id = p_activity_id FOR UPDATE;
  SELECT owner_nutritionist_user_id INTO v_owner FROM app.meal_plans WHERE id = v_activity.meal_plan_id;
  IF v_activity.id IS NULL OR v_activity.patient_comment IS NULL OR v_owner <> auth.uid()
     OR NOT security.is_current_assigned_nutritionist(v_activity.patient_id) THEN
    RAISE EXCEPTION 'Comentario no encontrado o sin permisos para revisarlo';
  END IF;
  UPDATE app.meal_plan_meal_activity SET reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_activity_id;
  INSERT INTO app.audit_logs (actor_id, organization_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), v_activity.organization_id, 'REVIEW_MEAL_PLAN_COMMENT', 'meal_plan_meal_activity', v_activity.id, '{}'::jsonb);
  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION api.create_meal_plan(uuid, text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION api.update_meal_plan_draft(uuid, text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION api.assign_meal_plan(uuid, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION api.publish_meal_plan(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION api.retire_meal_plan(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION api.set_meal_plan_meal_activity(uuid, uuid, uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION api.review_meal_plan_comment(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION api.create_meal_plan(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION api.update_meal_plan_draft(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION api.assign_meal_plan(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION api.publish_meal_plan(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION api.retire_meal_plan(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION api.set_meal_plan_meal_activity(uuid, uuid, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION api.review_meal_plan_comment(uuid) TO authenticated;

COMMENT ON TABLE app.meal_plans IS 'Entidad clínica individual; una vez ligada a un paciente no puede reutilizarse con otra persona.';
COMMENT ON TABLE app.meal_plan_versions IS 'Snapshots versionados. Sólo el borrador es mutable; publicar requiere una RPC explícita.';
COMMENT ON COLUMN app.meal_plan_meal_activity.patient_comment IS 'Último texto del paciente. Editable y sin historial de contenido por decisión de producto.';
