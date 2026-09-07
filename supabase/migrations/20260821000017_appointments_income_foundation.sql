-- Migration: 20260821000017_appointments_income_foundation.sql
-- Description: Núcleo seguro de Agenda, Citas e Ingresos. NutriSoft es la fuente de verdad.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- La configuración es contextual: una misma profesional puede trabajar con una moneda
-- distinta en cada consultorio. No guarda tokens de Google ni secretos externos.
CREATE TABLE app.professional_practice_settings (
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  nutritionist_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  default_currency text NOT NULL DEFAULT 'ARS'
    CHECK (default_currency IN ('ARS', 'CLP', 'BRL', 'USD', 'MXN', 'COP', 'PEN', 'EUR', 'UYU')),
  selected_google_calendar_id text NULL CHECK (selected_google_calendar_id IS NULL OR char_length(trim(selected_google_calendar_id)) <= 255),
  google_calendar_label text NULL CHECK (google_calendar_label IS NULL OR char_length(trim(google_calendar_label)) <= 120),
  google_connection_status text NOT NULL DEFAULT 'not_connected'
    CHECK (google_connection_status IN ('not_connected', 'connected', 'error')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, nutritionist_user_id),
  CONSTRAINT fk_professional_practice_member FOREIGN KEY (organization_id, nutritionist_user_id)
    REFERENCES app.organization_members(organization_id, user_id) ON DELETE CASCADE
);
CREATE TRIGGER trg_professional_practice_settings_updated_at
  BEFORE UPDATE ON app.professional_practice_settings FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE TABLE app.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE RESTRICT,
  patient_id uuid NOT NULL,
  nutritionist_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  time_zone text NOT NULL DEFAULT 'America/Argentina/Cordoba' CHECK (char_length(trim(time_zone)) BETWEEN 1 AND 64),
  duration_minutes smallint NOT NULL CHECK (duration_minutes IN (15, 30, 45, 60, 75, 90)),
  modality text NOT NULL CHECK (modality IN ('in_person', 'virtual')),
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'confirmed', 'completed', 'cancelled_by_patient', 'cancelled_by_professional', 'rescheduled', 'no_show')),
  quoted_amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (quoted_amount >= 0),
  currency text NOT NULL CHECK (currency IN ('ARS', 'CLP', 'BRL', 'USD', 'MXN', 'COP', 'PEN', 'EUR', 'UYU')),
  billing_disposition text NOT NULL DEFAULT 'chargeable' CHECK (billing_disposition IN ('chargeable', 'no_charge')),
  virtual_meeting_url text NULL CHECK (virtual_meeting_url IS NULL OR char_length(trim(virtual_meeting_url)) <= 2048),
  google_calendar_event_id text NULL CHECK (google_calendar_event_id IS NULL OR char_length(trim(google_calendar_event_id)) <= 255),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_appointments_org_id UNIQUE (organization_id, id),
  CONSTRAINT ck_appointments_interval CHECK (ends_at > starts_at AND ends_at = starts_at + make_interval(mins => duration_minutes)),
  CONSTRAINT fk_appointments_patient FOREIGN KEY (organization_id, patient_id)
    REFERENCES app.patients(organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_appointments_nutritionist_member FOREIGN KEY (organization_id, nutritionist_user_id)
    REFERENCES app.organization_members(organization_id, user_id) ON DELETE RESTRICT,
  CONSTRAINT ex_appointments_no_overlapping_schedule EXCLUDE USING gist (
    nutritionist_user_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (status IN ('requested', 'confirmed'))
);
CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON app.appointments FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE INDEX idx_appointments_professional_time ON app.appointments(organization_id, nutritionist_user_id, starts_at DESC);
CREATE INDEX idx_appointments_patient_time ON app.appointments(organization_id, patient_id, starts_at DESC);
CREATE INDEX idx_appointments_open_billing ON app.appointments(organization_id, starts_at DESC) WHERE billing_disposition = 'chargeable';

-- Contenido clínico aislado del registro operativo de turnos.
CREATE TABLE app.appointment_private_notes (
  appointment_id uuid PRIMARY KEY REFERENCES app.appointments(id) ON DELETE RESTRICT,
  organization_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  nutritionist_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  note text NOT NULL CHECK (char_length(trim(note)) BETWEEN 1 AND 5000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_appointment_private_notes_appointment FOREIGN KEY (organization_id, appointment_id)
    REFERENCES app.appointments(organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_appointment_private_notes_patient FOREIGN KEY (organization_id, patient_id)
    REFERENCES app.patients(organization_id, id) ON DELETE RESTRICT
);
CREATE TRIGGER trg_appointment_private_notes_updated_at
  BEFORE UPDATE ON app.appointment_private_notes FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- El dinero nunca se procesa: estos son sólo movimientos manuales inmutables.
CREATE TABLE app.appointment_payment_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  appointment_id uuid NOT NULL,
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL CHECK (currency IN ('ARS', 'CLP', 'BRL', 'USD', 'MXN', 'COP', 'PEN', 'EUR', 'UYU')),
  movement_kind text NOT NULL CHECK (movement_kind IN ('payment', 'refund')),
  method text NOT NULL CHECK (method IN ('cash', 'transfer', 'other')),
  note text NULL CHECK (note IS NULL OR char_length(trim(note)) <= 500),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_appointment_payment_movement_appointment FOREIGN KEY (organization_id, appointment_id)
    REFERENCES app.appointments(organization_id, id) ON DELETE RESTRICT
);
CREATE INDEX idx_appointment_payment_movements_appointment ON app.appointment_payment_movements(appointment_id, occurred_at DESC);
CREATE INDEX idx_appointment_payment_movements_income ON app.appointment_payment_movements(organization_id, occurred_at DESC) WHERE movement_kind = 'payment';

CREATE TABLE app.appointment_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE RESTRICT,
  appointment_id uuid NOT NULL REFERENCES app.appointments(id) ON DELETE RESTRICT,
  recipient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  kind text NOT NULL CHECK (kind IN ('appointment_created', 'appointment_cancelled', 'appointment_rescheduled', 'billing_decision_needed')),
  read_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_appointment_notifications_recipient ON app.appointment_notifications(recipient_user_id, read_at, created_at DESC);

-- Nunca permitir modificar el contenido ni borrar un movimiento. Las correcciones son compensatorias.
CREATE OR REPLACE FUNCTION app.prevent_appointment_payment_movement_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'Los movimientos de cobro son inmutables; registrá un movimiento compensatorio';
END;
$$;
CREATE TRIGGER trg_appointment_payment_movements_immutable
  BEFORE UPDATE OR DELETE ON app.appointment_payment_movements
  FOR EACH STATEMENT EXECUTE FUNCTION app.prevent_appointment_payment_movement_mutation();

CREATE OR REPLACE FUNCTION security.can_current_manage_appointment(p_appointment_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM app.appointments a
    WHERE a.id = p_appointment_id
      AND (
        security.has_current_org_role(a.organization_id, ARRAY['organization_owner', 'assistant'])
        OR (a.nutritionist_user_id = auth.uid() AND security.is_current_assigned_nutritionist(a.patient_id))
      )
  );
$$;
REVOKE EXECUTE ON FUNCTION security.can_current_manage_appointment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION security.can_current_manage_appointment(uuid) TO authenticated, service_role;

ALTER TABLE app.professional_practice_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.appointment_private_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.appointment_payment_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.appointment_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY professional_practice_settings_select_own ON app.professional_practice_settings FOR SELECT TO authenticated
  USING (nutritionist_user_id = auth.uid() AND security.is_current_active_org_member(organization_id));
CREATE POLICY appointments_select_operational_scope ON app.appointments FOR SELECT TO authenticated
  USING (security.can_current_manage_appointment(id) OR security.has_current_patient_portal_access(patient_id));
CREATE POLICY appointment_private_notes_select_clinical_scope ON app.appointment_private_notes FOR SELECT TO authenticated
  USING (nutritionist_user_id = auth.uid() AND security.is_current_assigned_nutritionist(patient_id));
CREATE POLICY appointment_payment_movements_select_operational_scope ON app.appointment_payment_movements FOR SELECT TO authenticated
  USING (security.can_current_manage_appointment(appointment_id));
CREATE POLICY appointment_notifications_select_recipient ON app.appointment_notifications FOR SELECT TO authenticated
  USING (recipient_user_id = auth.uid());

GRANT SELECT ON app.professional_practice_settings, app.appointments, app.appointment_private_notes,
  app.appointment_payment_movements, app.appointment_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.professional_practice_settings, app.appointments, app.appointment_private_notes,
  app.appointment_payment_movements, app.appointment_notifications TO service_role;
REVOKE INSERT, UPDATE, DELETE ON app.professional_practice_settings, app.appointments, app.appointment_private_notes,
  app.appointment_payment_movements, app.appointment_notifications FROM authenticated;

-- Estado de pago derivado, conservando pagos parciales y reembolsos como movimientos.
CREATE VIEW api.appointments
WITH (security_invoker = true) AS
SELECT
  a.id, a.organization_id, a.patient_id, a.nutritionist_user_id, a.starts_at, a.ends_at, a.time_zone,
  a.duration_minutes, a.modality, a.status, a.quoted_amount, a.currency, a.billing_disposition,
  a.virtual_meeting_url, a.created_at, a.updated_at,
  coalesce(m.total_paid, 0)::numeric(12,2) AS total_paid,
  CASE
    WHEN a.billing_disposition = 'no_charge' THEN 'no_charge'
    WHEN coalesce(m.total_refunded, 0) > 0 AND coalesce(m.total_paid, 0) - coalesce(m.total_refunded, 0) <= 0 THEN 'refunded'
    WHEN coalesce(m.total_paid, 0) - coalesce(m.total_refunded, 0) >= a.quoted_amount AND a.quoted_amount > 0 THEN 'paid'
    WHEN coalesce(m.total_paid, 0) - coalesce(m.total_refunded, 0) > 0 THEN 'partial'
    ELSE 'pending'
  END AS payment_status
FROM app.appointments a
LEFT JOIN LATERAL (
  SELECT
    sum(amount) FILTER (WHERE movement_kind = 'payment') AS total_paid,
    sum(amount) FILTER (WHERE movement_kind = 'refund') AS total_refunded
  FROM app.appointment_payment_movements pm WHERE pm.appointment_id = a.id
) m ON true;

CREATE VIEW api.professional_appointment_notes
WITH (security_invoker = true) AS
SELECT appointment_id, organization_id, patient_id, nutritionist_user_id, note, created_at, updated_at
FROM app.appointment_private_notes;

CREATE VIEW api.patient_recent_appointments
WITH (security_invoker = true) AS
SELECT id, organization_id, patient_id, nutritionist_user_id, starts_at, ends_at, time_zone, modality, status, payment_status
FROM (
  SELECT a.*, row_number() OVER (PARTITION BY patient_id, nutritionist_user_id ORDER BY starts_at DESC) AS ordinal
  FROM api.appointments a
) recent
WHERE ordinal <= 5;

CREATE VIEW api.appointment_income_summary
WITH (security_invoker = true) AS
SELECT
  a.organization_id, a.nutritionist_user_id, pm.currency,
  coalesce(sum(pm.amount) FILTER (WHERE pm.movement_kind = 'payment'), 0)::numeric(12,2) AS collected_amount,
  coalesce(sum(pm.amount) FILTER (WHERE pm.movement_kind = 'refund'), 0)::numeric(12,2) AS refunded_amount,
  count(*) FILTER (WHERE pm.movement_kind = 'payment')::integer AS payment_count
FROM app.appointments a
LEFT JOIN app.appointment_payment_movements pm ON pm.appointment_id = a.id
GROUP BY a.organization_id, a.nutritionist_user_id, pm.currency;

GRANT SELECT ON api.appointments, api.professional_appointment_notes, api.patient_recent_appointments,
  api.appointment_income_summary TO authenticated;

CREATE OR REPLACE FUNCTION api.create_appointment(
  p_org_id uuid, p_patient_id uuid, p_nutritionist_user_id uuid, p_starts_at timestamptz,
  p_duration_minutes smallint, p_time_zone text, p_modality text, p_quoted_amount numeric,
  p_currency text, p_private_note text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id uuid; v_ends_at timestamptz; v_note text := nullif(trim(p_private_note), '');
BEGIN
  IF p_duration_minutes NOT IN (15, 30, 45, 60, 75, 90) OR p_modality NOT IN ('in_person', 'virtual')
     OR p_currency NOT IN ('ARS', 'CLP', 'BRL', 'USD', 'MXN', 'COP', 'PEN', 'EUR', 'UYU')
     OR p_quoted_amount IS NULL OR p_quoted_amount < 0 OR nullif(trim(p_time_zone), '') IS NULL THEN
    RAISE EXCEPTION 'Los datos de la cita no son válidos';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM app.patients WHERE id = p_patient_id AND organization_id = p_org_id AND status = 'active')
     OR NOT EXISTS (SELECT 1 FROM app.patient_assignments WHERE organization_id = p_org_id AND patient_id = p_patient_id AND nutritionist_user_id = p_nutritionist_user_id AND status = 'active') THEN
    RAISE EXCEPTION 'Paciente o profesional no vinculados activamente';
  END IF;
  IF NOT (security.has_current_org_role(p_org_id, ARRAY['organization_owner', 'assistant'])
    OR (p_nutritionist_user_id = auth.uid() AND security.is_current_assigned_nutritionist(p_patient_id))) THEN
    RAISE EXCEPTION 'No autorizado para agendar esta cita';
  END IF;
  IF v_note IS NOT NULL AND p_nutritionist_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Sólo el profesional asignado puede crear notas privadas';
  END IF;
  v_ends_at := p_starts_at + make_interval(mins => p_duration_minutes);
  INSERT INTO app.appointments (organization_id, patient_id, nutritionist_user_id, starts_at, ends_at, time_zone, duration_minutes, modality, quoted_amount, currency, created_by)
  VALUES (p_org_id, p_patient_id, p_nutritionist_user_id, p_starts_at, v_ends_at, trim(p_time_zone), p_duration_minutes, p_modality, p_quoted_amount, p_currency, auth.uid())
  RETURNING id INTO v_id;
  IF v_note IS NOT NULL THEN
    INSERT INTO app.appointment_private_notes (appointment_id, organization_id, patient_id, nutritionist_user_id, note)
    VALUES (v_id, p_org_id, p_patient_id, p_nutritionist_user_id, v_note);
  END IF;
  INSERT INTO app.audit_logs (actor_id, organization_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), p_org_id, 'CREATE_APPOINTMENT', 'appointment', v_id, jsonb_build_object('patient_id', p_patient_id, 'nutritionist_user_id', p_nutritionist_user_id, 'modality', p_modality));
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION api.record_appointment_payment(
  p_appointment_id uuid, p_amount numeric, p_method text, p_occurred_at timestamptz DEFAULT now(), p_note text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_appointment app.appointments%ROWTYPE; v_id uuid;
BEGIN
  SELECT * INTO v_appointment FROM app.appointments WHERE id = p_appointment_id FOR UPDATE;
  IF v_appointment.id IS NULL OR NOT security.can_current_manage_appointment(v_appointment.id) THEN RAISE EXCEPTION 'Cita no encontrada o sin permisos'; END IF;
  IF v_appointment.billing_disposition = 'no_charge' OR p_amount IS NULL OR p_amount <= 0 OR p_method NOT IN ('cash', 'transfer', 'other') THEN
    RAISE EXCEPTION 'El movimiento de cobro no es válido';
  END IF;
  IF p_note IS NOT NULL AND char_length(trim(p_note)) > 500 THEN RAISE EXCEPTION 'La nota supera 500 caracteres'; END IF;
  INSERT INTO app.appointment_payment_movements (organization_id, appointment_id, amount, currency, movement_kind, method, note, occurred_at, recorded_by)
  VALUES (v_appointment.organization_id, v_appointment.id, p_amount, v_appointment.currency, 'payment', p_method, nullif(trim(p_note), ''), p_occurred_at, auth.uid()) RETURNING id INTO v_id;
  INSERT INTO app.audit_logs (actor_id, organization_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), v_appointment.organization_id, 'RECORD_APPOINTMENT_PAYMENT', 'appointment_payment_movement', v_id, jsonb_build_object('appointment_id', v_appointment.id, 'movement_kind', 'payment'));
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION api.resolve_appointment_billing(
  p_appointment_id uuid, p_decision text, p_amount numeric DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_appointment app.appointments%ROWTYPE;
BEGIN
  SELECT * INTO v_appointment FROM app.appointments WHERE id = p_appointment_id FOR UPDATE;
  IF v_appointment.id IS NULL OR NOT (v_appointment.nutritionist_user_id = auth.uid() AND security.is_current_assigned_nutritionist(v_appointment.patient_id)) THEN
    RAISE EXCEPTION 'Cita no encontrada o sin permisos clínicos';
  END IF;
  IF v_appointment.status NOT IN ('cancelled_by_patient', 'cancelled_by_professional', 'no_show') THEN RAISE EXCEPTION 'Esta cita no requiere resolver un cobro por cancelación o ausencia'; END IF;
  IF p_decision = 'no_charge' THEN
    UPDATE app.appointments SET billing_disposition = 'no_charge' WHERE id = v_appointment.id;
  ELSIF p_decision IN ('pending', 'partial_extra') AND p_amount IS NOT NULL AND p_amount >= 0 THEN
    UPDATE app.appointments SET billing_disposition = 'chargeable', quoted_amount = p_amount WHERE id = v_appointment.id;
  ELSE
    RAISE EXCEPTION 'La resolución de cobro no es válida';
  END IF;
  INSERT INTO app.audit_logs (actor_id, organization_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), v_appointment.organization_id, 'RESOLVE_APPOINTMENT_BILLING', 'appointment', v_appointment.id, jsonb_build_object('decision', p_decision));
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION api.mark_appointment_notification_read(p_notification_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE app.appointment_notifications SET read_at = coalesce(read_at, now())
  WHERE id = p_notification_id AND recipient_user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Notificación no encontrada'; END IF;
  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION api.create_appointment(uuid, uuid, uuid, timestamptz, smallint, text, text, numeric, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION api.record_appointment_payment(uuid, numeric, text, timestamptz, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION api.resolve_appointment_billing(uuid, text, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION api.mark_appointment_notification_read(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.create_appointment(uuid, uuid, uuid, timestamptz, smallint, text, text, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION api.record_appointment_payment(uuid, numeric, text, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION api.resolve_appointment_billing(uuid, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION api.mark_appointment_notification_read(uuid) TO authenticated;

COMMENT ON TABLE app.appointment_private_notes IS 'Contenido clínico privado: sólo lo ve el profesional asignado activo.';
COMMENT ON TABLE app.appointment_payment_movements IS 'Registro manual inmutable; NutriSoft no procesa dinero.';
