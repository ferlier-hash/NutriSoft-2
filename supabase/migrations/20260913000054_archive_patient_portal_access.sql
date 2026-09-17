-- Archivar una ficha también suspende el acceso operativo del paciente.
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
  IF p_status='archived' THEN
    UPDATE app.patient_portal_access SET status='revoked',revoked_at=clock_timestamp()
      WHERE organization_id=patient.organization_id AND patient_id=patient.id AND status='active';
  ELSE
    UPDATE app.patient_portal_access SET status='active',revoked_at=NULL
      WHERE organization_id=patient.organization_id AND patient_id=patient.id;
  END IF;
  INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details)
    VALUES(auth.uid(),patient.organization_id,CASE WHEN p_status='archived' THEN 'ARCHIVE_PATIENT' ELSE 'REACTIVATE_PATIENT' END,'patient',patient.id,jsonb_build_object('status',p_status));
END; $$;
REVOKE ALL ON FUNCTION api.set_my_patient_status(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION api.set_my_patient_status(uuid,text) TO authenticated;
