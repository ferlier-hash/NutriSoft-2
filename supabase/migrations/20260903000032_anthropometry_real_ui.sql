-- Complete the real anthropometry API; clinical access remains assignment-only.
GRANT SELECT ON app.professional_anthropometric_fields, app.patient_anthropometric_revisions TO authenticated;
DROP POLICY anthropometric_revisions_assigned_professional ON app.patient_anthropometric_revisions;
CREATE POLICY anthropometric_revisions_assigned_professional ON app.patient_anthropometric_revisions FOR SELECT USING (
  NOT security.is_current_platform_admin() AND security.is_current_assigned_nutritionist(patient_id)
  AND security.has_current_org_role(organization_id, ARRAY['nutritionist','organization_owner'])
);
DROP POLICY anthropometric_fields_own_professional ON app.professional_anthropometric_fields;
CREATE POLICY anthropometric_fields_own_professional ON app.professional_anthropometric_fields FOR SELECT USING (
  NOT security.is_current_platform_admin() AND nutritionist_user_id = auth.uid()
  AND security.has_current_org_role(organization_id, ARRAY['nutritionist','organization_owner'])
);
CREATE OR REPLACE VIEW api.anthropometry_patients WITH (security_invoker = true) AS
SELECT id, organization_id, first_name, last_name FROM app.patients
WHERE NOT security.is_current_platform_admin() AND security.is_current_assigned_nutritionist(id)
AND security.has_current_org_role(organization_id, ARRAY['nutritionist','organization_owner']);
GRANT SELECT ON api.anthropometry_patients TO authenticated;
CREATE OR REPLACE VIEW api.professional_patient_anthropometry WITH (security_invoker = true) AS
SELECT r.id, r.patient_id, r.recorded_on, r.values, r.note, r.created_at, r.updated_at,
  r.recorded_by_nutritionist_user_id = auth.uid() AS can_edit
FROM app.patient_anthropometric_revisions r;

