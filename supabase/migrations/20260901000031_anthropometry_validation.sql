CREATE OR REPLACE FUNCTION api.save_patient_anthropometric_revision(p_revision_id uuid, p_patient_id uuid, p_recorded_on date, p_values jsonb, p_note text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_org_id uuid; v_id uuid;
BEGIN
  SELECT organization_id INTO v_org_id FROM app.patients WHERE id = p_patient_id;
  IF v_org_id IS NULL OR NOT security.is_current_assigned_nutritionist(p_patient_id) THEN RAISE EXCEPTION 'No autorizado para esta ficha.'; END IF;
  IF p_recorded_on IS NULL OR p_recorded_on > CURRENT_DATE OR jsonb_typeof(p_values) <> 'object' OR p_values = '{}'::jsonb OR EXISTS (SELECT 1 FROM jsonb_each(p_values) AS item WHERE jsonb_typeof(item.value) <> 'number' OR (item.value #>> '{}')::numeric <= 0) THEN RAISE EXCEPTION 'La revisión debe tener fecha válida y valores numéricos positivos.'; END IF;
  IF p_revision_id IS NULL THEN INSERT INTO app.patient_anthropometric_revisions(organization_id,patient_id,recorded_by_nutritionist_user_id,recorded_on,values,note) VALUES(v_org_id,p_patient_id,auth.uid(),p_recorded_on,p_values,NULLIF(trim(p_note),'')) RETURNING id INTO v_id;
  ELSE UPDATE app.patient_anthropometric_revisions SET recorded_on=p_recorded_on,values=p_values,note=NULLIF(trim(p_note),'') WHERE id=p_revision_id AND patient_id=p_patient_id AND recorded_by_nutritionist_user_id=auth.uid() RETURNING id INTO v_id; IF v_id IS NULL THEN RAISE EXCEPTION 'No autorizado para editar esta revisión.'; END IF;
  END IF;
  RETURN v_id;
END; $$;
