-- Migration: 20260804000007_phase_2_1_authorization_hardening.sql
-- Description: Privilegio mínimo, eliminación de DML directo y funciones de seguridad de usuario actual (ADMIN-01..03, GRANT-01..12, SEC-01..07)

-- 1. Eliminar acceso de platform_admin a perfiles ajenos (ADMIN-01, ADMIN-02, ADMIN-03)
DROP POLICY IF EXISTS "platform_admin_select_profiles" ON app.profiles;

-- 2. Revocar privilegios DML directos de escritura sobre el esquema app para authenticated (GRANT-01..11)
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app FROM authenticated;
REVOKE USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app FROM authenticated;

-- Eliminar políticas de escritura directa en app (GRANT-10)
DROP POLICY IF EXISTS "patient_insert_own_response" ON app.check_in_responses;
DROP POLICY IF EXISTS "alerts_update_policy" ON app.alerts;

-- 3. Funciones de seguridad de contexto usuario actual (SEC-01..07)
CREATE OR REPLACE FUNCTION security.is_current_platform_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM app.user_platform_roles
    WHERE user_id = auth.uid() AND role = 'platform_admin'
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION security.is_current_platform_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION security.is_current_platform_admin() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION security.is_current_active_org_member(p_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_org_id IS NULL OR auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM app.organization_members om
    JOIN app.organizations o ON o.id = om.organization_id
    WHERE om.organization_id = p_org_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
      AND o.status = 'active'
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION security.is_current_active_org_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION security.is_current_active_org_member(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION security.has_current_org_role(p_org_id uuid, p_allowed_roles text[])
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_org_id IS NULL OR auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM app.organization_members om
    JOIN app.organizations o ON o.id = om.organization_id
    WHERE om.organization_id = p_org_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
      AND om.role = ANY(p_allowed_roles)
      AND o.status = 'active'
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION security.has_current_org_role(uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION security.has_current_org_role(uuid, text[]) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION security.is_current_assigned_nutritionist(p_patient_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_patient_id IS NULL OR auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM app.patient_assignments pa
    JOIN app.patients p ON p.id = pa.patient_id AND p.organization_id = pa.organization_id
    JOIN app.organizations o ON o.id = p.organization_id
    WHERE pa.patient_id = p_patient_id
      AND pa.nutritionist_user_id = auth.uid()
      AND pa.status = 'active'
      AND p.status = 'active'
      AND o.status = 'active'
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION security.is_current_assigned_nutritionist(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION security.is_current_assigned_nutritionist(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION security.has_current_patient_portal_access(p_patient_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_patient_id IS NULL OR auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM app.patient_portal_access ppa
    JOIN app.patients p ON p.id = ppa.patient_id AND p.organization_id = ppa.organization_id
    JOIN app.organizations o ON o.id = p.organization_id
    WHERE ppa.patient_id = p_patient_id
      AND ppa.user_id = auth.uid()
      AND ppa.status = 'active'
      AND p.status = 'active'
      AND o.status = 'active'
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION security.has_current_patient_portal_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION security.has_current_patient_portal_access(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION security.can_current_read_patient(p_patient_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  IF p_patient_id IS NULL OR auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT organization_id INTO v_org_id
  FROM app.patients
  WHERE id = p_patient_id;

  IF v_org_id IS NULL THEN
    RETURN false;
  END IF;

  IF security.has_current_patient_portal_access(p_patient_id) THEN
    RETURN true;
  END IF;

  IF security.has_current_org_role(v_org_id, ARRAY['organization_owner']) THEN
    RETURN true;
  END IF;

  IF security.is_current_assigned_nutritionist(p_patient_id) THEN
    RETURN true;
  END IF;

  IF security.has_current_org_role(v_org_id, ARRAY['assistant']) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;
REVOKE EXECUTE ON FUNCTION security.can_current_read_patient(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION security.can_current_read_patient(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION security.can_current_read_clinical_data(p_patient_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  IF p_patient_id IS NULL OR auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT organization_id INTO v_org_id
  FROM app.patients
  WHERE id = p_patient_id;

  IF v_org_id IS NULL THEN
    RETURN false;
  END IF;

  IF security.has_current_org_role(v_org_id, ARRAY['organization_owner']) THEN
    RETURN true;
  END IF;

  IF security.is_current_assigned_nutritionist(p_patient_id) THEN
    RETURN true;
  END IF;

  IF security.has_current_patient_portal_access(p_patient_id) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;
REVOKE EXECUTE ON FUNCTION security.can_current_read_clinical_data(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION security.can_current_read_clinical_data(uuid) TO authenticated, service_role;

-- Revocar privilegios de funciones parametrizadas con user_id para authenticated (SEC-05)
REVOKE EXECUTE ON FUNCTION security.is_platform_admin(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION security.is_active_org_member(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION security.has_org_role(uuid, text[], uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION security.is_assigned_nutritionist(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION security.has_patient_portal_access(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION security.can_read_patient(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION security.can_read_clinical_data(uuid, uuid) FROM authenticated;

-- Actualizar políticas RLS para usar las funciones de usuario actual (SEC-03)
ALTER POLICY "platform_admin_select_organizations" ON app.organizations USING (security.is_current_platform_admin());
ALTER POLICY "members_select_own_organization" ON app.organizations USING (security.is_current_active_org_member(id));
ALTER POLICY "platform_admin_select_platform_roles" ON app.user_platform_roles USING (user_id = auth.uid() OR security.is_current_platform_admin());
ALTER POLICY "members_select_own_org_members" ON app.organization_members USING (security.is_current_active_org_member(organization_id));
ALTER POLICY "patients_select_policy" ON app.patients USING (security.can_current_read_patient(id));
ALTER POLICY "owner_select_portal_access" ON app.patient_portal_access USING (security.has_current_org_role(organization_id, ARRAY['organization_owner']));
ALTER POLICY "assignments_select_policy" ON app.patient_assignments USING (
  security.has_current_org_role(organization_id, ARRAY['organization_owner']) OR
  nutritionist_user_id = auth.uid() OR
  security.has_current_patient_portal_access(patient_id)
);
ALTER POLICY "checkin_assignments_select_policy" ON app.check_in_assignments USING (
  security.has_current_org_role(organization_id, ARRAY['organization_owner', 'assistant']) OR
  security.is_current_assigned_nutritionist(patient_id) OR
  security.has_current_patient_portal_access(patient_id)
);
ALTER POLICY "checkin_responses_select_policy" ON app.check_in_responses USING (security.can_current_read_clinical_data(patient_id));
ALTER POLICY "alerts_select_policy" ON app.alerts USING (
  security.has_current_org_role(organization_id, ARRAY['organization_owner']) OR
  security.is_current_assigned_nutritionist(patient_id)
);
ALTER POLICY "recommendations_select_policy" ON app.patient_recommendations USING (
  security.has_current_org_role(organization_id, ARRAY['organization_owner']) OR
  security.is_current_assigned_nutritionist(patient_id) OR
  (security.has_current_patient_portal_access(patient_id) AND status = 'published')
);
ALTER POLICY "owner_select_audit_logs" ON app.audit_logs USING (
  security.has_current_org_role(organization_id, ARRAY['organization_owner'])
);
