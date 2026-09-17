-- Per-patient check-in cadence. Nothing is activated implicitly.
CREATE TABLE app.checkin_automation_settings (
 organization_id uuid NOT NULL REFERENCES app.organizations(id),
 owner_user_id uuid NOT NULL REFERENCES auth.users(id),
 enabled boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(organization_id,owner_user_id)
);
CREATE TABLE app.checkin_patient_schedules (
 organization_id uuid NOT NULL REFERENCES app.organizations(id),
 owner_user_id uuid NOT NULL REFERENCES auth.users(id),
 patient_id uuid NOT NULL REFERENCES app.patients(id) ON DELETE CASCADE,
 frequency text NOT NULL CHECK(frequency IN('daily','weekly','paused')),
 next_run_on date,
 last_assigned_at timestamptz,
 last_skipped_on date,
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(organization_id,owner_user_id,patient_id),
 CONSTRAINT schedule_patient_tenant FOREIGN KEY(organization_id,patient_id) REFERENCES app.patients(organization_id,id) ON DELETE CASCADE,
 CHECK((frequency='paused')=(next_run_on IS NULL))
);
ALTER TABLE app.checkin_automation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.checkin_patient_schedules ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app.checkin_automation_settings,app.checkin_patient_schedules FROM PUBLIC,anon,authenticated;

CREATE FUNCTION api.get_checkin_automation(p_org uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF security.is_current_platform_admin() OR NOT security.has_current_org_role(p_org,ARRAY['nutritionist']) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
 SELECT jsonb_build_object(
  'enabled',coalesce((SELECT s.enabled FROM app.checkin_automation_settings s WHERE s.organization_id=p_org AND s.owner_user_id=auth.uid()),false),
  'updated_at',(SELECT s.updated_at FROM app.checkin_automation_settings s WHERE s.organization_id=p_org AND s.owner_user_id=auth.uid()),
  'patients',coalesce(jsonb_agg(jsonb_build_object('patient_id',p.id,'first_name',p.first_name,'last_name',p.last_name,'frequency',coalesce(c.frequency,'daily'),'configured',c.patient_id IS NOT NULL,'next_run_on',c.next_run_on,'last_assigned_at',c.last_assigned_at,'last_skipped_on',c.last_skipped_on) ORDER BY p.last_name,p.first_name),'[]'::jsonb)
 ) INTO result
 FROM app.patient_assignments a JOIN app.patients p ON p.id=a.patient_id AND p.organization_id=a.organization_id
 LEFT JOIN app.checkin_patient_schedules c ON c.organization_id=a.organization_id AND c.owner_user_id=a.nutritionist_user_id AND c.patient_id=a.patient_id
 WHERE a.organization_id=p_org AND a.nutritionist_user_id=auth.uid() AND a.status='active' AND p.status='active';
 RETURN result;
END; $$;

CREATE FUNCTION api.save_checkin_automation_global(p_org uuid,p_enabled boolean,p_expected timestamptz DEFAULT NULL) RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE prior timestamptz; stamp timestamptz;
BEGIN
 IF security.is_current_platform_admin() OR NOT security.has_current_org_role(p_org,ARRAY['nutritionist']) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('checkin-auto:'||p_org::text||auth.uid()::text,0));
 SELECT updated_at INTO prior FROM app.checkin_automation_settings WHERE organization_id=p_org AND owner_user_id=auth.uid();
 IF prior IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'La automatización cambió. Recargá antes de guardar.'; END IF;
 INSERT INTO app.checkin_automation_settings(organization_id,owner_user_id,enabled) VALUES(p_org,auth.uid(),p_enabled)
 ON CONFLICT(organization_id,owner_user_id) DO UPDATE SET enabled=excluded.enabled,updated_at=clock_timestamp() RETURNING updated_at INTO stamp;
 INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details) VALUES(auth.uid(),p_org,CASE WHEN p_enabled THEN 'ENABLE_CHECKIN_AUTOMATION' ELSE 'PAUSE_CHECKIN_AUTOMATION' END,'checkin_automation',p_org,'{}');
 RETURN stamp;
END; $$;

CREATE FUNCTION api.save_checkin_patient_frequency(p_org uuid,p_patient uuid,p_frequency text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF security.is_current_platform_admin() OR p_frequency NOT IN('daily','weekly','paused') OR NOT security.daily_professional(p_patient)
 OR NOT EXISTS(SELECT 1 FROM app.patients p WHERE p.id=p_patient AND p.organization_id=p_org AND p.status='active') THEN RAISE EXCEPTION 'No autorizado o frecuencia inválida.'; END IF;
 INSERT INTO app.checkin_patient_schedules(organization_id,owner_user_id,patient_id,frequency,next_run_on)
 VALUES(p_org,auth.uid(),p_patient,p_frequency,CASE WHEN p_frequency='paused' THEN NULL ELSE current_date END)
 ON CONFLICT(organization_id,owner_user_id,patient_id) DO UPDATE SET frequency=excluded.frequency,next_run_on=CASE WHEN excluded.frequency='paused' THEN NULL WHEN app.checkin_patient_schedules.frequency IS DISTINCT FROM excluded.frequency OR app.checkin_patient_schedules.next_run_on IS NULL THEN current_date ELSE app.checkin_patient_schedules.next_run_on END,updated_at=clock_timestamp();
 INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details) VALUES(auth.uid(),p_org,'SET_PATIENT_CHECKIN_FREQUENCY','patient',p_patient,jsonb_build_object('frequency',p_frequency));
