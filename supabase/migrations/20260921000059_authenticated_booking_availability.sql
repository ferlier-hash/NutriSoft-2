-- Disponibilidad y solicitud autenticada de citas.
-- Google Calendar sólo aporta intervalos ocupados; nunca se persiste contenido del evento.
CREATE TABLE app.google_calendar_busy_intervals (
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  nutritionist_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calendar_id text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  synced_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (organization_id, nutritionist_user_id, calendar_id, starts_at, ends_at),
  CHECK (ends_at > starts_at)
);
CREATE INDEX idx_google_busy_lookup ON app.google_calendar_busy_intervals(nutritionist_user_id, starts_at, ends_at);
ALTER TABLE app.google_calendar_busy_intervals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app.google_calendar_busy_intervals FROM authenticated, anon;

CREATE FUNCTION api.replace_google_calendar_busy_intervals_for_service(
  p_organization_id uuid, p_nutritionist_user_id uuid, p_calendar_id text,
  p_intervals jsonb
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item jsonb; count_inserted integer := 0;
BEGIN
  IF auth.role() <> 'service_role' OR nullif(trim(p_calendar_id),'') IS NULL OR jsonb_typeof(p_intervals) <> 'array' THEN RAISE EXCEPTION 'Sin autorización o intervalos inválidos'; END IF;
  DELETE FROM app.google_calendar_busy_intervals WHERE organization_id=p_organization_id AND nutritionist_user_id=p_nutritionist_user_id AND calendar_id=trim(p_calendar_id);
  FOR item IN SELECT value FROM jsonb_array_elements(p_intervals) LOOP
    IF (item->>'startsAt')::timestamptz >= (item->>'endsAt')::timestamptz THEN RAISE EXCEPTION 'Intervalo ocupado inválido'; END IF;
    INSERT INTO app.google_calendar_busy_intervals(organization_id,nutritionist_user_id,calendar_id,starts_at,ends_at)
      VALUES(p_organization_id,p_nutritionist_user_id,trim(p_calendar_id),(item->>'startsAt')::timestamptz,(item->>'endsAt')::timestamptz);
    count_inserted := count_inserted + 1;
  END LOOP;
  UPDATE app.google_calendar_connections SET last_synced_at=clock_timestamp(),last_error_code=NULL
    WHERE organization_id=p_organization_id AND nutritionist_user_id=p_nutritionist_user_id AND disconnected_at IS NULL;
  RETURN count_inserted;
END; $$;

CREATE FUNCTION api.request_patient_appointment(
  p_starts_at timestamptz, p_duration_minutes smallint, p_modality text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_patient uuid; v_org uuid; v_nutri uuid; v_zone text; v_currency text; v_id uuid; v_ends timestamptz;
BEGIN
  SELECT p.id,p.organization_id,pa.nutritionist_user_id INTO v_patient,v_org,v_nutri
  FROM app.patients p JOIN app.patient_portal_access ppa ON ppa.patient_id=p.id AND ppa.organization_id=p.organization_id AND ppa.user_id=auth.uid()
  JOIN app.patient_assignments pa ON pa.organization_id=p.organization_id AND pa.patient_id=p.id AND pa.is_primary AND pa.status='active'
  WHERE ppa.status='active' AND p.status='active' LIMIT 1;
  IF v_patient IS NULL THEN RAISE EXCEPTION 'No tenés una ficha activa habilitada para reservar.'; END IF;
  IF p_starts_at IS NULL OR p_starts_at <= clock_timestamp() OR p_duration_minutes NOT IN (15,30,45,60,75,90) OR p_modality NOT IN ('virtual','in_person') THEN RAISE EXCEPTION 'Horario o modalidad inválidos.'; END IF;
  v_ends := p_starts_at + make_interval(mins=>p_duration_minutes);
  SELECT coalesce(s.settings->>'timeZone','America/Argentina/Cordoba'),coalesce(pr.default_currency,'ARS') INTO v_zone,v_currency
  FROM app.professional_practice_settings pr LEFT JOIN app.professional_schedule_settings s ON s.organization_id=pr.organization_id AND s.nutritionist_user_id=pr.nutritionist_user_id
  WHERE pr.organization_id=v_org AND pr.nutritionist_user_id=v_nutri;
  IF EXISTS(SELECT 1 FROM app.google_calendar_busy_intervals b WHERE b.organization_id=v_org AND b.nutritionist_user_id=v_nutri AND tstzrange(p_starts_at,v_ends,'[)') && tstzrange(b.starts_at,b.ends_at,'[)')) THEN RAISE EXCEPTION 'Ese horario ya no está disponible.'; END IF;
  INSERT INTO app.appointments(organization_id,patient_id,nutritionist_user_id,starts_at,ends_at,time_zone,duration_minutes,modality,status,quoted_amount,currency,created_by)
    VALUES(v_org,v_patient,v_nutri,p_starts_at,v_ends,coalesce(v_zone,'America/Argentina/Cordoba'),p_duration_minutes,p_modality,'requested',0,coalesce(v_currency,'ARS'),auth.uid()) RETURNING id INTO v_id;
  INSERT INTO app.appointment_notifications(organization_id,appointment_id,recipient_user_id,kind) VALUES(v_org,v_id,v_nutri,'appointment_created');
  INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details) VALUES(auth.uid(),v_org,'REQUEST_PATIENT_APPOINTMENT','appointment',v_id,jsonb_build_object('modality',p_modality,'duration_minutes',p_duration_minutes));
  RETURN v_id;
END; $$;

CREATE FUNCTION api.get_patient_appointment_slots(p_duration_minutes smallint DEFAULT 45)
RETURNS TABLE(starts_at timestamptz, ends_at timestamptz, modality_virtual boolean, modality_in_person boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
WITH patient_professional AS (
  SELECT p.organization_id,pa.nutritionist_user_id
  FROM app.patients p JOIN app.patient_portal_access ppa ON ppa.patient_id=p.id AND ppa.organization_id=p.organization_id AND ppa.user_id=auth.uid() AND ppa.status='active'
  JOIN app.patient_assignments pa ON pa.organization_id=p.organization_id AND pa.patient_id=p.id AND pa.is_primary AND pa.status='active'
  WHERE p.status='active' LIMIT 1
), config AS (
  SELECT pp.*,coalesce(s.settings->>'timeZone','America/Argentina/Cordoba') AS zone,s.settings
  FROM patient_professional pp LEFT JOIN app.professional_schedule_settings s ON s.organization_id=pp.organization_id AND s.nutritionist_user_id=pp.nutritionist_user_id
), candidates AS (
  SELECT ((d::date + (slot->>'start')::time) AT TIME ZONE c.zone) + (n * make_interval(mins => p_duration_minutes + coalesce((c.settings->>'gapMinutes')::int,0))) AS starts_at,c.organization_id,c.nutritionist_user_id,c.settings
  FROM config c CROSS JOIN generate_series(current_date+1,current_date+21,'1 day') d
  CROSS JOIN LATERAL jsonb_array_elements(coalesce(c.settings->'intervals','[]'::jsonb)) slot
  CROSS JOIN LATERAL generate_series(0,100) n
  WHERE (slot->>'day')::int=extract(dow FROM d)::int
    AND ((d::date + (slot->>'start')::time) + (n * make_interval(mins => p_duration_minutes + coalesce((c.settings->>'gapMinutes')::int,0))) + make_interval(mins=>p_duration_minutes)) <= (d::date + (slot->>'end')::time)
), bounded AS (
  SELECT c.starts_at,c.starts_at+make_interval(mins=>p_duration_minutes) ends_at,c.organization_id,c.nutritionist_user_id,c.settings FROM candidates c WHERE c.starts_at>clock_timestamp()
)
SELECT b.starts_at,b.ends_at,true,true FROM bounded b
WHERE NOT EXISTS (SELECT 1 FROM app.appointments a WHERE a.nutritionist_user_id=b.nutritionist_user_id AND a.status IN ('requested','confirmed') AND tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(a.starts_at,a.ends_at,'[)'))
AND NOT EXISTS (SELECT 1 FROM app.google_calendar_busy_intervals g WHERE g.organization_id=b.organization_id AND g.nutritionist_user_id=b.nutritionist_user_id AND tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(g.starts_at,g.ends_at,'[)'))
AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(b.settings->'blocks','[]'::jsonb)) block WHERE tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange((block->>'startsAt')::timestamptz,(block->>'endsAt')::timestamptz,'[)'))
ORDER BY b.starts_at;
$$;
REVOKE ALL ON FUNCTION api.replace_google_calendar_busy_intervals_for_service(uuid,uuid,text,jsonb),api.request_patient_appointment(timestamptz,smallint,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION api.replace_google_calendar_busy_intervals_for_service(uuid,uuid,text,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION api.request_patient_appointment(timestamptz,smallint,text),api.get_patient_appointment_slots(smallint) TO authenticated;
