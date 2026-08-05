-- Migration: 20260805000011_phase_2_1_1_check_in_and_api_hardening.sql
-- Description: Índice único parcial para assignments pendientes, validación estricta de fechas y reducción de campos en vistas API (CHECKIN-01..09, API-01..06)

-- 1. Índice único parcial para concurrencia de asignaciones pendientes (CHECKIN-02, CHECKIN-03)
CREATE UNIQUE INDEX uq_pending_checkin_assignment
  ON app.check_in_assignments (organization_id, patient_id)
  WHERE status = 'pending';

-- 2. Hardening de api.assign_check_in (CHECKIN-04..08)
CREATE OR REPLACE FUNCTION api.assign_check_in(
  p_org_id uuid,
  p_patient_id uuid,
  p_due_date timestamptz DEFAULT (NOW() + INTERVAL '7 days')
)
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

  IF NOT EXISTS (SELECT 1 FROM app.patients WHERE id = p_patient_id AND organization_id = p_org_id AND status = 'active') THEN
    RAISE EXCEPTION 'El paciente no pertenece a la organización especificada o no está activo';
  END IF;

  IF NOT (security.has_current_org_role(p_org_id, ARRAY['organization_owner']) OR security.is_current_assigned_nutritionist(p_patient_id)) THEN
    RAISE EXCEPTION 'Acceso no autorizado para asignar check-in a este paciente';
  END IF;

  IF p_due_date IS NOT NULL AND p_due_date <= NOW() THEN
    RAISE EXCEPTION 'La fecha de vencimiento debe ser posterior a la fecha actual';
  END IF;

  IF EXISTS (SELECT 1 FROM app.check_in_assignments WHERE organization_id = p_org_id AND patient_id = p_patient_id AND status = 'pending') THEN
    RAISE EXCEPTION 'Ya existe una asignación de check-in pendiente para este paciente';
  END IF;

  BEGIN
    INSERT INTO app.check_in_assignments (organization_id, patient_id, created_by, status, due_date)
    VALUES (p_org_id, p_patient_id, auth.uid(), 'pending', p_due_date)
    RETURNING id INTO v_assignment_id;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'Ya existe una asignación de check-in pendiente para este paciente';
  END;

  -- Audit log solo tras inserción exitosa (CHECKIN-08)
  INSERT INTO app.audit_logs (actor_id, organization_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), p_org_id, 'ASSIGN_CHECK_IN', 'check_in_assignment', v_assignment_id, '{}'::jsonb);

  RETURN v_assignment_id;
END;
$$;

-- 3. Reducción de campos en vistas API (API-02, API-03, API-04)
CREATE OR REPLACE VIEW api.check_in_assignments
WITH (security_invoker = true) AS
SELECT id, organization_id, patient_id, status, due_date, created_at, completed_at
FROM app.check_in_assignments;

GRANT SELECT ON api.check_in_assignments TO authenticated;

CREATE OR REPLACE VIEW api.patient_recommendations
WITH (security_invoker = true) AS
SELECT id, organization_id, patient_id, response_id, recommendation_text, status, created_at
FROM app.patient_recommendations;

GRANT SELECT ON api.patient_recommendations TO authenticated;
