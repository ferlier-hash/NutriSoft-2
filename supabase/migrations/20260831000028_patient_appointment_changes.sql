-- Solicitudes del paciente: nunca modifican la cita original por sí solas.
CREATE TABLE app.patient_appointment_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE RESTRICT,
  appointment_id uuid NOT NULL REFERENCES app.appointments(id) ON DELETE RESTRICT,
  patient_id uuid NOT NULL,
  nutritionist_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  kind text NOT NULL CHECK (kind IN ('cancel', 'reschedule')),
  requested_starts_at timestamptz NULL,
  requested_duration_minutes smallint NULL CHECK (requested_duration_minutes IN (15,30,45,60,75,90)),
  requested_modality text NULL CHECK (requested_modality IN ('virtual', 'in_person')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz NULL,
  CONSTRAINT fk_patient_change_request_patient FOREIGN KEY (organization_id, patient_id) REFERENCES app.patients(organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT ck_patient_change_request_payload CHECK ((kind = 'cancel' AND requested_starts_at IS NULL AND requested_duration_minutes IS NULL AND requested_modality IS NULL) OR (kind = 'reschedule' AND requested_starts_at IS NOT NULL AND requested_duration_minutes IS NOT NULL AND requested_modality IS NOT NULL))
);
CREATE UNIQUE INDEX uq_pending_patient_appointment_change ON app.patient_appointment_change_requests(appointment_id) WHERE status = 'pending';
ALTER TABLE app.patient_appointment_change_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY patient_change_requests_select_scope ON app.patient_appointment_change_requests FOR SELECT TO authenticated USING (security.has_current_patient_portal_access(patient_id) OR (nutritionist_user_id = auth.uid() AND security.is_current_assigned_nutritionist(patient_id)));
GRANT SELECT ON app.patient_appointment_change_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.patient_appointment_change_requests TO service_role;

CREATE VIEW api.patient_appointments WITH (security_invoker = true) AS
SELECT a.id, a.starts_at, a.ends_at, a.time_zone, a.duration_minutes, a.modality, a.status,
  CASE WHEN a.modality = 'virtual' AND a.status = 'confirmed' THEN a.virtual_meeting_url ELSE NULL END AS virtual_meeting_url,
  EXISTS (SELECT 1 FROM app.patient_appointment_change_requests r WHERE r.appointment_id = a.id AND r.status = 'pending') AS has_pending_change
FROM app.appointments a
WHERE security.has_current_patient_portal_access(a.patient_id);

CREATE OR REPLACE FUNCTION api.request_patient_appointment_change(
  p_appointment_id uuid, p_kind text, p_requested_starts_at timestamptz DEFAULT NULL,
  p_requested_duration_minutes smallint DEFAULT NULL, p_requested_modality text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v app.appointments%ROWTYPE; v_id uuid;
BEGIN
  SELECT * INTO v FROM app.appointments WHERE id = p_appointment_id FOR UPDATE;
  IF v.id IS NULL OR NOT security.has_current_patient_portal_access(v.patient_id) THEN RAISE EXCEPTION 'Cita no encontrada o sin permisos'; END IF;
  IF v.status <> 'confirmed' OR v.starts_at <= now() THEN RAISE EXCEPTION 'Sólo podés solicitar cambios en citas confirmadas futuras'; END IF;
  IF p_kind NOT IN ('cancel','reschedule') THEN RAISE EXCEPTION 'Solicitud inválida'; END IF;
  IF p_kind = 'reschedule' AND (p_requested_starts_at IS NULL OR p_requested_starts_at <= now() OR p_requested_duration_minutes NOT IN (15,30,45,60,75,90) OR p_requested_modality NOT IN ('virtual','in_person')) THEN RAISE EXCEPTION 'Elegí un nuevo horario futuro válido'; END IF;
  IF EXISTS (SELECT 1 FROM app.patient_appointment_change_requests WHERE appointment_id = v.id AND status = 'pending') THEN RAISE EXCEPTION 'Ya hay una solicitud pendiente para esta cita'; END IF;
  INSERT INTO app.patient_appointment_change_requests (organization_id, appointment_id, patient_id, nutritionist_user_id, kind, requested_starts_at, requested_duration_minutes, requested_modality)
  VALUES (v.organization_id, v.id, v.patient_id, v.nutritionist_user_id, p_kind, CASE WHEN p_kind='reschedule' THEN p_requested_starts_at END, CASE WHEN p_kind='reschedule' THEN p_requested_duration_minutes END, CASE WHEN p_kind='reschedule' THEN p_requested_modality END) RETURNING id INTO v_id;
  INSERT INTO app.audit_logs(actor_id, organization_id, action, resource_type, resource_id, details) VALUES (auth.uid(), v.organization_id, 'REQUEST_PATIENT_APPOINTMENT_CHANGE', 'appointment_change_request', v_id, jsonb_build_object('appointment_id', v.id, 'kind', p_kind));
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION api.request_patient_appointment_change(uuid,text,timestamptz,smallint,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.request_patient_appointment_change(uuid,text,timestamptz,smallint,text) TO authenticated;
NOTIFY pgrst, 'reload schema';
