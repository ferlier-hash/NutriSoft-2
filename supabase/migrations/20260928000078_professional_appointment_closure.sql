-- Cierre del flujo REAL de reservas autenticadas y notas privadas de consulta.
-- El consultorio es siempre explícito para evitar elegirlo de forma ambigua.
DROP FUNCTION IF EXISTS api.request_patient_appointment(timestamptz,smallint,text);
DROP FUNCTION IF EXISTS api.get_patient_appointment_slots(smallint);

CREATE FUNCTION api.request_patient_appointment(
  p_organization_id uuid, p_starts_at timestamptz, p_duration_minutes smallint, p_modality text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_patient uuid; v_nutri uuid; v_zone text; v_currency text; v_id uuid; v_ends timestamptz;
BEGIN
  SELECT p.id,pa.nutritionist_user_id INTO v_patient,v_nutri
  FROM app.patients p
  JOIN app.patient_portal_access ppa ON ppa.patient_id=p.id AND ppa.organization_id=p.organization_id AND ppa.user_id=auth.uid() AND ppa.status='active'
  JOIN app.patient_assignments pa ON pa.organization_id=p.organization_id AND pa.patient_id=p.id AND pa.is_primary AND pa.status='active'
  JOIN app.organization_members m ON m.organization_id=pa.organization_id AND m.user_id=pa.nutritionist_user_id AND m.role='nutritionist' AND m.status='active'
  WHERE ppa.organization_id=p_organization_id AND p.status='active'
    AND security.has_current_patient_portal_access(p.id) AND NOT security.is_current_platform_admin()
    AND NOT security.is_platform_account_suspended(pa.nutritionist_user_id)
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

CREATE FUNCTION api.get_patient_appointment_slots(p_organization_id uuid,p_duration_minutes smallint DEFAULT 45)
RETURNS TABLE(starts_at timestamptz,ends_at timestamptz,modality_virtual boolean,modality_in_person boolean,time_zone text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
WITH patient_professional AS (
 SELECT p.organization_id,pa.nutritionist_user_id
 FROM app.patients p JOIN app.patient_portal_access ppa ON ppa.patient_id=p.id AND ppa.organization_id=p.organization_id AND ppa.user_id=auth.uid() AND ppa.status='active'
 JOIN app.patient_assignments pa ON pa.organization_id=p.organization_id AND pa.patient_id=p.id AND pa.is_primary AND pa.status='active'
 JOIN app.organization_members m ON m.organization_id=pa.organization_id AND m.user_id=pa.nutritionist_user_id AND m.role='nutritionist' AND m.status='active'
 WHERE ppa.organization_id=p_organization_id AND p.status='active' AND security.has_current_patient_portal_access(p.id) AND NOT security.is_current_platform_admin() AND NOT security.is_platform_account_suspended(pa.nutritionist_user_id)
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
AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(b.settings->'blocks','[]'::jsonb)) block WHERE tstzrange(b.starts_at,b.ends_at,'[)')&&tstzrange((block->>'startsAt')::timestamptz,(block->>'endsAt')::timestamptz,'[)')) ORDER BY b.starts_at;
$$;

ALTER TABLE app.appointment_notifications DROP CONSTRAINT IF EXISTS appointment_notifications_kind_check;
ALTER TABLE app.appointment_notifications ADD CONSTRAINT appointment_notifications_kind_check CHECK(kind IN('appointment_created','appointment_confirmed','appointment_cancelled','appointment_rescheduled','billing_decision_needed'));

CREATE FUNCTION api.confirm_patient_requested_appointment(p_appointment_id uuid,p_quoted_amount numeric DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a app.appointments%ROWTYPE;
BEGIN
 SELECT * INTO a FROM app.appointments WHERE id=p_appointment_id FOR UPDATE;
 IF a.id IS NULL OR a.nutritionist_user_id<>auth.uid() OR NOT security.is_current_assigned_nutritionist(a.patient_id) THEN RAISE EXCEPTION 'Solicitud no encontrada o sin permisos'; END IF;
 IF a.status<>'requested' THEN RAISE EXCEPTION 'Sólo se pueden confirmar solicitudes pendientes'; END IF;
 IF p_quoted_amount IS NOT NULL AND (p_quoted_amount<0 OR p_quoted_amount>9999999999.99) THEN RAISE EXCEPTION 'Importe inválido'; END IF;
 UPDATE app.appointments SET status='confirmed',quoted_amount=coalesce(p_quoted_amount,quoted_amount),updated_at=clock_timestamp() WHERE id=a.id;
 INSERT INTO app.appointment_notifications(organization_id,appointment_id,recipient_user_id,kind)
 SELECT a.organization_id,a.id,ppa.user_id,'appointment_confirmed' FROM app.patient_portal_access ppa WHERE ppa.patient_id=a.patient_id AND ppa.organization_id=a.organization_id AND ppa.status='active';
 INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details) VALUES(auth.uid(),a.organization_id,'CONFIRM_PATIENT_APPOINTMENT','appointment',a.id,jsonb_build_object('quoted_amount',coalesce(p_quoted_amount,a.quoted_amount)));
 RETURN a.id;
END; $$;

CREATE FUNCTION api.save_appointment_private_note(p_appointment_id uuid,p_note text,p_expected_updated_at timestamptz DEFAULT NULL)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a app.appointments%ROWTYPE; n app.appointment_private_notes%ROWTYPE; v_note text:=nullif(trim(p_note),'');
BEGIN
 SELECT * INTO a FROM app.appointments WHERE id=p_appointment_id;
 IF a.id IS NULL OR a.nutritionist_user_id<>auth.uid() OR NOT security.is_current_assigned_nutritionist(a.patient_id) THEN RAISE EXCEPTION 'Cita no encontrada o sin permisos'; END IF;
 IF v_note IS NULL OR char_length(v_note)>5000 THEN RAISE EXCEPTION 'La nota debe tener entre 1 y 5000 caracteres'; END IF;
 SELECT * INTO n FROM app.appointment_private_notes WHERE appointment_id=a.id FOR UPDATE;
 IF n.appointment_id IS NULL AND p_expected_updated_at IS NOT NULL THEN RAISE EXCEPTION 'La nota cambió. Actualizá y volvé a intentar'; END IF;
 IF n.appointment_id IS NOT NULL AND n.updated_at IS DISTINCT FROM p_expected_updated_at THEN RAISE EXCEPTION 'La nota cambió. Actualizá y volvé a intentar'; END IF;
 INSERT INTO app.appointment_private_notes(appointment_id,organization_id,patient_id,nutritionist_user_id,note)
 VALUES(a.id,a.organization_id,a.patient_id,a.nutritionist_user_id,v_note)
 ON CONFLICT(appointment_id) DO UPDATE SET note=excluded.note,updated_at=clock_timestamp();
 INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details) VALUES(auth.uid(),a.organization_id,CASE WHEN n.appointment_id IS NULL THEN 'CREATE_APPOINTMENT_PRIVATE_NOTE' ELSE 'UPDATE_APPOINTMENT_PRIVATE_NOTE' END,'appointment',a.id,'{}'::jsonb);
 RETURN clock_timestamp();
END; $$;

REVOKE ALL ON FUNCTION api.request_patient_appointment(uuid,timestamptz,smallint,text),api.get_patient_appointment_slots(uuid,smallint),api.confirm_patient_requested_appointment(uuid,numeric),api.save_appointment_private_note(uuid,text,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION api.request_patient_appointment(uuid,timestamptz,smallint,text),api.get_patient_appointment_slots(uuid,smallint),api.confirm_patient_requested_appointment(uuid,numeric),api.save_appointment_private_note(uuid,text,timestamptz) TO authenticated;
NOTIFY pgrst,'reload schema';