CREATE OR REPLACE FUNCTION api.save_anthropometric_field(p_org_id uuid, p_field_id uuid, p_label text, p_unit text, p_position integer, p_status text DEFAULT 'active')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id uuid;
BEGIN
  IF security.is_current_platform_admin() OR NOT security.has_current_org_role(p_org_id, ARRAY['nutritionist','organization_owner']) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
  IF p_field_id IS NULL THEN
    INSERT INTO app.professional_anthropometric_fields(organization_id,nutritionist_user_id,label,unit,position,status)
    VALUES(p_org_id,auth.uid(),trim(p_label),trim(p_unit),p_position,p_status) RETURNING id INTO v_id;
  ELSE
    -- Label and unit are immutable so historical values retain their meaning.
    UPDATE app.professional_anthropometric_fields SET position=p_position,status=p_status
    WHERE id=p_field_id AND organization_id=p_org_id AND nutritionist_user_id=auth.uid() RETURNING id INTO v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'Campo no disponible.'; END IF;
  END IF;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION api.save_patient_anthropometric_revision(p_revision_id uuid, p_patient_id uuid, p_recorded_on date, p_values jsonb, p_note text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_org_id uuid; v_id uuid; v_previous jsonb; v_item record;
BEGIN
  SELECT organization_id INTO v_org_id FROM app.patients WHERE id=p_patient_id;
  IF v_org_id IS NULL OR security.is_current_platform_admin() OR NOT security.is_current_assigned_nutritionist(p_patient_id)
     OR NOT security.has_current_org_role(v_org_id, ARRAY['nutritionist','organization_owner']) THEN RAISE EXCEPTION 'No autorizado para esta ficha.'; END IF;
  IF p_revision_id IS NOT NULL THEN
    SELECT values INTO v_previous FROM app.patient_anthropometric_revisions WHERE id=p_revision_id AND patient_id=p_patient_id AND recorded_by_nutritionist_user_id=auth.uid() FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'No autorizado para editar esta revisión.'; END IF;
  END IF;
  IF p_recorded_on IS NULL OR p_recorded_on > CURRENT_DATE OR p_values IS NULL OR jsonb_typeof(p_values) <> 'object' OR p_values='{}'::jsonb THEN RAISE EXCEPTION 'Indicá una fecha no futura y al menos una medición.'; END IF;
  FOR v_item IN SELECT * FROM jsonb_each(p_values) LOOP
    IF jsonb_typeof(v_item.value) <> 'number' THEN RAISE EXCEPTION 'Las mediciones deben ser numéricas.'; END IF;
    IF (v_item.value #>> '{}')::numeric <= 0 OR (v_item.value #>> '{}')::numeric > 1000000 THEN RAISE EXCEPTION 'Las mediciones deben ser positivas y menores o iguales a 1000000.'; END IF;
    IF v_item.key = ANY(ARRAY['bodyFatPercentage','muscleMassPercentage','hydrationPercentage','visceralFatPercentage']) AND (v_item.value #>> '{}')::numeric > 100 THEN RAISE EXCEPTION 'Los porcentajes no pueden superar 100.'; END IF;
    IF NOT v_item.key = ANY(ARRAY['heightCm','weightKg','sizeCm','waistCm','bodyFatPercentage','muscleMassPercentage','hydrationPercentage','skinfoldMm','visceralFatPercentage'])
      AND NOT EXISTS (SELECT 1 FROM app.professional_anthropometric_fields f WHERE f.id::text=v_item.key AND f.organization_id=v_org_id AND f.nutritionist_user_id=auth.uid() AND (f.status='active' OR coalesce(v_previous ? v_item.key,false))) THEN
      RAISE EXCEPTION 'Campo no disponible para esta revisión.';
    END IF;
  END LOOP;
  IF p_revision_id IS NULL THEN
    INSERT INTO app.patient_anthropometric_revisions(organization_id,patient_id,recorded_by_nutritionist_user_id,recorded_on,values,note) VALUES(v_org_id,p_patient_id,auth.uid(),p_recorded_on,p_values,NULLIF(trim(p_note),'')) RETURNING id INTO v_id;
  ELSE
    UPDATE app.patient_anthropometric_revisions SET recorded_on=p_recorded_on,values=p_values,note=NULLIF(trim(p_note),'') WHERE id=p_revision_id RETURNING id INTO v_id;
  END IF;
  INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details)
  VALUES(auth.uid(),v_org_id,'SAVE_ANTHROPOMETRY','anthropometric_revision',v_id,'{}');
  RETURN v_id;
END; $$;
CREATE OR REPLACE FUNCTION api.delete_patient_anthropometric_revision(p_revision_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_org_id uuid;
BEGIN
  DELETE FROM app.patient_anthropometric_revisions r WHERE r.id=p_revision_id AND r.recorded_by_nutritionist_user_id=auth.uid()
    AND NOT security.is_current_platform_admin() AND security.is_current_assigned_nutritionist(r.patient_id)
    AND security.has_current_org_role(r.organization_id, ARRAY['nutritionist','organization_owner']) RETURNING organization_id INTO v_org_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'No autorizado para eliminar esta revisión.'; END IF;
  INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details)
  VALUES(auth.uid(),v_org_id,'DELETE_ANTHROPOMETRY','anthropometric_revision',p_revision_id,'{}');
END; $$;
REVOKE ALL ON FUNCTION api.save_anthropometric_field(uuid,uuid,text,text,integer,text), api.save_patient_anthropometric_revision(uuid,uuid,date,jsonb,text), api.delete_patient_anthropometric_revision(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION api.save_anthropometric_field(uuid,uuid,text,text,integer,text), api.save_patient_anthropometric_revision(uuid,uuid,date,jsonb,text), api.delete_patient_anthropometric_revision(uuid) TO authenticated;
