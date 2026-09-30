-- Hardening follow-up: deny Platform Admin clinical paths and return booking TZ for exact display.
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

DROP FUNCTION api.get_patient_appointment_slots(uuid,smallint);
CREATE FUNCTION api.get_patient_appointment_slots(p_organization_id uuid,p_duration_minutes smallint DEFAULT 45)
RETURNS TABLE(starts_at timestamptz,ends_at timestamptz,modality_virtual boolean,modality_in_person boolean,time_zone text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
WITH patient_professional AS (
 SELECT p.organization_id,pa.nutritionist_user_id
 FROM app.patients p JOIN app.patient_portal_access ppa ON ppa.patient_id=p.id AND ppa.organization_id=p.organization_id AND ppa.user_id=auth.uid() AND ppa.status='active'
 JOIN app.patient_assignments pa ON pa.organization_id=p.organization_id AND pa.patient_id=p.id AND pa.is_primary AND pa.status='active'
 JOIN app.organization_members m ON m.organization_id=pa.organization_id AND m.user_id=pa.nutritionist_user_id AND m.role='nutritionist' AND m.status='active'
 WHERE ppa.organization_id=p_organization_id AND p.status='active' AND security.has_current_patient_portal_access(p.id)
   AND NOT security.is_current_platform_admin() AND NOT security.is_platform_account_suspended(pa.nutritionist_user_id)
), config AS (
 SELECT pp.*,coalesce(s.settings->>'timeZone','America/Argentina/Cordoba') zone,s.settings
 FROM patient_professional pp LEFT JOIN app.professional_schedule_settings s ON s.organization_id=pp.organization_id AND s.nutritionist_user_id=pp.nutritionist_user_id
), candidates AS (
 SELECT (((d::date+(slot->>'start')::time) AT TIME ZONE c.zone)+(n*make_interval(mins=>p_duration_minutes+coalesce((c.settings->>'gapMinutes')::int,0)))) starts_at,c.organization_id,c.nutritionist_user_id,c.settings,c.zone
 FROM config c CROSS JOIN generate_series((clock_timestamp() AT TIME ZONE c.zone)::date+1,(clock_timestamp() AT TIME ZONE c.zone)::date+21,'1 day') d
 CROSS JOIN LATERAL jsonb_array_elements(coalesce(c.settings->'intervals','[]'::jsonb)) slot CROSS JOIN LATERAL generate_series(0,100) n
 WHERE p_duration_minutes IN (15,30,45,60,75,90) AND (slot->>'day')::int=extract(dow FROM d)::int
  AND (d::date+(slot->>'start')::time+(n*make_interval(mins=>p_duration_minutes+coalesce((c.settings->>'gapMinutes')::int,0)))+make_interval(mins=>p_duration_minutes)) <= (d::date+(slot->>'end')::time)
), bounded AS (SELECT c.starts_at,c.starts_at+make_interval(mins=>p_duration_minutes) ends_at,c.organization_id,c.nutritionist_user_id,c.settings,c.zone FROM candidates c WHERE c.starts_at>clock_timestamp())
SELECT b.starts_at,b.ends_at,true,true,b.zone FROM bounded b
WHERE NOT EXISTS(SELECT 1 FROM app.appointments a WHERE a.nutritionist_user_id=b.nutritionist_user_id AND a.status IN('requested','confirmed') AND tstzrange(b.starts_at,b.ends_at,'[)')&&tstzrange(a.starts_at,a.ends_at,'[)'))
 AND NOT EXISTS(SELECT 1 FROM app.google_calendar_busy_intervals g WHERE g.organization_id=b.organization_id AND g.nutritionist_user_id=b.nutritionist_user_id AND tstzrange(b.starts_at,b.ends_at,'[)')&&tstzrange(g.starts_at,g.ends_at,'[)'))
 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(b.settings->'blocks','[]'::jsonb)) block WHERE tstzrange(b.starts_at,b.ends_at,'[)')&&tstzrange((block->>'startsAt')::timestamptz,(block->>'endsAt')::timestamptz,'[)'))
ORDER BY b.starts_at;
$$;
REVOKE ALL ON FUNCTION api.request_patient_appointment(uuid,timestamptz,smallint,text),api.get_patient_appointment_slots(uuid,smallint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION api.request_patient_appointment(uuid,timestamptz,smallint,text),api.get_patient_appointment_slots(uuid,smallint) TO authenticated;
NOTIFY pgrst,'reload schema';
