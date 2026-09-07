-- Completa de forma idempotente el alta de un paciente al iniciar sesión por primera vez.
-- No acepta identificadores del cliente: la identidad surge exclusivamente de auth.uid().
CREATE OR REPLACE FUNCTION api.complete_patient_invitation()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invitation app.patient_invitations%ROWTYPE;
  v_user auth.users%ROWTYPE;
  v_full_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticación requerida';
  END IF;

  SELECT * INTO v_invitation
  FROM app.patient_invitations
  WHERE invited_user_id = auth.uid()
    AND status = 'pending'
  ORDER BY created_at
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  SELECT * INTO v_user
  FROM auth.users
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cuenta no encontrada';
  END IF;

  SELECT concat_ws(' ', first_name, last_name)
    INTO v_full_name
  FROM app.patients
  WHERE id = v_invitation.patient_id
    AND organization_id = v_invitation.organization_id;

  IF v_full_name IS NULL OR btrim(v_full_name) = '' THEN
    RAISE EXCEPTION 'Paciente de invitación no encontrado';
  END IF;

  INSERT INTO app.profiles (id, email, full_name)
  VALUES (v_user.id, lower(v_user.email), v_full_name)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(NULLIF(app.profiles.full_name, ''), EXCLUDED.full_name);

  UPDATE app.patient_invitations
     SET status = 'accepted',
         accepted_at = COALESCE(accepted_at, now())
   WHERE id = v_invitation.id;

  INSERT INTO app.audit_logs (actor_id, organization_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), v_invitation.organization_id, 'ACCEPT_PATIENT_INVITATION', 'patient', v_invitation.patient_id, '{}'::jsonb);

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION api.complete_patient_invitation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.complete_patient_invitation() TO authenticated;
