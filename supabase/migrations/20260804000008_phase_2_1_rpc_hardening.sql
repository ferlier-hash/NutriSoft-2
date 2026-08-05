-- Migration: 20260804000008_phase_2_1_rpc_hardening.sql
-- Description: Hardening de procedimientos RPC y validaciones defensivas de auditoría (RPC-01..12, AUDIT-01..09)

-- 1. Validación defensiva de Audit Logs (AUDIT-04, AUDIT-05, AUDIT-06)
CREATE OR REPLACE FUNCTION app.validate_audit_log_details()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.details IS NULL OR jsonb_typeof(NEW.details) != 'object' THEN
    RAISE EXCEPTION 'Los detalles del registro de auditoría deben ser un objeto JSON';
  END IF;

  IF NEW.details ?| ARRAY['first_name', 'last_name', 'email', 'phone', 'notes', 'recommendation_text', 'energy', 'adherence', 'help_requested', 'password', 'token', 'secret'] THEN
    RAISE EXCEPTION 'El registro de auditoría contiene información clínica o confidencial prohibida';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_audit_log BEFORE INSERT ON app.audit_logs
  FOR EACH ROW EXECUTE FUNCTION app.validate_audit_log_details();

-- 2. HARDENING DE api.submit_check_in (RPC-01, RPC-02, RPC-03)
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
  -- Bloqueo explícito transaccional (RPC-01)
  SELECT * INTO v_assign
  FROM app.check_in_assignments
  WHERE id = p_assignment_id
  FOR UPDATE;

  IF v_assign.id IS NULL THEN
    RAISE EXCEPTION 'Asignación de check-in no encontrada';
  END IF;

  IF NOT security.is_active_organization(v_assign.organization_id) THEN
    RAISE EXCEPTION 'La organización del paciente no está activa';
  END IF;

  IF NOT security.has_current_patient_portal_access(v_assign.patient_id) THEN
    RAISE EXCEPTION 'No autorizado para responder este check-in';
  END IF;

  IF v_assign.status != 'pending' THEN
    RAISE EXCEPTION 'La asignación no está en estado pendiente';
  END IF;

  IF v_assign.due_date IS NOT NULL AND v_assign.due_date < NOW() THEN
    RAISE EXCEPTION 'La asignación de check-in ha vencido';
  END IF;

  IF p_energy < 1 OR p_energy > 5 OR p_adherence < 1 OR p_adherence > 5 THEN
    RAISE EXCEPTION 'Puntuaciones deben estar entre 1 y 5';
  END IF;

  -- Insertar respuesta
  INSERT INTO app.check_in_responses (organization_id, assignment_id, patient_id, submitted_by, energy, adherence, help_requested, notes)
  VALUES (v_assign.organization_id, v_assign.id, v_assign.patient_id, auth.uid(), p_energy, p_adherence, p_help_requested, p_notes)
  RETURNING id INTO v_response_id;

  -- Actualizar asignación
  UPDATE app.check_in_assignments
  SET status = 'completed', completed_at = NOW()
  WHERE id = v_assign.id;

  -- Generación de alertas
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

  -- Audit log desidentificado
  INSERT INTO app.audit_logs (actor_id, organization_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), v_assign.organization_id, 'SUBMIT_CHECK_IN', 'check_in_response', v_response_id, '{}'::jsonb);

  RETURN v_response_id;
END;
$$;

