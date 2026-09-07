-- Versioned questionnaires: legacy assignments keep their original form and rules.
CREATE TABLE app.checkin_question_libraries (
 organization_id uuid NOT NULL REFERENCES app.organizations(id),
 owner_user_id uuid NOT NULL REFERENCES auth.users(id),
 questions jsonb NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(organization_id,owner_user_id)
);
ALTER TABLE app.checkin_question_libraries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app.checkin_question_libraries FROM anon,authenticated;
ALTER TABLE app.check_in_assignments ADD COLUMN questions jsonb;
ALTER TABLE app.check_in_responses ALTER COLUMN energy DROP NOT NULL, ALTER COLUMN adherence DROP NOT NULL;
ALTER TABLE app.check_in_responses ADD COLUMN question_answers jsonb, ADD COLUMN alert_matches jsonb;
ALTER TABLE app.alerts DROP CONSTRAINT alerts_rule_code_check;
ALTER TABLE app.alerts ADD CONSTRAINT alerts_rule_code_check CHECK(rule_code IN ('HELP_REQUESTED','LOW_ENERGY','LOW_ADHERENCE','CUSTOM_CHECKIN'));

CREATE FUNCTION api.get_checkin_questions(p_org uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF security.is_current_platform_admin() OR NOT security.has_current_org_role(p_org,ARRAY['nutritionist']) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
 SELECT jsonb_build_object('questions',questions,'updated_at',updated_at) INTO result FROM app.checkin_question_libraries WHERE organization_id=p_org AND owner_user_id=auth.uid();
 RETURN coalesce(result,'{"questions":null,"updated_at":null}'::jsonb);
END; $$;
CREATE FUNCTION api.save_checkin_questions(p_org uuid,p_questions jsonb,p_expected timestamptz DEFAULT NULL) RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE prior timestamptz; stamp timestamptz; q jsonb; alert_count integer:=0;
BEGIN
 IF security.is_current_platform_admin() OR NOT security.has_current_org_role(p_org,ARRAY['nutritionist']) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('questions:'||p_org::text||auth.uid()::text,0));
 SELECT updated_at INTO prior FROM app.checkin_question_libraries WHERE organization_id=p_org AND owner_user_id=auth.uid();
 IF prior IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'Las preguntas cambiaron. Recargá antes de guardar.'; END IF;
 IF p_questions IS NULL OR jsonb_typeof(p_questions)<>'array' OR jsonb_array_length(p_questions)>100 THEN RAISE EXCEPTION 'Máximo 100 preguntas en la biblioteca.'; END IF;
 FOR q IN SELECT value FROM jsonb_array_elements(p_questions) LOOP
  IF NOT q ?& ARRAY['id','text','type','enabled','required','archived','options','alert'] OR (q->>'id')::uuid IS NULL OR length(trim(coalesce(q->>'text',''))) NOT BETWEEN 1 AND 300 OR coalesce(q->>'type','') NOT IN ('scale','yesno','choice','text') OR jsonb_typeof(q->'enabled') IS DISTINCT FROM 'boolean' OR jsonb_typeof(q->'required') IS DISTINCT FROM 'boolean' OR jsonb_typeof(q->'archived') IS DISTINCT FROM 'boolean' OR jsonb_typeof(q->'options') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Pregunta inválida.'; END IF;
  IF jsonb_array_length(q->'options')>10 OR EXISTS(SELECT 1 FROM jsonb_array_elements(q->'options') o WHERE jsonb_typeof(o)<>'string' OR length(trim(o#>>'{}')) NOT BETWEEN 1 AND 100) OR (SELECT count(DISTINCT value) FROM jsonb_array_elements(q->'options'))<>jsonb_array_length(q->'options') THEN RAISE EXCEPTION 'Opciones inválidas o repetidas.'; END IF;
  IF q->>'type'='choice' AND jsonb_array_length(q->'options')<2 THEN RAISE EXCEPTION 'Indicá al menos dos opciones.'; END IF;
  IF q->'alert'<>'null'::jsonb THEN
   IF NOT (q->>'enabled')::boolean OR (q->>'archived')::boolean OR q->>'type'='text' OR jsonb_typeof(q->'alert')<>'object' OR jsonb_typeof(q->'alert'->'values') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'La alerta requiere una pregunta activa y un disparador, sin texto libre.'; END IF;
   alert_count:=alert_count+1;
   IF q->>'type'='scale' THEN
    IF coalesce(q->'alert'->>'op','') NOT IN ('lte','gte') OR jsonb_array_length(q->'alert'->'values')<>1 OR coalesce(q->'alert'->'values'->>0,'') NOT IN ('1','2','3','4','5') THEN RAISE EXCEPTION 'Elegí el límite de la escala.'; END IF;
   ELSE
    IF coalesce(q->'alert'->>'op','')<>'in' OR jsonb_array_length(q->'alert'->'values')=0 OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(q->'alert'->'values') v WHERE (q->>'type'='yesno' AND v NOT IN ('Sí','No')) OR (q->>'type'='choice' AND NOT (q->'options') ? v)) THEN RAISE EXCEPTION 'Elegí qué respuestas generan alerta.'; END IF;
   END IF;
  END IF;
 END LOOP;
 IF alert_count>2 THEN RAISE EXCEPTION 'Podés activar alertas en hasta 2 preguntas.'; END IF;
 IF (SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(p_questions))<>jsonb_array_length(p_questions) THEN RAISE EXCEPTION 'Identificadores repetidos.'; END IF;
 INSERT INTO app.checkin_question_libraries VALUES(p_org,auth.uid(),p_questions,clock_timestamp()) ON CONFLICT(organization_id,owner_user_id) DO UPDATE SET questions=excluded.questions,updated_at=excluded.updated_at RETURNING updated_at INTO stamp;
 INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details) VALUES(auth.uid(),p_org,'SAVE_CHECKIN_QUESTIONS','checkin_library',p_org,'{}');
 RETURN stamp;
END; $$;

-- The old assign RPC remains compatible when no question library has been saved.
CREATE OR REPLACE FUNCTION api.assign_daily_checkin(p_patient uuid,p_due timestamptz) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE org uuid; result uuid; fields text[]; library jsonb; snapshot jsonb;
BEGIN
 IF NOT security.daily_professional(p_patient) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
 SELECT organization_id INTO org FROM app.patients WHERE id=p_patient FOR UPDATE;
 SELECT questions INTO library FROM app.checkin_question_libraries WHERE organization_id=org AND owner_user_id=auth.uid();
 IF library IS NOT NULL THEN
  SELECT coalesce(jsonb_agg(q),'[]') INTO snapshot FROM jsonb_array_elements(library) q WHERE (q->>'enabled')::boolean AND NOT (q->>'archived')::boolean;
  IF jsonb_array_length(snapshot)=0 THEN RAISE EXCEPTION 'Activá al menos una pregunta antes de asignar el check-in.'; END IF;
 END IF;
 UPDATE app.check_in_assignments SET status='expired',expired_at=now() WHERE patient_id=p_patient AND status='pending' AND due_date<now();
 result:=api.assign_check_in(org,p_patient,p_due);
 SELECT s.fields INTO fields FROM app.daily_checkin_settings s WHERE s.organization_id=org AND owner_user_id=auth.uid();
 UPDATE app.check_in_assignments SET daily_fields=coalesce(fields,ARRAY['sleep','digestion','satiety','help','notes']),questions=snapshot WHERE id=result;
 RETURN result;
END; $$;

CREATE FUNCTION security.guard_question_response() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE snapshot jsonb;
BEGIN
 SELECT questions INTO snapshot FROM app.check_in_assignments WHERE id=NEW.assignment_id;
 IF snapshot IS NULL THEN
  IF NEW.energy IS NULL OR NEW.adherence IS NULL OR NEW.question_answers IS NOT NULL THEN RAISE EXCEPTION 'Usá el formulario original de este check-in.'; END IF;
 ELSE
  IF NEW.question_answers IS NULL OR NEW.energy IS NOT NULL OR NEW.adherence IS NOT NULL OR NEW.help_requested THEN RAISE EXCEPTION 'Usá las preguntas de este check-in.'; END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER trg_guard_question_response BEFORE INSERT ON app.check_in_responses FOR EACH ROW EXECUTE FUNCTION security.guard_question_response();

CREATE FUNCTION api.submit_question_checkin(p_assignment uuid,p_answers jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a app.check_in_assignments; q jsonb; answer text; matches jsonb:='[]'; result uuid; hit boolean;
BEGIN
 SELECT * INTO a FROM app.check_in_assignments WHERE id=p_assignment FOR UPDATE;
 IF a.id IS NULL OR security.is_current_platform_admin() OR NOT security.has_current_patient_portal_access(a.patient_id) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
 IF a.questions IS NULL OR a.status<>'pending' OR a.due_date<now() THEN RAISE EXCEPTION 'Check-in no disponible para responder.'; END IF;
 IF p_answers IS NULL OR jsonb_typeof(p_answers)<>'object' THEN RAISE EXCEPTION 'Respuestas inválidas.'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_each(p_answers) p WHERE jsonb_typeof(p.value)<>'string' OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(a.questions) item WHERE item->>'id'=p.key)) THEN RAISE EXCEPTION 'La respuesta contiene preguntas ajenas.'; END IF;
 FOR q IN SELECT value FROM jsonb_array_elements(a.questions) LOOP
  answer:=trim(coalesce(p_answers->>(q->>'id'),''));hit:=false;
  IF answer='' THEN
   IF (q->>'required')::boolean THEN RAISE EXCEPTION 'Completá las preguntas obligatorias.'; END IF;
   CONTINUE;
  END IF;
  IF length(answer)>500 OR (q->>'type'='scale' AND answer NOT IN ('1','2','3','4','5')) OR (q->>'type'='yesno' AND answer NOT IN ('Sí','No')) OR (q->>'type'='choice' AND NOT (q->'options') ? answer) THEN RAISE EXCEPTION 'Revisá las respuestas y sus opciones.'; END IF;
  IF q->'alert'<>'null'::jsonb THEN
   IF q->>'type'='scale' THEN hit:=CASE WHEN q->'alert'->>'op'='lte' THEN answer::int<=(q->'alert'->'values'->>0)::int ELSE answer::int>=(q->'alert'->'values'->>0)::int END;
   ELSE hit:=(q->'alert'->'values') ? answer; END IF;
  END IF;
  IF hit THEN matches:=matches||jsonb_build_array(q->>'id'); END IF;
 END LOOP;
 INSERT INTO app.check_in_responses(organization_id,assignment_id,patient_id,submitted_by,energy,adherence,help_requested,question_answers,alert_matches) VALUES(a.organization_id,a.id,a.patient_id,auth.uid(),NULL,NULL,false,p_answers,matches) RETURNING id INTO result;
 UPDATE app.check_in_assignments SET status='completed',completed_at=now() WHERE id=a.id;
 IF jsonb_array_length(matches)>0 THEN
  INSERT INTO app.alerts(organization_id,patient_id,response_id,rule_code,priority,recommended_action,status) VALUES(a.organization_id,a.patient_id,result,'CUSTOM_CHECKIN','high','Revisar las respuestas señaladas por las reglas del check-in.','unresolved');
 END IF;
 INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details) VALUES(auth.uid(),a.organization_id,'SUBMIT_QUESTION_CHECKIN','check_in_response',result,'{}');
 RETURN result;
END; $$;
CREATE OR REPLACE VIEW api.daily_checkins WITH(security_invoker=true) AS SELECT a.id,a.patient_id,a.status,a.due_date,a.created_at,a.daily_fields,r.energy,r.adherence,r.help_requested,r.notes,r.created_at submitted_at,e.answers,a.questions,r.question_answers,r.alert_matches
FROM app.check_in_assignments a LEFT JOIN app.check_in_responses r ON r.assignment_id=a.id LEFT JOIN app.daily_checkin_extras e ON e.response_id=r.id WHERE security.daily_reader(a.patient_id);
REVOKE ALL ON FUNCTION api.get_checkin_questions(uuid),api.save_checkin_questions(uuid,jsonb,timestamptz),api.submit_question_checkin(uuid,jsonb),security.guard_question_response() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION api.get_checkin_questions(uuid),api.save_checkin_questions(uuid,jsonb,timestamptz),api.submit_question_checkin(uuid,jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
