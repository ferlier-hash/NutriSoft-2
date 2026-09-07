-- Agenda real: NutriSoft conserva la fuente de verdad; Google es una proyección externa.

ALTER TABLE app.appointments
  ADD COLUMN IF NOT EXISTS rescheduled_from_appointment_id uuid NULL REFERENCES app.appointments(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_appointments_rescheduled_from ON app.appointments(rescheduled_from_appointment_id) WHERE rescheduled_from_appointment_id IS NOT NULL;

CREATE OR REPLACE FUNCTION api.create_professional_appointment(
  p_org_id uuid, p_patient_id uuid, p_starts_at timestamptz, p_duration_minutes smallint,
  p_time_zone text, p_modality text, p_quoted_amount numeric, p_currency text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id uuid; v_ends_at timestamptz;
BEGIN
  IF p_duration_minutes NOT IN (15, 30, 45, 60, 75, 90) OR p_modality NOT IN ('in_person', 'virtual')
    OR p_currency NOT IN ('ARS', 'CLP', 'BRL', 'USD', 'MXN', 'COP', 'PEN', 'EUR', 'UYU')
    OR p_quoted_amount IS NULL OR p_quoted_amount < 0 OR nullif(trim(p_time_zone), '') IS NULL THEN
    RAISE EXCEPTION 'Los datos de la cita no son válidos';
  END IF;
  IF NOT security.is_current_assigned_nutritionist(p_patient_id)
    OR NOT EXISTS (SELECT 1 FROM app.patients WHERE id = p_patient_id AND organization_id = p_org_id AND status = 'active') THEN
    RAISE EXCEPTION 'No podés agendar para este paciente';
  END IF;
  v_ends_at := p_starts_at + make_interval(mins => p_duration_minutes);
  INSERT INTO app.appointments (organization_id, patient_id, nutritionist_user_id, starts_at, ends_at, time_zone, duration_minutes, modality, status, quoted_amount, currency, created_by)
  VALUES (p_org_id, p_patient_id, auth.uid(), p_starts_at, v_ends_at, trim(p_time_zone), p_duration_minutes, p_modality, 'confirmed', p_quoted_amount, p_currency, auth.uid())
  RETURNING id INTO v_id;
  INSERT INTO app.audit_logs (actor_id, organization_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), p_org_id, 'CREATE_PROFESSIONAL_APPOINTMENT', 'appointment', v_id, jsonb_build_object('modality', p_modality));
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION api.update_professional_appointment(
  p_appointment_id uuid, p_starts_at timestamptz, p_duration_minutes smallint,
  p_modality text, p_quoted_amount numeric
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v app.appointments%ROWTYPE;
BEGIN
  SELECT * INTO v FROM app.appointments WHERE id = p_appointment_id FOR UPDATE;
  IF v.id IS NULL OR v.nutritionist_user_id <> auth.uid() OR NOT security.is_current_assigned_nutritionist(v.patient_id) THEN RAISE EXCEPTION 'Cita no encontrada o sin permisos'; END IF;
  IF v.status NOT IN ('requested', 'confirmed') THEN RAISE EXCEPTION 'Sólo se pueden editar citas activas'; END IF;
  IF p_duration_minutes NOT IN (15,30,45,60,75,90) OR p_modality NOT IN ('in_person','virtual') OR p_quoted_amount IS NULL OR p_quoted_amount < 0 THEN RAISE EXCEPTION 'Los datos de la cita no son válidos'; END IF;
  UPDATE app.appointments SET starts_at = p_starts_at, ends_at = p_starts_at + make_interval(mins => p_duration_minutes), duration_minutes = p_duration_minutes, modality = p_modality, quoted_amount = p_quoted_amount WHERE id = v.id;
  INSERT INTO app.audit_logs (actor_id, organization_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), v.organization_id, 'UPDATE_PROFESSIONAL_APPOINTMENT', 'appointment', v.id, '{}'::jsonb);
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION api.cancel_professional_appointment(p_appointment_id uuid, p_billing_decision text, p_amount numeric DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v app.appointments%ROWTYPE;
BEGIN
  SELECT * INTO v FROM app.appointments WHERE id = p_appointment_id FOR UPDATE;
  IF v.id IS NULL OR v.nutritionist_user_id <> auth.uid() OR NOT security.is_current_assigned_nutritionist(v.patient_id) THEN RAISE EXCEPTION 'Cita no encontrada o sin permisos'; END IF;
  IF v.status NOT IN ('requested','confirmed') THEN RAISE EXCEPTION 'Sólo se pueden cancelar citas activas'; END IF;
  IF p_billing_decision NOT IN ('no_charge','pending') OR (p_billing_decision = 'pending' AND (p_amount IS NULL OR p_amount < 0)) THEN RAISE EXCEPTION 'Definí cómo resolver el cobro antes de cancelar'; END IF;
  UPDATE app.appointments SET status = 'cancelled_by_professional', billing_disposition = CASE WHEN p_billing_decision = 'no_charge' THEN 'no_charge' ELSE 'chargeable' END, quoted_amount = CASE WHEN p_billing_decision = 'pending' THEN p_amount ELSE quoted_amount END WHERE id = v.id;
  INSERT INTO app.appointment_notifications (organization_id, appointment_id, recipient_user_id, kind) SELECT v.organization_id, v.id, user_id, 'appointment_cancelled' FROM app.patient_portal_access WHERE patient_id = v.patient_id;
  INSERT INTO app.audit_logs (actor_id, organization_id, action, resource_type, resource_id, details) VALUES (auth.uid(), v.organization_id, 'CANCEL_PROFESSIONAL_APPOINTMENT', 'appointment', v.id, jsonb_build_object('billing_decision', p_billing_decision));
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION api.reschedule_professional_appointment(
  p_appointment_id uuid, p_starts_at timestamptz, p_duration_minutes smallint, p_modality text, p_quoted_amount numeric
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v app.appointments%ROWTYPE; v_id uuid;
BEGIN
  SELECT * INTO v FROM app.appointments WHERE id = p_appointment_id FOR UPDATE;
  IF v.id IS NULL OR v.nutritionist_user_id <> auth.uid() OR NOT security.is_current_assigned_nutritionist(v.patient_id) THEN RAISE EXCEPTION 'Cita no encontrada o sin permisos'; END IF;
  IF v.status NOT IN ('requested','confirmed') THEN RAISE EXCEPTION 'Sólo se pueden reprogramar citas activas'; END IF;
  IF p_duration_minutes NOT IN (15,30,45,60,75,90) OR p_modality NOT IN ('in_person','virtual') OR p_quoted_amount IS NULL OR p_quoted_amount < 0 THEN RAISE EXCEPTION 'Los datos de la cita no son válidos'; END IF;
  UPDATE app.appointments SET status = 'rescheduled' WHERE id = v.id;
  INSERT INTO app.appointments (organization_id, patient_id, nutritionist_user_id, starts_at, ends_at, time_zone, duration_minutes, modality, status, quoted_amount, currency, created_by, rescheduled_from_appointment_id)
  VALUES (v.organization_id, v.patient_id, v.nutritionist_user_id, p_starts_at, p_starts_at + make_interval(mins => p_duration_minutes), v.time_zone, p_duration_minutes, p_modality, 'confirmed', p_quoted_amount, v.currency, auth.uid(), v.id) RETURNING id INTO v_id;
  INSERT INTO app.appointment_notifications (organization_id, appointment_id, recipient_user_id, kind) SELECT v.organization_id, v_id, user_id, 'appointment_rescheduled' FROM app.patient_portal_access WHERE patient_id = v.patient_id;
  INSERT INTO app.audit_logs (actor_id, organization_id, action, resource_type, resource_id, details) VALUES (auth.uid(), v.organization_id, 'RESCHEDULE_PROFESSIONAL_APPOINTMENT', 'appointment', v.id, jsonb_build_object('new_appointment_id', v_id));
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION api.get_appointment_for_google_sync(p_appointment_id uuid)
RETURNS TABLE(appointment_id uuid, organization_id uuid, nutritionist_user_id uuid, starts_at timestamptz, ends_at timestamptz, time_zone text, modality text, status text, google_calendar_event_id text, selected_google_calendar_id text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT a.id, a.organization_id, a.nutritionist_user_id, a.starts_at, a.ends_at, a.time_zone, a.modality, a.status, a.google_calendar_event_id, s.selected_google_calendar_id
  FROM app.appointments a JOIN app.professional_practice_settings s ON s.organization_id=a.organization_id AND s.nutritionist_user_id=a.nutritionist_user_id
  WHERE a.id=p_appointment_id AND a.nutritionist_user_id=auth.uid() AND security.is_current_assigned_nutritionist(a.patient_id);
$$;

CREATE OR REPLACE FUNCTION api.set_google_calendar_event_for_service(p_appointment_id uuid, p_google_calendar_event_id text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'No autorizado'; END IF;
  UPDATE app.appointments SET google_calendar_event_id = nullif(trim(p_google_calendar_event_id), '') WHERE id=p_appointment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cita no encontrada'; END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION api.create_professional_appointment(uuid,uuid,timestamptz,smallint,text,text,numeric,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION api.update_professional_appointment(uuid,timestamptz,smallint,text,numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION api.cancel_professional_appointment(uuid,text,numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION api.reschedule_professional_appointment(uuid,timestamptz,smallint,text,numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION api.get_appointment_for_google_sync(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION api.set_google_calendar_event_for_service(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.create_professional_appointment(uuid,uuid,timestamptz,smallint,text,text,numeric,text), api.update_professional_appointment(uuid,timestamptz,smallint,text,numeric), api.cancel_professional_appointment(uuid,text,numeric), api.reschedule_professional_appointment(uuid,timestamptz,smallint,text,numeric), api.get_appointment_for_google_sync(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION api.set_google_calendar_event_for_service(uuid,text) TO service_role;
