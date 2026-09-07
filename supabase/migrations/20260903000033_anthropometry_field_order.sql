CREATE OR REPLACE FUNCTION api.save_anthropometric_field(p_org_id uuid, p_field_id uuid, p_label text, p_unit text, p_position integer, p_status text DEFAULT 'active')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id uuid; v_old_position integer;
BEGIN
  IF security.is_current_platform_admin() OR NOT security.has_current_org_role(p_org_id, ARRAY['nutritionist','organization_owner']) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
  PERFORM id FROM app.professional_anthropometric_fields WHERE organization_id=p_org_id AND nutritionist_user_id=auth.uid() ORDER BY id FOR UPDATE;
  IF p_field_id IS NULL THEN
    INSERT INTO app.professional_anthropometric_fields(organization_id,nutritionist_user_id,label,unit,position,status)
    VALUES(p_org_id,auth.uid(),trim(p_label),trim(p_unit),p_position,p_status) RETURNING id INTO v_id;
  ELSE
    SELECT position INTO v_old_position FROM app.professional_anthropometric_fields WHERE id=p_field_id AND organization_id=p_org_id AND nutritionist_user_id=auth.uid();
    IF NOT FOUND THEN RAISE EXCEPTION 'Campo no disponible.'; END IF;
    UPDATE app.professional_anthropometric_fields SET position=v_old_position
    WHERE organization_id=p_org_id AND nutritionist_user_id=auth.uid() AND position=p_position AND id<>p_field_id;
    UPDATE app.professional_anthropometric_fields SET position=p_position,status=p_status
    WHERE id=p_field_id RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION api.save_anthropometric_field(uuid,uuid,text,text,integer,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION api.save_anthropometric_field(uuid,uuid,text,text,integer,text) TO authenticated;
