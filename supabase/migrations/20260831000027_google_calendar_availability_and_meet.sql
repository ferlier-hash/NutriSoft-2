-- Google Calendar: la ocupación externa bloquea disponibilidad sin importar contenido,
-- y los enlaces Meet sólo se conservan para citas virtuales confirmadas.

ALTER TABLE app.appointments
  ADD COLUMN IF NOT EXISTS google_calendar_conflict_detected_at timestamptz NULL;

DROP FUNCTION IF EXISTS api.get_appointment_for_google_sync(uuid);
CREATE FUNCTION api.get_appointment_for_google_sync(p_appointment_id uuid)
RETURNS TABLE(
  appointment_id uuid, organization_id uuid, nutritionist_user_id uuid,
  starts_at timestamptz, ends_at timestamptz, time_zone text, modality text,
  status text, google_calendar_event_id text, virtual_meeting_url text,
  selected_google_calendar_id text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT a.id, a.organization_id, a.nutritionist_user_id, a.starts_at, a.ends_at,
    a.time_zone, a.modality, a.status, a.google_calendar_event_id,
    a.virtual_meeting_url, s.selected_google_calendar_id
  FROM app.appointments a
  JOIN app.professional_practice_settings s
    ON s.organization_id = a.organization_id
   AND s.nutritionist_user_id = a.nutritionist_user_id
  WHERE a.id = p_appointment_id
    AND a.nutritionist_user_id = auth.uid()
    AND security.is_current_assigned_nutritionist(a.patient_id);
$$;

CREATE OR REPLACE FUNCTION api.set_google_calendar_sync_result_for_service(
  p_appointment_id uuid,
  p_google_calendar_event_id text DEFAULT NULL,
  p_virtual_meeting_url text DEFAULT NULL,
  p_has_external_conflict boolean DEFAULT false
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'No autorizado'; END IF;
  UPDATE app.appointments
  SET google_calendar_event_id = nullif(trim(p_google_calendar_event_id), ''),
      virtual_meeting_url = CASE WHEN modality = 'virtual' THEN nullif(trim(p_virtual_meeting_url), '') ELSE NULL END,
      google_calendar_conflict_detected_at = CASE WHEN p_has_external_conflict THEN now() ELSE NULL END
  WHERE id = p_appointment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cita no encontrada'; END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE VIEW api.appointments
WITH (security_invoker = true) AS
SELECT a.id, a.organization_id, a.patient_id, a.nutritionist_user_id, a.starts_at,
  a.ends_at, a.time_zone, a.duration_minutes, a.modality, a.status, a.quoted_amount,
  a.currency, a.billing_disposition, a.virtual_meeting_url, a.created_at, a.updated_at,
  coalesce(m.total_paid, 0)::numeric(12,2) AS total_paid,
  CASE
    WHEN a.billing_disposition = 'no_charge' THEN 'no_charge'
    WHEN coalesce(m.total_refunded, 0) > 0 AND coalesce(m.total_paid, 0) - coalesce(m.total_refunded, 0) <= 0 THEN 'refunded'
    WHEN coalesce(m.total_paid, 0) - coalesce(m.total_refunded, 0) >= a.quoted_amount AND a.quoted_amount > 0 THEN 'paid'
    WHEN coalesce(m.total_paid, 0) - coalesce(m.total_refunded, 0) > 0 THEN 'partial'
    ELSE 'pending'
  END AS payment_status,
  a.google_calendar_conflict_detected_at
FROM app.appointments a
LEFT JOIN LATERAL (
  SELECT sum(amount) FILTER (WHERE movement_kind = 'payment') AS total_paid,
    sum(amount) FILTER (WHERE movement_kind = 'refund') AS total_refunded
  FROM app.appointment_payment_movements m WHERE m.appointment_id = a.id
) m ON true;

REVOKE ALL ON FUNCTION api.get_appointment_for_google_sync(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION api.set_google_calendar_sync_result_for_service(uuid,text,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.get_appointment_for_google_sync(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION api.set_google_calendar_sync_result_for_service(uuid,text,text,boolean) TO service_role;
NOTIFY pgrst, 'reload schema';