END; $$;

CREATE FUNCTION api.run_checkin_automation_for_service(p_run_on date DEFAULT current_date) RETURNS TABLE(assigned integer,skipped_pending integer,skipped_configuration integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE row record; snapshot jsonb; fields text[]; created uuid; a_count integer:=0; p_count integer:=0; c_count integer:=0; step_days integer;
BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'No autorizado.'; END IF;
 IF p_run_on IS NULL OR p_run_on>current_date+1 THEN RAISE EXCEPTION 'Fecha de ejecución inválida.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('checkin-automation:'||p_run_on::text,0));
 FOR row IN
  SELECT c.* FROM app.checkin_patient_schedules c
  JOIN app.checkin_automation_settings s ON s.organization_id=c.organization_id AND s.owner_user_id=c.owner_user_id AND s.enabled
  JOIN app.patients p ON p.id=c.patient_id AND p.organization_id=c.organization_id AND p.status='active'
  JOIN app.patient_assignments pa ON pa.organization_id=c.organization_id AND pa.patient_id=c.patient_id AND pa.nutritionist_user_id=c.owner_user_id AND pa.status='active'
  JOIN app.organization_members m ON m.organization_id=c.organization_id AND m.user_id=c.owner_user_id AND m.role='nutritionist' AND m.status='active'
  JOIN app.organizations o ON o.id=c.organization_id AND o.status='active'
  WHERE c.frequency IN('daily','weekly') AND c.next_run_on<=p_run_on ORDER BY c.patient_id FOR UPDATE OF c,p
 LOOP
  step_days:=CASE WHEN row.frequency='daily' THEN 1 ELSE 7 END;
  IF EXISTS(SELECT 1 FROM app.check_in_assignments x WHERE x.organization_id=row.organization_id AND x.patient_id=row.patient_id AND x.status='pending') THEN
   UPDATE app.checkin_patient_schedules SET next_run_on=p_run_on+step_days,last_skipped_on=p_run_on,updated_at=clock_timestamp() WHERE organization_id=row.organization_id AND owner_user_id=row.owner_user_id AND patient_id=row.patient_id;
   p_count:=p_count+1; CONTINUE;
  END IF;
  SELECT coalesce(jsonb_agg(q),'[]'::jsonb) INTO snapshot FROM app.checkin_question_libraries l CROSS JOIN LATERAL jsonb_array_elements(l.questions) q WHERE l.organization_id=row.organization_id AND l.owner_user_id=row.owner_user_id AND (q->>'enabled')::boolean AND NOT (q->>'archived')::boolean;
  IF snapshot IS NULL OR jsonb_array_length(snapshot)=0 THEN
   UPDATE app.checkin_patient_schedules SET next_run_on=p_run_on+step_days,last_skipped_on=p_run_on,updated_at=clock_timestamp() WHERE organization_id=row.organization_id AND owner_user_id=row.owner_user_id AND patient_id=row.patient_id;
   c_count:=c_count+1; CONTINUE;
  END IF;
  SELECT s.fields INTO fields FROM app.daily_checkin_settings s WHERE s.organization_id=row.organization_id AND s.owner_user_id=row.owner_user_id;
  INSERT INTO app.check_in_assignments(organization_id,patient_id,created_by,status,due_date,daily_fields,questions)
  VALUES(row.organization_id,row.patient_id,row.owner_user_id,'pending',(p_run_on+step_days)::timestamptz,coalesce(fields,ARRAY['sleep','digestion','satiety','help','notes']),snapshot) RETURNING id INTO created;
  UPDATE app.checkin_patient_schedules SET next_run_on=p_run_on+step_days,last_assigned_at=clock_timestamp(),last_skipped_on=NULL,updated_at=clock_timestamp() WHERE organization_id=row.organization_id AND owner_user_id=row.owner_user_id AND patient_id=row.patient_id;
  INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details) VALUES(row.owner_user_id,row.organization_id,'AUTO_ASSIGN_CHECKIN','check_in_assignment',created,jsonb_build_object('frequency',row.frequency));
  a_count:=a_count+1;
 END LOOP;
 RETURN QUERY SELECT a_count,p_count,c_count;
END; $$;

REVOKE ALL ON FUNCTION api.get_checkin_automation(uuid),api.save_checkin_automation_global(uuid,boolean,timestamptz),api.save_checkin_patient_frequency(uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION api.get_checkin_automation(uuid),api.save_checkin_automation_global(uuid,boolean,timestamptz),api.save_checkin_patient_frequency(uuid,uuid,text) TO authenticated;
REVOKE ALL ON FUNCTION api.run_checkin_automation_for_service(date) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION api.run_checkin_automation_for_service(date) TO service_role;
NOTIFY pgrst,'reload schema';
