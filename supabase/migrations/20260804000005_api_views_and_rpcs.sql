-- Migration: 20260804000005_api_views_and_rpcs.sql
-- Description: Vistas y procedimientos RPC seguros expuestos en el esquema api

-- Grant USAGE sobre el esquema api
GRANT USAGE ON SCHEMA api TO authenticated;

-- =================================================================
-- 1. VISTAS DEL ESQUEMA API (SCHEMA-07: security_invoker = true)
-- =================================================================

-- 1.1 api.current_profile
CREATE OR REPLACE VIEW api.current_profile
WITH (security_invoker = true) AS
SELECT id, email, full_name, phone, created_at, updated_at
FROM app.profiles
WHERE id = auth.uid();
GRANT SELECT ON api.current_profile TO authenticated;

-- 1.2 api.current_organizations
CREATE OR REPLACE VIEW api.current_organizations
WITH (security_invoker = true) AS
SELECT o.id, o.name, o.slug, o.status, om.role AS my_role, o.created_at
FROM app.organizations o
JOIN app.organization_members om ON om.organization_id = o.id
WHERE om.user_id = auth.uid() AND om.status = 'active';
GRANT SELECT ON api.current_organizations TO authenticated;

-- 1.3 api.patient_directory (API-03: solo datos administrativos básicos, sin datos clínicos)
CREATE OR REPLACE VIEW api.patient_directory
WITH (security_invoker = true) AS
SELECT p.id, p.organization_id, p.first_name, p.last_name, p.email, p.phone, p.birth_date, p.city, p.status, p.created_at
FROM app.patients p;
GRANT SELECT ON api.patient_directory TO authenticated;

-- 1.4 api.patient_portal_home
CREATE OR REPLACE VIEW api.patient_portal_home
WITH (security_invoker = true) AS
SELECT p.id AS patient_id, p.organization_id, p.first_name, p.last_name, p.nutrition_goal, p.current_plan_name, ppa.status AS portal_access_status
FROM app.patients p
JOIN app.patient_portal_access ppa ON ppa.patient_id = p.id AND ppa.organization_id = p.organization_id
WHERE ppa.user_id = auth.uid() AND ppa.status = 'active';
GRANT SELECT ON api.patient_portal_home TO authenticated;

-- 1.5 api.check_in_assignments
CREATE OR REPLACE VIEW api.check_in_assignments
WITH (security_invoker = true) AS
SELECT id, organization_id, patient_id, created_by, status, due_date, created_at, completed_at, expired_at
FROM app.check_in_assignments;
GRANT SELECT ON api.check_in_assignments TO authenticated;

-- 1.6 api.attention_inbox (API-04)
CREATE OR REPLACE VIEW api.attention_inbox
WITH (security_invoker = true) AS
SELECT a.id, a.organization_id, a.patient_id, a.response_id, a.rule_code, a.priority, a.recommended_action, a.status, a.created_at, p.first_name AS patient_first_name, p.last_name AS patient_last_name
FROM app.alerts a
JOIN app.patients p ON p.id = a.patient_id AND p.organization_id = a.organization_id;
GRANT SELECT ON api.attention_inbox TO authenticated;

-- 1.7 api.patient_recommendations
CREATE OR REPLACE VIEW api.patient_recommendations
WITH (security_invoker = true) AS
SELECT id, organization_id, patient_id, response_id, created_by, recommendation_text, status, created_at
FROM app.patient_recommendations;
GRANT SELECT ON api.patient_recommendations TO authenticated;

-- 1.8 api.admin_organizations
CREATE OR REPLACE VIEW api.admin_organizations
WITH (security_invoker = true) AS
SELECT id, name, slug, status, created_at, updated_at
FROM app.organizations
WHERE security.is_platform_admin(auth.uid());
GRANT SELECT ON api.admin_organizations TO authenticated;

-- =================================================================
-- 2. PROCEDIMIENTOS RPC DEL ESQUEMA API (API-05, API-06)
-- =================================================================

