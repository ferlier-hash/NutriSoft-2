-- Availability is opt-in: existing appointments and unconfigured practices remain unchanged.
CREATE TABLE app.professional_schedule_settings (
 organization_id uuid NOT NULL REFERENCES app.organizations(id),
 nutritionist_user_id uuid NOT NULL REFERENCES auth.users(id),
 settings jsonb NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(organization_id,nutritionist_user_id),
 FOREIGN KEY(organization_id,nutritionist_user_id) REFERENCES app.organization_members(organization_id,user_id)
);
ALTER TABLE app.professional_schedule_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app.professional_schedule_settings FROM anon,authenticated;

CREATE FUNCTION api.get_my_schedule_settings(p_org uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF security.is_current_platform_admin() OR NOT security.has_current_org_role(p_org,ARRAY['nutritionist']) THEN RAISE EXCEPTION 'Configuración no autorizada.'; END IF;
 SELECT jsonb_build_object('settings',settings,'updated_at',updated_at) INTO result FROM app.professional_schedule_settings WHERE organization_id=p_org AND nutritionist_user_id=auth.uid();
 RETURN coalesce(result,jsonb_build_object('settings',NULL,'updated_at',NULL));
END; $$;

CREATE FUNCTION api.save_my_schedule_settings(p_org uuid,p_settings jsonb,p_expected timestamptz DEFAULT NULL) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE prior app.professional_schedule_settings; slot jsonb; block jsonb; stamp timestamptz; zone text;
BEGIN
 IF security.is_current_platform_admin() OR NOT security.has_current_org_role(p_org,ARRAY['nutritionist']) THEN RAISE EXCEPTION 'Configuración no autorizada.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('schedule:'||auth.uid()::text,0));
 SELECT * INTO prior FROM app.professional_schedule_settings WHERE organization_id=p_org AND nutritionist_user_id=auth.uid() FOR UPDATE;
 IF prior.updated_at IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'La configuración cambió. Recargá antes de guardar.'; END IF;
 IF p_settings IS NULL OR jsonb_typeof(p_settings)<>'object' OR NOT p_settings ?& ARRAY['timeZone','enforceHours','intervals','blocks','gapMinutes','cancellationNoticeHours','rescheduleNoticeHours'] THEN RAISE EXCEPTION 'Configuración incompleta.'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(p_settings) k WHERE k NOT IN ('timeZone','enforceHours','intervals','blocks','gapMinutes','cancellationNoticeHours','rescheduleNoticeHours')) OR jsonb_typeof(p_settings->'gapMinutes')<>'number' OR jsonb_typeof(p_settings->'cancellationNoticeHours')<>'number' OR jsonb_typeof(p_settings->'rescheduleNoticeHours')<>'number' THEN RAISE EXCEPTION 'Formato de configuración inválido.'; END IF;
 zone:=p_settings->>'timeZone';
 IF NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=zone) OR jsonb_typeof(p_settings->'enforceHours')<>'boolean'
 OR coalesce(p_settings->>'gapMinutes','') NOT IN ('0','5','10','15','20','30')
 OR coalesce(p_settings->>'cancellationNoticeHours','') NOT IN ('0','2','6','12','24','48','72')
 OR coalesce(p_settings->>'rescheduleNoticeHours','') NOT IN ('0','2','6','12','24','48','72') THEN RAISE EXCEPTION 'Revisá zona horaria, pausas y plazos.'; END IF;
 IF jsonb_typeof(p_settings->'intervals')<>'array' OR jsonb_typeof(p_settings->'blocks')<>'array' THEN RAISE EXCEPTION 'Franjas o bloqueos inválidos.'; END IF;
 IF jsonb_array_length(p_settings->'intervals')>42 OR jsonb_array_length(p_settings->'blocks')>200 THEN RAISE EXCEPTION 'Máximo 42 franjas y 200 bloqueos.'; END IF;
 IF (p_settings->>'enforceHours')::boolean AND jsonb_array_length(p_settings->'intervals')=0 THEN RAISE EXCEPTION 'Agregá al menos una franja de atención.'; END IF;
 FOR slot IN SELECT value FROM jsonb_array_elements(p_settings->'intervals') LOOP
  IF jsonb_typeof(slot->'day') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Día de atención inválido.'; END IF;
  IF coalesce(slot->>'day','') !~ '^[0-6]$' OR coalesce(slot->>'start','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' OR coalesce(slot->>'end','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' OR slot->>'start'>=slot->>'end' THEN RAISE EXCEPTION 'Cada franja debe empezar antes de terminar, dentro del mismo día.'; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_settings->'intervals') WITH ORDINALITY a(v,i),jsonb_array_elements(p_settings->'intervals') WITH ORDINALITY b(v,i) WHERE a.i<b.i AND a.v->>'day'=b.v->>'day' AND a.v->>'start'<b.v->>'end' AND b.v->>'start'<a.v->>'end') THEN RAISE EXCEPTION 'Hay franjas de atención superpuestas.'; END IF;
 FOR block IN SELECT value FROM jsonb_array_elements(p_settings->'blocks') LOOP
  IF coalesce(block->>'kind','') NOT IN ('block','vacation') OR coalesce(block->>'startsAt','') !~ '(Z|[+-][0-9]{2}:[0-9]{2})$' OR coalesce(block->>'endsAt','') !~ '(Z|[+-][0-9]{2}:[0-9]{2})$' OR char_length(coalesce(block->>'note',''))>300 THEN RAISE EXCEPTION 'Bloqueo inválido.'; END IF;
  IF (block->>'startsAt')::timestamptz >= (block->>'endsAt')::timestamptz THEN RAISE EXCEPTION 'El bloqueo debe terminar después de empezar.'; END IF;
  IF EXISTS(SELECT 1 FROM app.appointments a WHERE a.organization_id=p_org AND a.nutritionist_user_id=auth.uid() AND a.status IN ('requested','confirmed') AND tstzrange(a.starts_at,a.ends_at,'[)') && tstzrange((block->>'startsAt')::timestamptz,(block->>'endsAt')::timestamptz,'[)')) THEN RAISE EXCEPTION 'El bloqueo coincide con una cita activa. Resolvé esa cita primero.'; END IF;
 END LOOP;
 INSERT INTO app.professional_schedule_settings VALUES(p_org,auth.uid(),p_settings,clock_timestamp()) ON CONFLICT(organization_id,nutritionist_user_id) DO UPDATE SET settings=excluded.settings,updated_at=excluded.updated_at RETURNING updated_at INTO stamp;
 INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details) VALUES(auth.uid(),p_org,'UPDATE_SCHEDULE_SETTINGS','professional_schedule',p_org,jsonb_build_object('interval_count',jsonb_array_length(p_settings->'intervals'),'block_count',jsonb_array_length(p_settings->'blocks')));
 RETURN stamp;