-- 3. HARDENING DE api.acknowledge_alert (RPC-05)
CREATE OR REPLACE FUNCTION api.acknowledge_alert(p_alert_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_alert app.alerts%ROWTYPE;
  v_rows integer;
BEGIN
  SELECT * INTO v_alert FROM app.alerts WHERE id = p_alert_id FOR UPDATE;

  IF v_alert.id IS NULL THEN
    RAISE EXCEPTION 'Alerta no encontrada';
  END IF;

  IF NOT security.is_active_organization(v_alert.organization_id) THEN
    RAISE EXCEPTION 'La organización no está activa';
  END IF;

  IF NOT (security.has_current_org_role(v_alert.organization_id, ARRAY['organization_owner']) OR security.is_current_assigned_nutritionist(v_alert.patient_id)) THEN
    RAISE EXCEPTION 'No autorizado para gestionar esta alerta';
  END IF;

  IF v_alert.status = 'acknowledged' THEN
    RAISE EXCEPTION 'La alerta ya ha sido reconocida previamente';
  END IF;

  IF v_alert.status = 'resolved' THEN
    RAISE EXCEPTION 'La alerta ya ha sido resuelta previamente';
  END IF;

  IF v_alert.status != 'unresolved' THEN
    RAISE EXCEPTION 'La alerta no está en estado unresolved';
  END IF;

  UPDATE app.alerts
  SET status = 'acknowledged', acknowledged_by = auth.uid(), acknowledged_at = NOW()
  WHERE id = p_alert_id AND status = 'unresolved';

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE EXCEPTION 'No se pudo actualizar el estado de la alerta';
  END IF;

  INSERT INTO app.audit_logs (actor_id, organization_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), v_alert.organization_id, 'ACKNOWLEDGE_ALERT', 'alert', p_alert_id, '{}'::jsonb);

  RETURN true;
END;
$$;

-- 4. HARDENING DE api.resolve_alert (RPC-06)
CREATE OR REPLACE FUNCTION api.resolve_alert(p_alert_id uuid, p_notes text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_alert app.alerts%ROWTYPE;
  v_rows integer;
BEGIN
  SELECT * INTO v_alert FROM app.alerts WHERE id = p_alert_id FOR UPDATE;

  IF v_alert.id IS NULL THEN
    RAISE EXCEPTION 'Alerta no encontrada';
  END IF;

  IF NOT security.is_active_organization(v_alert.organization_id) THEN
    RAISE EXCEPTION 'La organización no está activa';
  END IF;

  IF NOT (security.has_current_org_role(v_alert.organization_id, ARRAY['organization_owner']) OR security.is_current_assigned_nutritionist(v_alert.patient_id)) THEN
    RAISE EXCEPTION 'No autorizado para resolver esta alerta';
  END IF;

  IF v_alert.status = 'resolved' THEN
    RAISE EXCEPTION 'La alerta ya ha sido resuelta previamente';
  END IF;

  IF v_alert.status NOT IN ('unresolved', 'acknowledged') THEN
    RAISE EXCEPTION 'Estado de alerta no válido para resolver';
  END IF;

  UPDATE app.alerts
  SET status = 'resolved', resolved_by = auth.uid(), resolved_at = NOW(), resolution_notes = p_notes
  WHERE id = p_alert_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE EXCEPTION 'No se pudo resolver la alerta';
  END IF;

  INSERT INTO app.audit_logs (actor_id, organization_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), v_alert.organization_id, 'RESOLVE_ALERT', 'alert', p_alert_id, '{}'::jsonb);

  RETURN true;
END;
$$;

-- 5. HARDENING DE api.set_organization_status (RPC-07)
CREATE OR REPLACE FUNCTION api.set_organization_status(p_org_id uuid, p_status text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rows integer;
BEGIN
  IF NOT security.is_current_platform_admin() THEN
    RAISE EXCEPTION 'Acceso no autorizado: requiere rol platform_admin';
  END IF;

  IF p_status NOT IN ('active', 'suspended') THEN
    RAISE EXCEPTION 'Estado no válido';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM app.organizations WHERE id = p_org_id FOR UPDATE) THEN
    RAISE EXCEPTION 'Organización no encontrada';
  END IF;

  UPDATE app.organizations
  SET status = p_status
  WHERE id = p_org_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE EXCEPTION 'No se pudo actualizar el estado de la organización';
  END IF;

  INSERT INTO app.audit_logs (actor_id, organization_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), p_org_id, 'SET_ORGANIZATION_STATUS', 'organization', p_org_id, jsonb_build_object('status', p_status));

  RETURN true;
