-- Pacientes REAL: directorio multi-consultorio, invitaciones administrables,
-- turnos recientes y ciclo reversible de archivo/reactivación.

ALTER TABLE app.patient_invitations
  ADD COLUMN expires_at timestamptz,
  ADD COLUMN resent_at timestamptz,
  ADD COLUMN revoked_at timestamptz;

UPDATE app.patient_invitations
SET expires_at = created_at + interval '7 days'
WHERE expires_at IS NULL;

ALTER TABLE app.patient_invitations
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '7 days'),
  ALTER COLUMN expires_at SET NOT NULL;

CREATE OR REPLACE FUNCTION api.get_my_professional_patients()
RETURNS TABLE (
  id uuid, organization_id uuid, first_name text, last_name text, email text,
  phone text, birth_date date, city text, status text, updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p.id,p.organization_id,p.first_name,p.last_name,p.email,p.phone,
         p.birth_date,p.city,p.status,p.updated_at
  FROM app.patients p
  JOIN app.patient_assignments a ON a.organization_id=p.organization_id AND a.patient_id=p.id
  JOIN app.organization_members m ON m.organization_id=a.organization_id AND m.user_id=a.nutritionist_user_id
  JOIN app.organizations o ON o.id=p.organization_id
  WHERE auth.uid() IS NOT NULL
    AND NOT security.is_current_platform_admin()
    AND a.nutritionist_user_id=auth.uid() AND a.status='active'
    AND m.user_id=auth.uid() AND m.role='nutritionist' AND m.status='active'
    AND o.status='active'
  ORDER BY p.last_name,p.first_name;
$$;
REVOKE ALL ON FUNCTION api.get_my_professional_patients() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION api.get_my_professional_patients() TO authenticated;

CREATE OR REPLACE FUNCTION api.get_my_patient_invitations()
RETURNS TABLE (
  id uuid, organization_id uuid, patient_id uuid, first_name text, last_name text,
  email text, status text, created_at timestamptz, expires_at timestamptz,
  accepted_at timestamptz, resent_at timestamptz, revoked_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT i.id,i.organization_id,i.patient_id,p.first_name,p.last_name,i.email,
         CASE WHEN i.status='pending' AND i.expires_at<=now() THEN 'expired' ELSE i.status END,
         i.created_at,i.expires_at,i.accepted_at,i.resent_at,i.revoked_at
  FROM app.patient_invitations i
  JOIN app.patients p ON p.id=i.patient_id AND p.organization_id=i.organization_id
  JOIN app.organization_members m ON m.organization_id=i.organization_id AND m.user_id=auth.uid()
  JOIN app.organizations o ON o.id=i.organization_id
  WHERE auth.uid() IS NOT NULL AND NOT security.is_current_platform_admin()
    AND i.nutritionist_user_id=auth.uid()
    AND m.role='nutritionist' AND m.status='active' AND o.status='active'
  ORDER BY i.created_at DESC;
$$;
REVOKE ALL ON FUNCTION api.get_my_patient_invitations() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION api.get_my_patient_invitations() TO authenticated;

CREATE OR REPLACE FUNCTION api.revoke_my_patient_invitation(p_invitation uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE invitation app.patient_invitations%ROWTYPE;
BEGIN
  SELECT i.* INTO invitation FROM app.patient_invitations i
  JOIN app.organization_members m ON m.organization_id=i.organization_id AND m.user_id=auth.uid()
  JOIN app.organizations o ON o.id=i.organization_id
  WHERE i.id=p_invitation AND i.nutritionist_user_id=auth.uid() AND i.status='pending'
    AND m.role='nutritionist' AND m.status='active' AND o.status='active'
  FOR UPDATE OF i;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invitación no disponible o sin permiso.'; END IF;
  UPDATE app.patient_invitations SET status='revoked',revoked_at=clock_timestamp() WHERE id=invitation.id;
  UPDATE app.patients SET status='archived' WHERE id=invitation.patient_id;
  UPDATE app.patient_portal_access SET status='revoked',revoked_at=clock_timestamp()
    WHERE organization_id=invitation.organization_id AND patient_id=invitation.patient_id;
  INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details)
    VALUES(auth.uid(),invitation.organization_id,'REVOKE_PATIENT_INVITATION','patient',invitation.patient_id,'{}');
END; $$;
REVOKE ALL ON FUNCTION api.revoke_my_patient_invitation(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION api.revoke_my_patient_invitation(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION api.set_my_patient_status(p_patient uuid,p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE patient app.patients%ROWTYPE;
BEGIN
  IF p_status NOT IN ('active','archived') THEN RAISE EXCEPTION 'Estado no válido.'; END IF;
  SELECT p.* INTO patient FROM app.patients p
  JOIN app.patient_assignments a ON a.patient_id=p.id AND a.organization_id=p.organization_id
  JOIN app.organization_members m ON m.organization_id=p.organization_id AND m.user_id=auth.uid()
  JOIN app.organizations o ON o.id=p.organization_id
  WHERE p.id=p_patient AND a.nutritionist_user_id=auth.uid() AND a.status='active'
    AND m.role='nutritionist' AND m.status='active' AND o.status='active'
  FOR UPDATE OF p;
  IF NOT FOUND THEN RAISE EXCEPTION 'Paciente no disponible o sin permiso.'; END IF;
  IF p_status='active' AND EXISTS(SELECT 1 FROM app.patient_invitations i WHERE i.patient_id=patient.id AND i.status='revoked')
  THEN RAISE EXCEPTION 'La invitación fue cancelada. Generá una nueva invitación para reactivar el acceso.'; END IF;
  IF patient.status=p_status THEN RETURN; END IF;
  UPDATE app.patients SET status=p_status WHERE id=patient.id;
  INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details)
    VALUES(auth.uid(),patient.organization_id,CASE WHEN p_status='archived' THEN 'ARCHIVE_PATIENT' ELSE 'REACTIVATE_PATIENT' END,'patient',patient.id,jsonb_build_object('status',p_status));
END; $$;
REVOKE ALL ON FUNCTION api.set_my_patient_status(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION api.set_my_patient_status(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION api.renew_patient_invitation_for_service(p_patient uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'No autorizado'; END IF;
  UPDATE app.patient_invitations SET expires_at=clock_timestamp()+interval '7 days',resent_at=clock_timestamp()
  WHERE patient_id=p_patient AND status='pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Invitación pendiente no encontrada'; END IF;
END; $$;
REVOKE ALL ON FUNCTION api.renew_patient_invitation_for_service(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.renew_patient_invitation_for_service(uuid) TO service_role;

CREATE OR REPLACE FUNCTION api.complete_patient_invitation()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_invitation app.patient_invitations%ROWTYPE; v_user auth.users%ROWTYPE; v_full_name text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticación requerida'; END IF;
  SELECT * INTO v_invitation FROM app.patient_invitations
   WHERE invited_user_id=auth.uid() AND status='pending' AND expires_at>now()
   ORDER BY created_at LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT * INTO v_user FROM auth.users WHERE id=auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Cuenta no encontrada'; END IF;
  SELECT concat_ws(' ',first_name,last_name) INTO v_full_name FROM app.patients
   WHERE id=v_invitation.patient_id AND organization_id=v_invitation.organization_id;
  IF v_full_name IS NULL OR btrim(v_full_name)='' THEN RAISE EXCEPTION 'Paciente de invitación no encontrado'; END IF;
  INSERT INTO app.profiles(id,email,full_name) VALUES(v_user.id,lower(v_user.email),v_full_name)
   ON CONFLICT(id) DO UPDATE SET email=excluded.email,full_name=coalesce(nullif(app.profiles.full_name,''),excluded.full_name);
  UPDATE app.patient_invitations SET status='accepted',accepted_at=coalesce(accepted_at,now()) WHERE id=v_invitation.id;
  INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details)
   VALUES(auth.uid(),v_invitation.organization_id,'ACCEPT_PATIENT_INVITATION','patient',v_invitation.patient_id,'{}');
  RETURN true;
END; $$;
REVOKE ALL ON FUNCTION api.complete_patient_invitation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.complete_patient_invitation() TO authenticated;
