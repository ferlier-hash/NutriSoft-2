-- Auditable recommendation library without storing clinical text or patient identities in audit details.
CREATE OR REPLACE FUNCTION api.save_daily_phrase(p_id uuid,p_org uuid,p_text text,p_delete boolean DEFAULT false,p_expected timestamptz DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid; v_created boolean:=p_id IS NULL;
BEGIN
 IF security.is_current_platform_admin() OR NOT security.has_current_org_role(p_org,ARRAY['nutritionist']) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
 IF p_id IS NULL THEN INSERT INTO app.daily_phrases(organization_id,owner_user_id,text) VALUES(p_org,auth.uid(),trim(p_text)) RETURNING id INTO v_id;
 ELSE UPDATE app.daily_phrases SET text=trim(p_text),deleted=p_delete,updated_at=clock_timestamp() WHERE id=p_id AND owner_user_id=auth.uid() AND organization_id=p_org AND NOT deleted AND updated_at=p_expected RETURNING id INTO v_id;
 IF v_id IS NULL THEN RAISE EXCEPTION 'Frase no disponible o modificada. Volvé a abrirla.'; END IF;
 END IF;
 IF p_delete THEN DELETE FROM app.daily_phrase_assignments WHERE phrase_id=v_id; END IF;
 INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details) VALUES(auth.uid(),p_org,CASE WHEN p_delete THEN 'DELETE_DAILY_PHRASE' WHEN v_created THEN 'CREATE_DAILY_PHRASE' ELSE 'UPDATE_DAILY_PHRASE' END,'daily_phrase',v_id,'{}'::jsonb);
 RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION api.assign_daily_phrase(p_id uuid,p_patients uuid[]) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_f app.daily_phrases;v_patient uuid;
BEGIN
 SELECT * INTO v_f FROM app.daily_phrases WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR v_f.deleted OR v_f.owner_user_id<>auth.uid() OR security.is_current_platform_admin() OR NOT security.has_current_org_role(v_f.organization_id,ARRAY['nutritionist']) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
 FOREACH v_patient IN ARRAY p_patients LOOP IF NOT security.daily_professional(v_patient) OR NOT EXISTS(SELECT 1 FROM app.patients WHERE id=v_patient AND organization_id=v_f.organization_id) THEN RAISE EXCEPTION 'Paciente no autorizado.'; END IF; END LOOP;
 DELETE FROM app.daily_phrase_assignments WHERE phrase_id=p_id AND security.daily_professional(patient_id) AND NOT patient_id=ANY(p_patients);
 FOR v_patient IN SELECT DISTINCT unnest(p_patients) ORDER BY 1 LOOP INSERT INTO app.daily_phrase_assignments(patient_id,phrase_id) VALUES(v_patient,p_id) ON CONFLICT(patient_id) DO UPDATE SET phrase_id=excluded.phrase_id; END LOOP;
 INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details) VALUES(auth.uid(),v_f.organization_id,'ASSIGN_DAILY_PHRASE','daily_phrase',p_id,jsonb_build_object('assignmentCount',coalesce(array_length(p_patients,1),0)));
END; $$;