END;
$$;

-- 6. HARDENING DE api.create_recommendation (REC-04, REC-05, REC-06, REC-07, RPC-10)
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
  IF NOT security.is_active_organization(p_org_id) THEN
    RAISE EXCEPTION 'La organización no está activa';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM app.patients WHERE id = p_patient_id AND organization_id = p_org_id) THEN
    RAISE EXCEPTION 'El paciente no pertenece a la organización especificada';
  END IF;

  IF NOT (security.has_current_org_role(p_org_id, ARRAY['organization_owner']) OR security.is_current_assigned_nutritionist(p_patient_id)) THEN
    RAISE EXCEPTION 'No autorizado para emitir recomendaciones a este paciente';
  END IF;

  IF p_text IS NULL OR trim(p_text) = '' THEN
    RAISE EXCEPTION 'El texto de la recomendación no puede estar vacío';
  END IF;

  IF p_response_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM app.check_in_responses
      WHERE id = p_response_id
        AND patient_id = p_patient_id
        AND organization_id = p_org_id
    ) THEN
      RAISE EXCEPTION 'La respuesta de check-in especificada no existe o no pertenece al paciente u organización';
    END IF;
  END IF;

  INSERT INTO app.patient_recommendations (organization_id, patient_id, response_id, created_by, recommendation_text, status)
  VALUES (p_org_id, p_patient_id, p_response_id, auth.uid(), p_text, 'published')
  RETURNING id INTO v_rec_id;

  INSERT INTO app.audit_logs (actor_id, organization_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), p_org_id, 'CREATE_RECOMMENDATION', 'patient_recommendation', v_rec_id, '{}'::jsonb);

  RETURN v_rec_id;
END;
$$;

-- 7. HARDENING DE api.assign_check_in (RPC-08)
CREATE OR REPLACE FUNCTION api.assign_check_in(p_org_id uuid, p_patient_id uuid, p_due_date timestamptz DEFAULT (NOW() + INTERVAL '7 days'))
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_assignment_id uuid;
BEGIN
  IF NOT security.is_active_organization(p_org_id) THEN
    RAISE EXCEPTION 'La organización no está activa';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM app.patients WHERE id = p_patient_id AND organization_id = p_org_id) THEN
    RAISE EXCEPTION 'El paciente no pertenece a la organización especificada';
  END IF;

  IF NOT (security.has_current_org_role(p_org_id, ARRAY['organization_owner']) OR security.is_current_assigned_nutritionist(p_patient_id)) THEN
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

-- 8. HARDENING DE api.create_patient (RPC-09)
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
  IF p_first_name IS NULL OR trim(p_first_name) = '' OR p_last_name IS NULL OR trim(p_last_name) = '' THEN
    RAISE EXCEPTION 'El nombre y apellido del paciente son obligatorios';
  END IF;

  IF NOT security.is_active_organization(p_org_id) THEN
    RAISE EXCEPTION 'La organización no está activa';
  END IF;

  IF NOT (security.has_current_org_role(p_org_id, ARRAY['organization_owner', 'nutritionist'])) THEN
    RAISE EXCEPTION 'Acceso no autorizado para crear pacientes en la organización';
  END IF;

  INSERT INTO app.patients (organization_id, first_name, last_name, email, phone, nutrition_goal, status, created_by)
  VALUES (p_org_id, trim(p_first_name), trim(p_last_name), p_email, p_phone, p_goal, 'active', auth.uid())
  RETURNING id INTO v_patient_id;

  INSERT INTO app.patient_assignments (organization_id, patient_id, nutritionist_user_id, is_primary, status)
  VALUES (p_org_id, v_patient_id, auth.uid(), true, 'active');

  INSERT INTO app.audit_logs (actor_id, organization_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), p_org_id, 'CREATE_PATIENT', 'patient', v_patient_id, '{}'::jsonb);

  RETURN v_patient_id;
END;
$$;
