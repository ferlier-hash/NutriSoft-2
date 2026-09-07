ALTER POLICY alerts_select_policy ON app.alerts USING (security.daily_professional(patient_id));

CREATE OR REPLACE FUNCTION api.acknowledge_alert(p_alert_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a app.alerts%ROWTYPE;
BEGIN
 SELECT * INTO a FROM app.alerts WHERE id=p_alert_id FOR UPDATE;
 IF a.id IS NULL OR NOT security.daily_professional(a.patient_id) OR NOT security.is_active_organization(a.organization_id) THEN RAISE EXCEPTION 'Alerta no disponible'; END IF;
 IF a.status<>'unresolved' THEN RAISE EXCEPTION 'El aviso ya cambió de estado. Actualizá la bandeja.'; END IF;
 UPDATE app.alerts SET status='acknowledged',acknowledged_by=auth.uid(),acknowledged_at=now() WHERE id=a.id;
 INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details) VALUES(auth.uid(),a.organization_id,'ACKNOWLEDGE_ALERT','alert',a.id,'{}');
 RETURN true;
END; $$;
CREATE OR REPLACE FUNCTION api.resolve_alert(p_alert_id uuid,p_notes text DEFAULT NULL) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a app.alerts%ROWTYPE;
BEGIN
 SELECT * INTO a FROM app.alerts WHERE id=p_alert_id FOR UPDATE;
 IF a.id IS NULL OR NOT security.daily_professional(a.patient_id) OR NOT security.is_active_organization(a.organization_id) THEN RAISE EXCEPTION 'Alerta no disponible'; END IF;
 IF a.status NOT IN ('unresolved','acknowledged') THEN RAISE EXCEPTION 'El aviso ya cambió de estado. Actualizá la bandeja.'; END IF;
 IF length(p_notes)>500 THEN RAISE EXCEPTION 'La nota admite hasta 500 caracteres'; END IF;
 UPDATE app.alerts SET status='resolved',resolved_by=auth.uid(),resolved_at=now(),resolution_notes=nullif(btrim(p_notes),'') WHERE id=a.id;
 INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details) VALUES(auth.uid(),a.organization_id,'RESOLVE_ALERT','alert',a.id,'{}');
 RETURN true;
END; $$;
CREATE OR REPLACE VIEW api.attention_inbox WITH(security_invoker=true) AS
SELECT a.id,a.organization_id,a.patient_id,a.response_id,a.rule_code,a.priority,a.recommended_action,a.status,a.created_at,p.first_name AS patient_first_name,p.last_name AS patient_last_name,
 a.acknowledged_at,a.resolved_at,a.resolution_notes,r.energy,r.adherence,r.help_requested,r.notes,r.question_answers,r.alert_matches,c.questions
FROM app.alerts a JOIN app.patients p ON p.id=a.patient_id AND p.organization_id=a.organization_id
LEFT JOIN app.check_in_responses r ON r.id=a.response_id AND r.patient_id=a.patient_id AND r.organization_id=a.organization_id
LEFT JOIN app.check_in_assignments c ON c.id=r.assignment_id
WHERE security.daily_professional(a.patient_id);
REVOKE ALL ON FUNCTION api.acknowledge_alert(uuid),api.resolve_alert(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION api.acknowledge_alert(uuid),api.resolve_alert(uuid,text) TO authenticated;
