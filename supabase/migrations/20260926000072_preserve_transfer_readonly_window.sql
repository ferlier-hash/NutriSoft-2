-- Honor the explicit 14-day read-only period after reassignment before disabling a clinic membership.
CREATE OR REPLACE FUNCTION api.set_admin_professional_membership_status(p_organization_id uuid,p_user_id uuid,p_status text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_member app.organization_members%ROWTYPE;
BEGIN
 IF NOT security.is_current_platform_admin() THEN RAISE EXCEPTION 'Acceso no autorizado: requiere platform_admin'; END IF;
 IF p_status NOT IN ('active','inactive') OR EXISTS(SELECT 1 FROM app.user_platform_roles WHERE user_id=p_user_id) THEN RAISE EXCEPTION 'Cambio de estado no permitido.'; END IF;
 SELECT * INTO v_member FROM app.organization_members WHERE organization_id=p_organization_id AND user_id=p_user_id AND role='nutritionist' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'No se encontró esa membresía profesional.'; END IF;
 IF v_member.status=p_status THEN RETURN true; END IF;
 IF p_status='inactive' AND EXISTS(SELECT 1 FROM app.patient_professional_transfers t WHERE t.organization_id=p_organization_id AND t.previous_professional_user_id=p_user_id AND t.revoked_at IS NULL AND t.read_only_until>clock_timestamp()) THEN
   RAISE EXCEPTION 'Hay transferencias con acceso de sólo lectura vigente. Esperá a que termine el plazo de 14 días antes de suspender esta membresía.';
 END IF;
 -- Existing integrity trigger also blocks deactivation while current patient assignments remain.
 UPDATE app.organization_members SET status=p_status WHERE organization_id=p_organization_id AND user_id=p_user_id;
 INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details)
 VALUES(auth.uid(),p_organization_id,'SET_PROFESSIONAL_MEMBERSHIP_STATUS','professional_membership',v_member.id,
   jsonb_build_object('previous_status',v_member.status,'status',p_status,'scope','organization'));
 RETURN true;
END; $$;
REVOKE ALL ON FUNCTION api.set_admin_professional_membership_status(uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION api.set_admin_professional_membership_status(uuid,uuid,text) TO authenticated;
NOTIFY pgrst,'reload schema';
