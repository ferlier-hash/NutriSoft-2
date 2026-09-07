CREATE TABLE app.patient_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE RESTRICT,
  patient_id uuid NOT NULL REFERENCES app.patients(id) ON DELETE RESTRICT, invited_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  nutritionist_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT, email text NOT NULL, status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked')),
  created_at timestamptz NOT NULL DEFAULT now(), accepted_at timestamptz NULL,
  UNIQUE (organization_id, patient_id), UNIQUE (organization_id, email)
);
ALTER TABLE app.patient_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY patient_invitations_professional_select ON app.patient_invitations FOR SELECT TO authenticated USING (nutritionist_user_id=auth.uid() AND security.is_current_active_org_member(organization_id));
GRANT SELECT ON app.patient_invitations TO authenticated;

CREATE OR REPLACE FUNCTION api.create_patient_invitation_for_service(p_org_id uuid, p_nutritionist_user_id uuid, p_invited_user_id uuid, p_first_name text, p_last_name text, p_email text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF p_first_name IS NULL OR nullif(trim(p_first_name),'') IS NULL OR p_last_name IS NULL OR nullif(trim(p_last_name),'') IS NULL OR p_email IS NULL OR nullif(trim(p_email),'') IS NULL THEN RAISE EXCEPTION 'Nombre, apellido y correo son obligatorios'; END IF;
  INSERT INTO app.patients (organization_id, first_name, last_name, email, status, created_by) VALUES (p_org_id, trim(p_first_name), trim(p_last_name), lower(trim(p_email)), 'active', p_nutritionist_user_id) RETURNING id INTO v_id;
  INSERT INTO app.patient_assignments (organization_id, patient_id, nutritionist_user_id, is_primary, status) VALUES (p_org_id, v_id, p_nutritionist_user_id, true, 'active');
  INSERT INTO app.patient_portal_access (organization_id, patient_id, user_id, status) VALUES (p_org_id, v_id, p_invited_user_id, 'active');
  INSERT INTO app.patient_invitations (organization_id, patient_id, invited_user_id, nutritionist_user_id, email) VALUES (p_org_id, v_id, p_invited_user_id, p_nutritionist_user_id, lower(trim(p_email)));
  INSERT INTO app.audit_logs (actor_id, organization_id, action, resource_type, resource_id, details) VALUES (p_nutritionist_user_id, p_org_id, 'CREATE_PATIENT_INVITATION', 'patient', v_id, '{}'::jsonb);
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION api.create_patient_invitation_for_service(uuid,uuid,uuid,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.create_patient_invitation_for_service(uuid,uuid,uuid,text,text,text) TO service_role;
