CREATE OR REPLACE FUNCTION api.get_pending_patient_invitation_for_service(
  p_org_id uuid,
  p_email text
)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT patient_id
  FROM app.patient_invitations
  WHERE organization_id = p_org_id
    AND email = lower(trim(p_email))
    AND status = 'pending'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION api.get_pending_patient_invitation_for_service(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.get_pending_patient_invitation_for_service(uuid, text) TO service_role;