END; $$;

CREATE FUNCTION security.validate_scheduled_appointment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE config jsonb; local_start timestamp; local_end timestamp; gap interval;
BEGIN
 IF NEW.status NOT IN ('requested','confirmed') THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' THEN
  IF OLD.status IN ('requested','confirmed') AND (NEW.starts_at,NEW.ends_at,NEW.organization_id,NEW.nutritionist_user_id) IS NOT DISTINCT FROM (OLD.starts_at,OLD.ends_at,OLD.organization_id,OLD.nutritionist_user_id) THEN RETURN NEW; END IF;
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('schedule:'||NEW.nutritionist_user_id::text,0));
 SELECT settings INTO config FROM app.professional_schedule_settings WHERE organization_id=NEW.organization_id AND nutritionist_user_id=NEW.nutritionist_user_id;
 IF config IS NULL THEN RETURN NEW; END IF;
 local_start:=NEW.starts_at AT TIME ZONE (config->>'timeZone');local_end:=NEW.ends_at AT TIME ZONE (config->>'timeZone');
 IF (config->>'enforceHours')::boolean AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(config->'intervals') s WHERE (s->>'day')::int=extract(dow FROM local_start) AND local_start::date=local_end::date AND local_start::time>=(s->>'start')::time AND local_end::time<=(s->>'end')::time) THEN RAISE EXCEPTION 'El turno queda fuera de las franjas de atención configuradas.'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(config->'blocks') b WHERE tstzrange(NEW.starts_at,NEW.ends_at,'[)') && tstzrange((b->>'startsAt')::timestamptz,(b->>'endsAt')::timestamptz,'[)')) THEN RAISE EXCEPTION 'El turno coincide con un bloqueo o vacaciones.'; END IF;
 gap:=make_interval(mins=>(config->>'gapMinutes')::int);
 IF EXISTS(SELECT 1 FROM app.appointments a WHERE a.nutritionist_user_id=NEW.nutritionist_user_id AND a.id<>NEW.id AND a.status IN ('requested','confirmed') AND NEW.starts_at<a.ends_at+gap AND NEW.ends_at+gap>a.starts_at) THEN RAISE EXCEPTION 'El turno no respeta la pausa entre citas o coincide con otro turno.'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_scheduled_appointment BEFORE INSERT OR UPDATE ON app.appointments FOR EACH ROW EXECUTE FUNCTION security.validate_scheduled_appointment();