-- 2.1 api.get_admin_metrics (API-07: Solo agregados desidentificados)
CREATE OR REPLACE FUNCTION api.get_admin_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT security.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acceso no autorizado: requiere rol platform_admin';
  END IF;

  SELECT jsonb_build_object(
    'organizations_total', (SELECT COUNT(*) FROM app.organizations),
    'organizations_active', (SELECT COUNT(*) FROM app.organizations WHERE status = 'active'),
    'organizations_suspended', (SELECT COUNT(*) FROM app.organizations WHERE status = 'suspended'),
    'nutritionists_total', (SELECT COUNT(*) FROM app.organization_members WHERE role IN ('organization_owner', 'nutritionist') AND status = 'active'),
    'patients_total', (SELECT COUNT(*) FROM app.patients WHERE status = 'active')
  ) INTO v_result;

  RETURN v_result;
END;
$$;
REVOKE EXECUTE ON FUNCTION api.get_admin_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.get_admin_metrics() TO authenticated;

-- 2.2 api.create_organization
CREATE OR REPLACE FUNCTION api.create_organization(p_name text, p_slug text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  IF NOT security.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acceso no autorizado: requiere rol platform_admin';
  END IF;

  INSERT INTO app.organizations (name, slug, status)
  VALUES (p_name, p_slug, 'active')
  RETURNING id INTO v_org_id;

  INSERT INTO app.audit_logs (actor_id, organization_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), v_org_id, 'CREATE_ORGANIZATION', 'organization', v_org_id, jsonb_build_object('slug', p_slug));

  RETURN v_org_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION api.create_organization(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.create_organization(text, text) TO authenticated;

-- 2.3 api.set_organization_status
CREATE OR REPLACE FUNCTION api.set_organization_status(p_org_id uuid, p_status text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT security.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acceso no autorizado: requiere rol platform_admin';
  END IF;

  IF p_status NOT IN ('active', 'suspended') THEN
    RAISE EXCEPTION 'Estado no válido';
  END IF;

  UPDATE app.organizations
  SET status = p_status
  WHERE id = p_org_id;

  INSERT INTO app.audit_logs (actor_id, organization_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), p_org_id, 'SET_ORGANIZATION_STATUS', 'organization', p_org_id, jsonb_build_object('status', p_status));

  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION api.set_organization_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.set_organization_status(uuid, text) TO authenticated;

-- 2.4 api.create_patient
CREATE OR REPLACE FUNCTION api.create_patient(
  p_org_id uuid,
  p_first_name text,
  p_last_name text,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_goal text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_patient_id uuid;
BEGIN
  IF NOT (security.has_org_role(p_org_id, ARRAY['organization_owner', 'nutritionist'], auth.uid())) THEN
    RAISE EXCEPTION 'Acceso no autorizado para crear pacientes en la organización';
  END IF;

  INSERT INTO app.patients (organization_id, first_name, last_name, email, phone, nutrition_goal, status, created_by)
  VALUES (p_org_id, p_first_name, p_last_name, p_email, p_phone, p_goal, 'active', auth.uid())
  RETURNING id INTO v_patient_id;

  -- Asignación profesional automática al creador
  INSERT INTO app.patient_assignments (organization_id, patient_id, nutritionist_user_id, is_primary, status)
  VALUES (p_org_id, v_patient_id, auth.uid(), true, 'active');

  INSERT INTO app.audit_logs (actor_id, organization_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), p_org_id, 'CREATE_PATIENT', 'patient', v_patient_id, '{}'::jsonb);

  RETURN v_patient_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION api.create_patient(uuid, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.create_patient(uuid, text, text, text, text, text) TO authenticated;

-- 2.5 api.assign_check_in
CREATE OR REPLACE FUNCTION api.assign_check_in(p_org_id uuid, p_patient_id uuid, p_due_date timestamptz DEFAULT (NOW() + INTERVAL '7 days'))
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_assignment_id uuid;
BEGIN
  IF NOT (security.has_org_role(p_org_id, ARRAY['organization_owner'], auth.uid()) OR security.is_assigned_nutritionist(p_patient_id, auth.uid())) THEN
    RAISE EXCEPTION 'Acceso no autorizado para asignar check-in a este paciente';
  END IF;

  IF EXISTS (SELECT 1 FROM app.check_in_assignments WHERE organization_id = p_org_id AND patient_id = p_patient_id AND status = 'pending') THEN
    RAISE EXCEPTION 'Ya existe una asignación de check-in pendiente para este paciente';
  END IF;

  INSERT INTO app.check_in_assignments (organization_id, patient_id, created_by, status, due_date)
  VALUES (p_org_id, p_patient_id, auth.uid(), 'pending', p_due_date)
  RETURNING id INTO v_assignment_id;

  INSERT INTO app.audit_logs (actor_id, organization_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), p_org_id, 'ASSIGN_CHECK_IN', 'check_in_assignment', v_assignment_id, '{}'::jsonb);

  RETURN v_assignment_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION api.assign_check_in(uuid, uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.assign_check_in(uuid, uuid, timestamptz) TO authenticated;

-- 2.6 api.submit_check_in (LOGIC-01 a LOGIC-06)
CREATE OR REPLACE FUNCTION api.submit_check_in(
  p_assignment_id uuid,
  p_energy smallint,
  p_adherence smallint,
  p_help_requested boolean DEFAULT false,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_assign app.check_in_assignments%ROWTYPE;
  v_response_id uuid;
BEGIN
  SELECT * INTO v_assign
  FROM app.check_in_assignments
  WHERE id = p_assignment_id;

  IF v_assign.id IS NULL THEN
    RAISE EXCEPTION 'Asignación de check-in no encontrada';
  END IF;

  IF NOT security.has_patient_portal_access(v_assign.patient_id, auth.uid()) THEN
    RAISE EXCEPTION 'No autorizado para responder este check-in';
  END IF;

  IF v_assign.status != 'pending' THEN
    RAISE EXCEPTION 'La asignación no está en estado pendiente';
  END IF;

  IF p_energy < 1 OR p_energy > 5 OR p_adherence < 1 OR p_adherence > 5 THEN
    RAISE EXCEPTION 'Puntuaciones deben estar entre 1 y 5';
  END IF;

  -- 1. Insertar respuesta de check-in (LOGIC-03)
  INSERT INTO app.check_in_responses (organization_id, assignment_id, patient_id, submitted_by, energy, adherence, help_requested, notes)
  VALUES (v_assign.organization_id, v_assign.id, v_assign.patient_id, auth.uid(), p_energy, p_adherence, p_help_requested, p_notes)
  RETURNING id INTO v_response_id;

  -- 2. Marcar asignación como completed (LOGIC-03)
  UPDATE app.check_in_assignments
  SET status = 'completed', completed_at = NOW()
  WHERE id = v_assign.id;

  -- 3. Generación inmediata de alertas (LOGIC-04, LOGIC-05, LOGIC-06)
  IF p_help_requested THEN
    INSERT INTO app.alerts (organization_id, patient_id, response_id, rule_code, priority, recommended_action, status)
    VALUES (v_assign.organization_id, v_assign.patient_id, v_response_id, 'HELP_REQUESTED', 'high', 'Contactar al paciente de manera prioritaria.', 'unresolved')
    ON CONFLICT (response_id, rule_code) DO NOTHING;
  END IF;

  IF p_energy <= 2 THEN
    INSERT INTO app.alerts (organization_id, patient_id, response_id, rule_code, priority, recommended_action, status)
    VALUES (v_assign.organization_id, v_assign.patient_id, v_response_id, 'LOW_ENERGY', 'high', 'Revisar el estado general y contactar al paciente.', 'unresolved')
    ON CONFLICT (response_id, rule_code) DO NOTHING;
  END IF;

  IF p_adherence <= 2 THEN
    INSERT INTO app.alerts (organization_id, patient_id, response_id, rule_code, priority, recommended_action, status)
    VALUES (v_assign.organization_id, v_assign.patient_id, v_response_id, 'LOW_ADHERENCE', 'medium', 'Revisar las dificultades de adherencia con el paciente.', 'unresolved')
    ON CONFLICT (response_id, rule_code) DO NOTHING;
  END IF;

  -- 4. Audit log desidentificado (LOGIC-03, DATA-13)
  INSERT INTO app.audit_logs (actor_id, organization_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), v_assign.organization_id, 'SUBMIT_CHECK_IN', 'check_in_response', v_response_id, '{}'::jsonb);

  RETURN v_response_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION api.submit_check_in(uuid, smallint, smallint, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.submit_check_in(uuid, smallint, smallint, boolean, text) TO authenticated;

-- 2.7 api.acknowledge_alert
CREATE OR REPLACE FUNCTION api.acknowledge_alert(p_alert_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_alert app.alerts%ROWTYPE;
BEGIN
  SELECT * INTO v_alert FROM app.alerts WHERE id = p_alert_id;

  IF v_alert.id IS NULL THEN
    RAISE EXCEPTION 'Alerta no encontrada';
  END IF;

  IF NOT (security.has_org_role(v_alert.organization_id, ARRAY['organization_owner'], auth.uid()) OR security.is_assigned_nutritionist(v_alert.patient_id, auth.uid())) THEN
    RAISE EXCEPTION 'No autorizado para gestionar esta alerta';
  END IF;

  UPDATE app.alerts
  SET status = 'acknowledged', acknowledged_by = auth.uid(), acknowledged_at = NOW()
  WHERE id = p_alert_id AND status = 'unresolved';

  INSERT INTO app.audit_logs (actor_id, organization_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), v_alert.organization_id, 'ACKNOWLEDGE_ALERT', 'alert', p_alert_id, '{}'::jsonb);

  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION api.acknowledge_alert(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.acknowledge_alert(uuid) TO authenticated;

-- 2.8 api.resolve_alert (LOGIC-09, LOGIC-10)
CREATE OR REPLACE FUNCTION api.resolve_alert(p_alert_id uuid, p_notes text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_alert app.alerts%ROWTYPE;
BEGIN
  SELECT * INTO v_alert FROM app.alerts WHERE id = p_alert_id;

  IF v_alert.id IS NULL THEN
    RAISE EXCEPTION 'Alerta no encontrada';
  END IF;

  IF NOT (security.has_org_role(v_alert.organization_id, ARRAY['organization_owner'], auth.uid()) OR security.is_assigned_nutritionist(v_alert.patient_id, auth.uid())) THEN
    RAISE EXCEPTION 'No autorizado para resolver esta alerta';
  END IF;

  IF v_alert.status = 'resolved' THEN
    RAISE EXCEPTION 'La alerta ya ha sido resuelta previamente';
  END IF;

  UPDATE app.alerts
  SET status = 'resolved', resolved_by = auth.uid(), resolved_at = NOW(), resolution_notes = p_notes
  WHERE id = p_alert_id;

  INSERT INTO app.audit_logs (actor_id, organization_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), v_alert.organization_id, 'RESOLVE_ALERT', 'alert', p_alert_id, '{}'::jsonb);

  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION api.resolve_alert(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.resolve_alert(uuid, text) TO authenticated;

-- 2.9 api.create_recommendation
CREATE OR REPLACE FUNCTION api.create_recommendation(
  p_org_id uuid,
  p_patient_id uuid,
  p_text text,
  p_response_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rec_id uuid;
BEGIN
  IF NOT (security.has_org_role(p_org_id, ARRAY['organization_owner'], auth.uid()) OR security.is_assigned_nutritionist(p_patient_id, auth.uid())) THEN
    RAISE EXCEPTION 'No autorizado para emitir recomendaciones a este paciente';
  END IF;

  INSERT INTO app.patient_recommendations (organization_id, patient_id, response_id, created_by, recommendation_text, status)
  VALUES (p_org_id, p_patient_id, p_response_id, auth.uid(), p_text, 'published')
  RETURNING id INTO v_rec_id;

  INSERT INTO app.audit_logs (actor_id, organization_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), p_org_id, 'CREATE_RECOMMENDATION', 'patient_recommendation', v_rec_id, '{}'::jsonb);

  RETURN v_rec_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION api.create_recommendation(uuid, uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.create_recommendation(uuid, uuid, text, uuid) TO authenticated;
