ALTER TABLE app.check_in_assignments ADD COLUMN is_free boolean NOT NULL DEFAULT false;
DROP INDEX app.uq_pending_checkin_assignment;
CREATE UNIQUE INDEX uq_pending_checkin_assignment ON app.check_in_assignments(organization_id,patient_id) WHERE status='pending' AND NOT is_free;
CREATE FUNCTION api.get_free_checkin(p_patient uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF security.is_current_platform_admin() OR NOT security.has_current_patient_portal_access(p_patient) THEN RAISE EXCEPTION 'No autorizado'; END IF;
 SELECT jsonb_build_object('questions',(SELECT coalesce(jsonb_agg(q),'[]') FROM jsonb_array_elements(l.questions) q WHERE (q->>'enabled')::boolean AND NOT (q->>'archived')::boolean),'version',l.updated_at)
 INTO result FROM app.patient_assignments a JOIN app.checkin_question_libraries l ON l.organization_id=a.organization_id AND l.owner_user_id=a.nutritionist_user_id
 WHERE a.patient_id=p_patient AND a.status='active' AND security.daily_patient_author(p_patient,a.nutritionist_user_id);
 RETURN coalesce(result,jsonb_build_object('questions','[]'::jsonb,'version',NULL));
END; $$;
CREATE FUNCTION api.submit_free_checkin(p_patient uuid,p_request uuid,p_version timestamptz,p_answers jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE form jsonb; existing app.check_in_assignments; result uuid; org uuid;
BEGIN
 IF security.is_current_platform_admin() OR NOT security.has_current_patient_portal_access(p_patient) THEN RAISE EXCEPTION 'No autorizado'; END IF;
 IF p_request IS NULL THEN RAISE EXCEPTION 'Solicitud inválida'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 SELECT * INTO existing FROM app.check_in_assignments WHERE id=p_request;
 IF existing.id IS NOT NULL THEN
 IF existing.patient_id<>p_patient OR existing.created_by<>auth.uid() OR NOT existing.is_free THEN RAISE EXCEPTION 'Solicitud inválida'; END IF;
 SELECT id INTO result FROM app.check_in_responses WHERE assignment_id=p_request;
 IF result IS NOT NULL THEN RETURN result; END IF;
 RAISE EXCEPTION 'Reintentá el envío';
 END IF;
 form:=api.get_free_checkin(p_patient);
 IF jsonb_array_length(form->'questions')=0 THEN RAISE EXCEPTION 'Tu profesional todavía no habilitó preguntas.'; END IF;
 IF p_version IS DISTINCT FROM (form->>'version')::timestamptz THEN RAISE EXCEPTION 'Las preguntas cambiaron. Cerrá y volvé a abrir el formulario.'; END IF;
 SELECT organization_id INTO org FROM app.patients WHERE id=p_patient;
 INSERT INTO app.check_in_assignments(id,organization_id,patient_id,created_by,status,questions,is_free) VALUES(p_request,org,p_patient,auth.uid(),'pending',form->'questions',true);
 RETURN api.submit_question_checkin(p_request,p_answers);
END; $$;
REVOKE ALL ON FUNCTION api.get_free_checkin(uuid),api.submit_free_checkin(uuid,uuid,timestamptz,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION api.get_free_checkin(uuid),api.submit_free_checkin(uuid,uuid,timestamptz,jsonb) TO authenticated;