ALTER TABLE app.patient_appointment_change_requests ADD COLUMN notice_hours integer NOT NULL DEFAULT 0, ADD COLUMN is_late boolean NOT NULL DEFAULT false;
CREATE FUNCTION security.classify_patient_change_notice() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a app.appointments; config jsonb;
BEGIN
 SELECT * INTO a FROM app.appointments WHERE id=NEW.appointment_id;
 SELECT settings INTO config FROM app.professional_schedule_settings WHERE organization_id=a.organization_id AND nutritionist_user_id=a.nutritionist_user_id;
 NEW.notice_hours:=coalesce((config->>CASE WHEN NEW.kind='cancel' THEN 'cancellationNoticeHours' ELSE 'rescheduleNoticeHours' END)::integer,0);
 NEW.is_late:=a.starts_at<now()+make_interval(hours=>NEW.notice_hours);
 RETURN NEW;
END; $$;
CREATE TRIGGER trg_classify_patient_change_notice BEFORE INSERT ON app.patient_appointment_change_requests FOR EACH ROW EXECUTE FUNCTION security.classify_patient_change_notice();
CREATE OR REPLACE VIEW api.professional_pending_appointment_changes WITH(security_invoker=true) AS
SELECT r.id,r.appointment_id,r.patient_id,r.kind,r.requested_starts_at,r.requested_duration_minutes,r.requested_modality,r.created_at,a.quoted_amount,a.currency,r.notice_hours,r.is_late
FROM app.patient_appointment_change_requests r JOIN app.appointments a ON a.id=r.appointment_id WHERE r.status='pending' AND r.nutritionist_user_id=auth.uid() AND security.is_current_assigned_nutritionist(r.patient_id);
REVOKE ALL ON FUNCTION api.get_my_schedule_settings(uuid),api.save_my_schedule_settings(uuid,jsonb,timestamptz),security.validate_scheduled_appointment(),security.classify_patient_change_notice() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION api.get_my_schedule_settings(uuid),api.save_my_schedule_settings(uuid,jsonb,timestamptz) TO authenticated;
NOTIFY pgrst,'reload schema';

CREATE FUNCTION api.get_patient_appointment_policy(p_appointment uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a app.appointments; config jsonb;
BEGIN
 SELECT * INTO a FROM app.appointments WHERE id=p_appointment;
 IF a.id IS NULL OR security.is_current_platform_admin() OR NOT security.has_current_patient_portal_access(a.patient_id) THEN RAISE EXCEPTION 'Cita no disponible.'; END IF;
 SELECT settings INTO config FROM app.professional_schedule_settings WHERE organization_id=a.organization_id AND nutritionist_user_id=a.nutritionist_user_id;
 RETURN jsonb_build_object('cancellationNoticeHours',coalesce((config->>'cancellationNoticeHours')::int,0),'rescheduleNoticeHours',coalesce((config->>'rescheduleNoticeHours')::int,0));
END; $$;
REVOKE ALL ON FUNCTION api.get_patient_appointment_policy(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION api.get_patient_appointment_policy(uuid) TO authenticated;
