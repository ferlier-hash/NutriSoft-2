-- Revalidate public-to-patient booking requests against the same live slots shown by the UI.
CREATE OR REPLACE FUNCTION api.request_patient_appointment(
  p_organization_id uuid, p_starts_at timestamptz, p_duration_minutes smallint, p_modality text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_patient uuid; v_nutri uuid; v_zone text; v_currency text; v_id uuid; v_ends timestamptz;
BEGIN
  SELECT p.id,pa.nutritionist_user_id INTO v_patient,v_nutri
  FROM app.patients p
  JOIN app.patient_portal_access ppa ON ppa.patient_id=p.id AND ppa.organization_id=p.organization_id AND ppa.user_id=auth.uid() AND ppa.status='active'
  JOIN app.patient_assignments pa ON pa.organization_id=p.organization_id AND pa.patient_id=p.id AND pa.is_primary AND pa.status='active'
  JOIN app.organization_members m ON m.organization_id=pa.organization_id AND m.user_id=pa.nutritionist_user_id AND m.role='nutritionist' AND m.status='active'
  WHERE ppa.organization_id=p_organization_id AND p.status='active' AND security.has_current_patient_portal_access(p.id)
    AND NOT security.is_current_platform_admin() AND NOT security.is_platform_account_suspended(pa.nutritionist_user_id)
  LIMIT 1;
  IF v_patient IS NULL THEN RAISE EXCEPTION 'No tenés una ficha activa habilitada en ese consultorio.'; END IF;
  IF p_starts_at IS NULL OR p_starts_at<=clock_timestamp() OR p_duration_minutes NOT IN (15,30,45,60,75,90) OR p_modality NOT IN ('virtual','in_person') THEN RAISE EXCEPTION 'Horario o modalidad inválidos.'; END IF;

  -- A client must not be able to bypass schedule hours, blocks or current bookings by calling the RPC directly.
  IF NOT EXISTS (
    SELECT 1 FROM api.get_patient_appointment_slots(p_organization_id,p_duration_minutes) slot
    WHERE slot.starts_at=p_starts_at
  ) THEN RAISE EXCEPTION 'Ese horario ya no está disponible.'; END IF;

  v_ends:=p_starts_at+make_interval(mins=>p_duration_minutes);
  SELECT coalesce(s.settings->>'timeZone','America/Argentina/Cordoba'),coalesce(pr.default_currency,'ARS') INTO v_zone,v_currency
  FROM app.professional_practice_settings pr LEFT JOIN app.professional_schedule_settings s ON s.organization_id=pr.organization_id AND s.nutritionist_user_id=pr.nutritionist_user_id
  WHERE pr.organization_id=p_organization_id AND pr.nutritionist_user_id=v_nutri;
  IF EXISTS(SELECT 1 FROM app.google_calendar_busy_intervals b WHERE b.organization_id=p_organization_id AND b.nutritionist_user_id=v_nutri AND tstzrange(p_starts_at,v_ends,'[)')&&tstzrange(b.starts_at,b.ends_at,'[)')) THEN RAISE EXCEPTION 'Ese horario ya no está disponible.'; END IF;
  INSERT INTO app.appointments(organization_id,patient_id,nutritionist_user_id,starts_at,ends_at,time_zone,duration_minutes,modality,status,quoted_amount,currency,created_by)
  VALUES(p_organization_id,v_patient,v_nutri,p_starts_at,v_ends,coalesce(v_zone,'America/Argentina/Cordoba'),p_duration_minutes,p_modality,'requested',0,coalesce(v_currency,'ARS'),auth.uid()) RETURNING id INTO v_id;
  INSERT INTO app.appointment_notifications(organization_id,appointment_id,recipient_user_id,kind) VALUES(p_organization_id,v_id,v_nutri,'appointment_created');
  INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details) VALUES(auth.uid(),p_organization_id,'REQUEST_PATIENT_APPOINTMENT','appointment',v_id,jsonb_build_object('modality',p_modality,'duration_minutes',p_duration_minutes));
  RETURN v_id;
END; $$;

REVOKE ALL ON FUNCTION api.request_patient_appointment(uuid,timestamptz,smallint,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION api.request_patient_appointment(uuid,timestamptz,smallint,text) TO authenticated;
NOTIFY pgrst,'reload schema';
