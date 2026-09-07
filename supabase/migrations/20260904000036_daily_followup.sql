-- Daily follow-up remains separate from professional anthropometric revisions.
CREATE FUNCTION security.daily_professional(p_patient uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT NOT security.is_current_platform_admin() AND security.is_current_assigned_nutritionist(p_patient)
 AND EXISTS(SELECT 1 FROM app.patients p WHERE p.id=p_patient AND security.has_current_org_role(p.organization_id,ARRAY['nutritionist']));
$$;
CREATE FUNCTION security.daily_reader(p_patient uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT NOT security.is_current_platform_admin() AND (security.daily_professional(p_patient) OR security.has_current_patient_portal_access(p_patient));
$$;
REVOKE ALL ON FUNCTION security.daily_professional(uuid),security.daily_reader(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION security.daily_professional(uuid),security.daily_reader(uuid) TO authenticated;

CREATE TABLE app.daily_weights (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), patient_id uuid NOT NULL REFERENCES app.patients(id),
 recorded_on date NOT NULL, weight_kg numeric NOT NULL CHECK(weight_kg>0 AND weight_kg<=1000),
 recorded_by uuid NOT NULL REFERENCES auth.users(id), origin text NOT NULL CHECK(origin IN ('patient','professional')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE app.daily_activity (
 patient_id uuid PRIMARY KEY REFERENCES app.patients(id), last_at timestamptz NOT NULL, source text NOT NULL
);
CREATE FUNCTION security.daily_patient_author(p_patient uuid,p_owner uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT NOT security.is_current_platform_admin() AND security.has_current_patient_portal_access(p_patient) AND EXISTS(
 SELECT 1 FROM app.patient_assignments a JOIN app.organization_members m ON m.organization_id=a.organization_id AND m.user_id=a.nutritionist_user_id
 WHERE a.patient_id=p_patient AND a.nutritionist_user_id=p_owner AND a.status='active' AND m.status='active' AND m.role='nutritionist');
$$;
REVOKE ALL ON FUNCTION security.daily_patient_author(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION security.daily_patient_author(uuid,uuid) TO authenticated;
ALTER TABLE app.daily_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.daily_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY daily_weights_read ON app.daily_weights FOR SELECT USING(security.daily_reader(patient_id));
CREATE POLICY daily_activity_read ON app.daily_activity FOR SELECT USING(security.daily_reader(patient_id));
REVOKE ALL ON app.daily_weights,app.daily_activity FROM authenticated,anon;
GRANT SELECT ON app.daily_weights,app.daily_activity TO authenticated;
CREATE VIEW api.daily_weights WITH(security_invoker=true) AS SELECT * FROM app.daily_weights;
GRANT SELECT ON api.daily_weights TO authenticated;

CREATE FUNCTION app.touch_daily_activity(p_patient uuid,p_source text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT security.is_current_platform_admin() AND security.has_current_patient_portal_access(p_patient) THEN
 INSERT INTO app.daily_activity(patient_id,last_at,source) VALUES(p_patient,clock_timestamp(),p_source)
 ON CONFLICT(patient_id) DO UPDATE SET last_at=excluded.last_at,source=excluded.source;
 END IF;
END; $$;
REVOKE ALL ON FUNCTION app.touch_daily_activity(uuid,text) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION app.track_daily_activity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_TABLE_NAME='check_in_responses' THEN PERFORM app.touch_daily_activity(NEW.patient_id,'checkin');
 ELSIF TG_OP='INSERT' THEN
 IF NEW.adherence_status IS NOT NULL OR nullif(NEW.patient_comment,'') IS NOT NULL THEN PERFORM app.touch_daily_activity(NEW.patient_id,'meal'); END IF;
 ELSIF NEW.adherence_status IS DISTINCT FROM OLD.adherence_status OR NEW.patient_comment IS DISTINCT FROM OLD.patient_comment THEN
 PERFORM app.touch_daily_activity(NEW.patient_id,'meal');
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION app.track_daily_activity() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER track_checkin_activity AFTER INSERT ON app.check_in_responses FOR EACH ROW EXECUTE FUNCTION app.track_daily_activity();
CREATE TRIGGER track_meal_activity AFTER INSERT OR UPDATE ON app.meal_plan_meal_activity FOR EACH ROW EXECUTE FUNCTION app.track_daily_activity();
INSERT INTO app.daily_activity(patient_id,last_at,source)
 SELECT patient_id,max(happened),'historical' FROM (
 SELECT patient_id,created_at happened FROM app.check_in_responses
 UNION ALL SELECT patient_id,greatest(created_at,comment_updated_at) FROM app.meal_plan_meal_activity WHERE adherence_status IS NOT NULL OR patient_comment IS NOT NULL
 ) x GROUP BY patient_id;

CREATE FUNCTION api.record_daily_weight(p_patient uuid,p_date date,p_weight numeric,p_request_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_org uuid; v_existing app.daily_weights; v_origin text;
BEGIN
 IF NOT security.daily_reader(p_patient) THEN RAISE EXCEPTION 'Ficha no autorizada.'; END IF;
 IF p_request_id IS NULL OR p_date IS NULL OR p_date>CURRENT_DATE OR p_weight IS NULL OR p_weight<=0 OR p_weight>1000 THEN RAISE EXCEPTION 'Ingresá fecha no futura y peso válido.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_patient::text,0));
 SELECT * INTO v_existing FROM app.daily_weights WHERE id=p_request_id;
 IF FOUND THEN
 IF v_existing.patient_id=p_patient AND v_existing.recorded_by=auth.uid() AND v_existing.recorded_on=p_date AND v_existing.weight_kg=p_weight THEN RETURN p_request_id; END IF;
 RAISE EXCEPTION 'Solicitud ya utilizada.';
 END IF;
 v_origin:=CASE WHEN security.has_current_patient_portal_access(p_patient) THEN 'patient' ELSE 'professional' END;
 INSERT INTO app.daily_weights(id,patient_id,recorded_on,weight_kg,recorded_by,origin) VALUES(p_request_id,p_patient,p_date,p_weight,auth.uid(),v_origin);
 IF v_origin='patient' THEN PERFORM app.touch_daily_activity(p_patient,'weight'); END IF;
 SELECT organization_id INTO v_org FROM app.patients WHERE id=p_patient;
 INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details) VALUES(auth.uid(),v_org,'RECORD_WEIGHT','daily_weight',p_request_id,'{}');
 RETURN p_request_id;
END; $$;

-- Config is professional-wide, snapshotted when a check-in is assigned.
CREATE TABLE app.daily_checkin_settings (
 organization_id uuid NOT NULL REFERENCES app.organizations(id),owner_user_id uuid NOT NULL REFERENCES auth.users(id),
 fields text[] NOT NULL DEFAULT ARRAY['sleep','digestion','satiety','help','notes'],PRIMARY KEY(organization_id,owner_user_id),
 CHECK(fields <@ ARRAY['sleep','digestion','satiety','help','notes'])
);
ALTER TABLE app.check_in_assignments ADD COLUMN daily_fields text[] NOT NULL DEFAULT ARRAY['help','notes'];
CREATE TABLE app.daily_checkin_extras (
 response_id uuid PRIMARY KEY REFERENCES app.check_in_responses(id),patient_id uuid NOT NULL REFERENCES app.patients(id),
 answers jsonb NOT NULL CHECK(jsonb_typeof(answers)='object')
);
CREATE TRIGGER daily_extras_immutable BEFORE UPDATE OR DELETE ON app.daily_checkin_extras FOR EACH STATEMENT EXECUTE FUNCTION app.prevent_mutation_checkin_responses();
ALTER TABLE app.daily_checkin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.daily_checkin_extras ENABLE ROW LEVEL SECURITY;
CREATE POLICY checkin_settings_own ON app.daily_checkin_settings FOR SELECT USING(owner_user_id=auth.uid() AND NOT security.is_current_platform_admin() AND security.has_current_org_role(organization_id,ARRAY['nutritionist']));
CREATE POLICY checkin_extras_read ON app.daily_checkin_extras FOR SELECT USING(security.daily_reader(patient_id));
REVOKE ALL ON app.daily_checkin_settings,app.daily_checkin_extras FROM authenticated,anon;
GRANT SELECT ON app.daily_checkin_settings,app.daily_checkin_extras TO authenticated;
CREATE VIEW api.daily_checkins WITH(security_invoker=true) AS SELECT a.id,a.patient_id,a.status,a.due_date,a.created_at,a.daily_fields,
 r.energy,r.adherence,r.help_requested,r.notes,r.created_at submitted_at,e.answers
 FROM app.check_in_assignments a LEFT JOIN app.check_in_responses r ON r.assignment_id=a.id LEFT JOIN app.daily_checkin_extras e ON e.response_id=r.id
 WHERE security.daily_reader(a.patient_id);
CREATE VIEW api.daily_checkin_settings WITH(security_invoker=true) AS SELECT * FROM app.daily_checkin_settings;
GRANT SELECT ON api.daily_checkins,api.daily_checkin_settings TO authenticated;
CREATE FUNCTION api.save_daily_checkin_settings(p_org uuid,p_fields text[]) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF security.is_current_platform_admin() OR NOT security.has_current_org_role(p_org,ARRAY['nutritionist']) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
 INSERT INTO app.daily_checkin_settings(organization_id,owner_user_id,fields) VALUES(p_org,auth.uid(),p_fields) ON CONFLICT(organization_id,owner_user_id) DO UPDATE SET fields=excluded.fields;
END; $$;
CREATE FUNCTION api.assign_daily_checkin(p_patient uuid,p_due timestamptz) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_org uuid; v_id uuid; v_fields text[];
BEGIN
 IF NOT security.daily_professional(p_patient) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
 SELECT organization_id INTO v_org FROM app.patients WHERE id=p_patient FOR UPDATE;
 UPDATE app.check_in_assignments SET status='expired',expired_at=now() WHERE patient_id=p_patient AND status='pending' AND due_date<now();
 v_id:=api.assign_check_in(v_org,p_patient,p_due);
 SELECT fields INTO v_fields FROM app.daily_checkin_settings WHERE organization_id=v_org AND owner_user_id=auth.uid();
 UPDATE app.check_in_assignments SET daily_fields=coalesce(v_fields,ARRAY['sleep','digestion','satiety','help','notes']) WHERE id=v_id;
 RETURN v_id;
END; $$;
CREATE FUNCTION api.submit_daily_checkin(p_assignment uuid,p_energy smallint,p_adherence smallint,p_help boolean,p_notes text,p_answers jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_a app.check_in_assignments;v_id uuid;v_pair record;
BEGIN
 SELECT * INTO v_a FROM app.check_in_assignments WHERE id=p_assignment FOR UPDATE;
 IF NOT FOUND OR security.is_current_platform_admin() OR NOT security.has_current_patient_portal_access(v_a.patient_id) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
 IF p_answers IS NULL OR jsonb_typeof(p_answers)<>'object' OR length(coalesce(p_notes,''))>500 THEN RAISE EXCEPTION 'Respuesta inválida.'; END IF;
 FOR v_pair IN SELECT * FROM jsonb_each(p_answers) LOOP
 IF NOT v_pair.key=ANY(v_a.daily_fields) OR NOT v_pair.key=ANY(ARRAY['sleep','digestion','satiety']) OR jsonb_typeof(v_pair.value)<>'string' OR length(v_pair.value#>>'{}')>200 THEN RAISE EXCEPTION 'Respuesta adicional inválida.'; END IF;
 END LOOP;
 v_id:=api.submit_check_in(p_assignment,p_energy,p_adherence,CASE WHEN 'help'=ANY(v_a.daily_fields) THEN p_help ELSE false END,CASE WHEN 'notes'=ANY(v_a.daily_fields) THEN p_notes ELSE NULL END);
 INSERT INTO app.daily_checkin_extras(response_id,patient_id,answers) VALUES(v_id,v_a.patient_id,p_answers);
 RETURN v_id;
END; $$;

-- Individual task lists: permanent patient binding; duplicate structure to reuse.
CREATE TABLE app.daily_lists (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL REFERENCES app.organizations(id),owner_user_id uuid NOT NULL REFERENCES auth.users(id),
 patient_id uuid REFERENCES app.patients(id),title text NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 160),duration_days integer NOT NULL CHECK(duration_days BETWEEN 7 AND 15),
 items jsonb NOT NULL CHECK(jsonb_typeof(items)='array'),active boolean NOT NULL DEFAULT false,deleted boolean NOT NULL DEFAULT false,updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX daily_one_active_list ON app.daily_lists(patient_id) WHERE active AND NOT deleted;
CREATE TABLE app.daily_task_activity (
 list_id uuid NOT NULL REFERENCES app.daily_lists(id),task_id uuid NOT NULL,patient_id uuid NOT NULL REFERENCES app.patients(id),
 completed boolean NOT NULL DEFAULT false,comment text NOT NULL DEFAULT '' CHECK(length(comment)<=500),updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(list_id,task_id)
);
ALTER TABLE app.daily_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.daily_task_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY daily_lists_read ON app.daily_lists FOR SELECT USING(NOT deleted AND NOT security.is_current_platform_admin() AND
 ((owner_user_id=auth.uid() AND security.has_current_org_role(organization_id,ARRAY['nutritionist']) AND (patient_id IS NULL OR security.daily_professional(patient_id))) OR (active AND security.daily_patient_author(patient_id,owner_user_id))));
CREATE POLICY daily_tasks_read ON app.daily_task_activity FOR SELECT USING(EXISTS(SELECT 1 FROM app.daily_lists l WHERE l.id=list_id));
REVOKE ALL ON app.daily_lists,app.daily_task_activity FROM authenticated,anon;
GRANT SELECT ON app.daily_lists,app.daily_task_activity TO authenticated;
CREATE VIEW api.daily_lists WITH(security_invoker=true) AS SELECT * FROM app.daily_lists;
CREATE VIEW api.daily_task_activity WITH(security_invoker=true) AS SELECT * FROM app.daily_task_activity;
GRANT SELECT ON api.daily_lists,api.daily_task_activity TO authenticated;
CREATE FUNCTION api.save_daily_list(p_id uuid,p_org uuid,p_title text,p_days integer,p_items jsonb,p_expected timestamptz DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_old app.daily_lists;v_id uuid;v_item jsonb;
BEGIN
 IF security.is_current_platform_admin() OR NOT security.has_current_org_role(p_org,ARRAY['nutritionist']) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
 IF p_id IS NOT NULL THEN
 SELECT * INTO v_old FROM app.daily_lists WHERE id=p_id AND owner_user_id=auth.uid() AND organization_id=p_org AND NOT deleted FOR UPDATE;
 IF NOT FOUND OR (v_old.patient_id IS NOT NULL AND NOT security.daily_professional(v_old.patient_id)) OR v_old.updated_at IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'Lista no disponible o modificada. Volvé a abrirla.'; END IF;
 END IF;
 IF p_items IS NULL OR jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'Indicá entre 1 y 50 tareas.'; END IF;
 FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
 IF length(trim(coalesce(v_item->>'text',''))) NOT BETWEEN 1 AND 500 OR (v_item->>'id')::uuid IS NULL THEN RAISE EXCEPTION 'Tarea inválida.'; END IF;
 IF v_old.id IS NOT NULL AND EXISTS(SELECT 1 FROM jsonb_array_elements(v_old.items) old_item WHERE old_item->>'id'=v_item->>'id' AND old_item->>'text' IS DISTINCT FROM v_item->>'text') THEN RAISE EXCEPTION 'Una tarea modificada necesita un identificador nuevo para no heredar respuestas.'; END IF;
 END LOOP;
 IF (SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(p_items))<>jsonb_array_length(p_items) THEN RAISE EXCEPTION 'Tareas repetidas.'; END IF;
 IF p_id IS NULL THEN
 INSERT INTO app.daily_lists(organization_id,owner_user_id,title,duration_days,items) VALUES(p_org,auth.uid(),trim(p_title),p_days,p_items) RETURNING id INTO v_id;
 ELSE
 UPDATE app.daily_lists SET title=trim(p_title),duration_days=p_days,items=p_items,updated_at=clock_timestamp() WHERE id=p_id RETURNING id INTO v_id;
 END IF;
 INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details) VALUES(auth.uid(),p_org,'SAVE_DAILY_LIST','daily_list',v_id,'{}');
 RETURN v_id;
END; $$;
CREATE FUNCTION api.set_daily_list_assignment(p_id uuid,p_patient uuid,p_active boolean,p_delete boolean DEFAULT false) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_l app.daily_lists;v_org uuid;
BEGIN
 -- Serialize per professional before locking lists, and per patient before replacement.
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text,1));
 IF p_patient IS NOT NULL THEN PERFORM pg_advisory_xact_lock(hashtextextended(p_patient::text,2)); END IF;
 SELECT * INTO v_l FROM app.daily_lists WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR v_l.deleted OR v_l.owner_user_id<>auth.uid() OR security.is_current_platform_admin() OR NOT security.has_current_org_role(v_l.organization_id,ARRAY['nutritionist']) OR (v_l.patient_id IS NOT NULL AND NOT security.daily_professional(v_l.patient_id)) THEN RAISE EXCEPTION 'Lista no autorizada.'; END IF;
 IF p_active THEN
 SELECT organization_id INTO v_org FROM app.patients WHERE id=p_patient;
 IF p_patient IS NULL OR NOT security.daily_professional(p_patient) OR v_org<>v_l.organization_id OR (v_l.patient_id IS NOT NULL AND v_l.patient_id<>p_patient) THEN RAISE EXCEPTION 'Duplicá la lista para asignarla a otra persona.'; END IF;
 UPDATE app.daily_lists SET active=false,updated_at=clock_timestamp() WHERE patient_id=p_patient AND active;
 END IF;
 UPDATE app.daily_lists SET patient_id=CASE WHEN p_active THEN coalesce(patient_id,p_patient) ELSE patient_id END,active=p_active AND NOT p_delete,deleted=p_delete,updated_at=clock_timestamp() WHERE id=p_id;
 INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details) VALUES(auth.uid(),v_l.organization_id,'ASSIGN_DAILY_LIST','daily_list',p_id,'{}');
END; $$;
CREATE FUNCTION api.respond_daily_task(p_list uuid,p_task uuid,p_completed boolean,p_comment text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_l app.daily_lists;v_old app.daily_task_activity;
BEGIN
 SELECT * INTO v_l FROM app.daily_lists WHERE id=p_list FOR UPDATE;
 IF NOT FOUND OR NOT v_l.active OR v_l.deleted OR NOT security.daily_patient_author(v_l.patient_id,v_l.owner_user_id) OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(v_l.items) i WHERE i->>'id'=p_task::text) THEN RAISE EXCEPTION 'Tarea no disponible.'; END IF;
 SELECT * INTO v_old FROM app.daily_task_activity WHERE list_id=p_list AND task_id=p_task;
 IF v_old.list_id IS NOT NULL AND v_old.completed=p_completed AND v_old.comment=coalesce(p_comment,'') THEN RETURN; END IF;
 INSERT INTO app.daily_task_activity(list_id,task_id,patient_id,completed,comment) VALUES(p_list,p_task,v_l.patient_id,p_completed,coalesce(p_comment,'')) ON CONFLICT(list_id,task_id) DO UPDATE SET completed=excluded.completed,comment=excluded.comment,updated_at=clock_timestamp();
 PERFORM app.touch_daily_activity(v_l.patient_id,'task');
 INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details) VALUES(auth.uid(),v_l.organization_id,'RESPOND_DAILY_TASK','daily_list',p_list,'{}');
END; $$;

CREATE TABLE app.daily_phrases (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL REFERENCES app.organizations(id),owner_user_id uuid NOT NULL REFERENCES auth.users(id),
 text text NOT NULL CHECK(length(trim(text)) BETWEEN 1 AND 280),deleted boolean NOT NULL DEFAULT false,updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE app.daily_phrase_assignments (
 patient_id uuid PRIMARY KEY REFERENCES app.patients(id),phrase_id uuid NOT NULL REFERENCES app.daily_phrases(id)
);
ALTER TABLE app.daily_phrases ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.daily_phrase_assignments ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION security.daily_phrase_visible(p_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT NOT security.is_current_platform_admin() AND EXISTS(SELECT 1 FROM app.daily_phrases f WHERE f.id=p_id AND NOT f.deleted AND
 ((f.owner_user_id=auth.uid() AND security.has_current_org_role(f.organization_id,ARRAY['nutritionist'])) OR EXISTS(SELECT 1 FROM app.daily_phrase_assignments a JOIN app.patient_assignments pa ON pa.patient_id=a.patient_id AND pa.organization_id=f.organization_id AND pa.nutritionist_user_id=f.owner_user_id AND pa.status='active' WHERE a.phrase_id=f.id AND security.has_current_patient_portal_access(a.patient_id))));
$$;
REVOKE ALL ON FUNCTION security.daily_phrase_visible(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION security.daily_phrase_visible(uuid) TO authenticated;
CREATE POLICY daily_phrase_read ON app.daily_phrases FOR SELECT USING(security.daily_phrase_visible(id));
CREATE POLICY daily_phrase_assignment_read ON app.daily_phrase_assignments FOR SELECT USING(security.daily_reader(patient_id) AND security.daily_phrase_visible(phrase_id));
REVOKE ALL ON app.daily_phrases,app.daily_phrase_assignments FROM authenticated,anon;
GRANT SELECT ON app.daily_phrases,app.daily_phrase_assignments TO authenticated;
CREATE VIEW api.daily_phrases WITH(security_invoker=true) AS SELECT * FROM app.daily_phrases;
CREATE VIEW api.daily_phrase_assignments WITH(security_invoker=true) AS SELECT * FROM app.daily_phrase_assignments;
GRANT SELECT ON api.daily_phrases,api.daily_phrase_assignments TO authenticated;
CREATE FUNCTION api.save_daily_phrase(p_id uuid,p_org uuid,p_text text,p_delete boolean DEFAULT false,p_expected timestamptz DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid;
BEGIN
 IF security.is_current_platform_admin() OR NOT security.has_current_org_role(p_org,ARRAY['nutritionist']) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
 IF p_id IS NULL THEN INSERT INTO app.daily_phrases(organization_id,owner_user_id,text) VALUES(p_org,auth.uid(),trim(p_text)) RETURNING id INTO v_id;
 ELSE UPDATE app.daily_phrases SET text=trim(p_text),deleted=p_delete,updated_at=clock_timestamp() WHERE id=p_id AND owner_user_id=auth.uid() AND organization_id=p_org AND NOT deleted AND updated_at=p_expected RETURNING id INTO v_id;
 IF v_id IS NULL THEN RAISE EXCEPTION 'Frase no disponible o modificada. Volvé a abrirla.'; END IF;
 END IF;
 IF p_delete THEN DELETE FROM app.daily_phrase_assignments WHERE phrase_id=v_id; END IF;
 RETURN v_id;
END; $$;
CREATE FUNCTION api.assign_daily_phrase(p_id uuid,p_patients uuid[]) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_f app.daily_phrases;v_patient uuid;
BEGIN
 SELECT * INTO v_f FROM app.daily_phrases WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR v_f.deleted OR v_f.owner_user_id<>auth.uid() OR security.is_current_platform_admin() OR NOT security.has_current_org_role(v_f.organization_id,ARRAY['nutritionist']) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
 FOREACH v_patient IN ARRAY p_patients LOOP
 IF NOT security.daily_professional(v_patient) OR NOT EXISTS(SELECT 1 FROM app.patients WHERE id=v_patient AND organization_id=v_f.organization_id) THEN RAISE EXCEPTION 'Paciente no autorizado.'; END IF;
 END LOOP;
 DELETE FROM app.daily_phrase_assignments WHERE phrase_id=p_id AND security.daily_professional(patient_id) AND NOT patient_id=ANY(p_patients);
 FOR v_patient IN SELECT DISTINCT unnest(p_patients) ORDER BY 1 LOOP
 INSERT INTO app.daily_phrase_assignments(patient_id,phrase_id) VALUES(v_patient,p_id) ON CONFLICT(patient_id) DO UPDATE SET phrase_id=excluded.phrase_id;
 END LOOP;
END; $$;

CREATE VIEW api.daily_patients WITH(security_invoker=true) AS
 SELECT p.id,p.organization_id,p.first_name,p.last_name,a.last_at,a.source,
 (SELECT min(granted_at) FROM app.patient_portal_access WHERE patient_id=p.id AND status='active') tracking_since
 FROM app.patients p LEFT JOIN app.daily_activity a ON a.patient_id=p.id WHERE security.daily_reader(p.id);
GRANT SELECT ON api.daily_patients TO authenticated;
REVOKE ALL ON FUNCTION api.record_daily_weight(uuid,date,numeric,uuid),api.save_daily_checkin_settings(uuid,text[]),api.assign_daily_checkin(uuid,timestamptz),api.submit_daily_checkin(uuid,smallint,smallint,boolean,text,jsonb),api.save_daily_list(uuid,uuid,text,integer,jsonb,timestamptz),api.set_daily_list_assignment(uuid,uuid,boolean,boolean),api.respond_daily_task(uuid,uuid,boolean,text),api.save_daily_phrase(uuid,uuid,text,boolean,timestamptz),api.assign_daily_phrase(uuid,uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION api.record_daily_weight(uuid,date,numeric,uuid),api.save_daily_checkin_settings(uuid,text[]),api.assign_daily_checkin(uuid,timestamptz),api.submit_daily_checkin(uuid,smallint,smallint,boolean,text,jsonb),api.save_daily_list(uuid,uuid,text,integer,jsonb,timestamptz),api.set_daily_list_assignment(uuid,uuid,boolean,boolean),api.respond_daily_task(uuid,uuid,boolean,text),api.save_daily_phrase(uuid,uuid,text,boolean,timestamptz),api.assign_daily_phrase(uuid,uuid[]) TO authenticated;
