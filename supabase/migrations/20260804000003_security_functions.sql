-- Migration: 20260804000003_security_functions.sql
-- Description: Funciones auxiliares de seguridad y autorización en el esquema security

-- 1. security.is_platform_admin (SEC-01, SEC-02)
CREATE OR REPLACE FUNCTION security.is_platform_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM app.user_platform_roles
    WHERE user_id = p_user_id AND role = 'platform_admin'
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION security.is_platform_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION security.is_platform_admin(uuid) TO authenticated, service_role;

-- 2. security.is_active_organization (SEC-01, SEC-05)
CREATE OR REPLACE FUNCTION security.is_active_organization(p_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_org_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM app.organizations
    WHERE id = p_org_id AND status = 'active'
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION security.is_active_organization(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION security.is_active_organization(uuid) TO authenticated, service_role;

-- 3. security.is_active_org_member (SEC-01)
CREATE OR REPLACE FUNCTION security.is_active_org_member(p_org_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_org_id IS NULL OR p_user_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM app.organization_members om
    JOIN app.organizations o ON o.id = om.organization_id
    WHERE om.organization_id = p_org_id
      AND om.user_id = p_user_id
      AND om.status = 'active'
      AND o.status = 'active'
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION security.is_active_org_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION security.is_active_org_member(uuid, uuid) TO authenticated, service_role;

-- 4. security.has_org_role (SEC-01)
CREATE OR REPLACE FUNCTION security.has_org_role(p_org_id uuid, p_allowed_roles text[], p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_org_id IS NULL OR p_user_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM app.organization_members om
    JOIN app.organizations o ON o.id = om.organization_id
    WHERE om.organization_id = p_org_id
      AND om.user_id = p_user_id
      AND om.status = 'active'
      AND om.role = ANY(p_allowed_roles)
      AND o.status = 'active'
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION security.has_org_role(uuid, text[], uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION security.has_org_role(uuid, text[], uuid) TO authenticated, service_role;

-- 5. security.is_assigned_nutritionist (SEC-01)
CREATE OR REPLACE FUNCTION security.is_assigned_nutritionist(p_patient_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_patient_id IS NULL OR p_user_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM app.patient_assignments pa
    JOIN app.patients p ON p.id = pa.patient_id AND p.organization_id = pa.organization_id
    JOIN app.organizations o ON o.id = p.organization_id
    WHERE pa.patient_id = p_patient_id
      AND pa.nutritionist_user_id = p_user_id
      AND pa.status = 'active'
      AND p.status = 'active'
      AND o.status = 'active'
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION security.is_assigned_nutritionist(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION security.is_assigned_nutritionist(uuid, uuid) TO authenticated, service_role;

-- 6. security.has_patient_portal_access (SEC-01)
CREATE OR REPLACE FUNCTION security.has_patient_portal_access(p_patient_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_patient_id IS NULL OR p_user_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM app.patient_portal_access ppa
    JOIN app.patients p ON p.id = ppa.patient_id AND p.organization_id = ppa.organization_id
    JOIN app.organizations o ON o.id = p.organization_id
    WHERE ppa.patient_id = p_patient_id
      AND ppa.user_id = p_user_id
      AND ppa.status = 'active'
      AND p.status = 'active'
      AND o.status = 'active'
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION security.has_patient_portal_access(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION security.has_patient_portal_access(uuid, uuid) TO authenticated, service_role;

-- 7. security.can_read_patient (SEC-01)
CREATE OR REPLACE FUNCTION security.can_read_patient(p_patient_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  IF p_patient_id IS NULL OR p_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT organization_id INTO v_org_id
  FROM app.patients
  WHERE id = p_patient_id;

  IF v_org_id IS NULL THEN
    RETURN false;
  END IF;

  -- 1. Es el paciente mismo con acceso activo
  IF security.has_patient_portal_access(p_patient_id, p_user_id) THEN
    RETURN true;
  END IF;

  -- 2. Es owner de la organización activa del paciente
  IF security.has_org_role(v_org_id, ARRAY['organization_owner'], p_user_id) THEN
    RETURN true;
  END IF;

  -- 3. Es nutricionista asignado al paciente
  IF security.is_assigned_nutritionist(p_patient_id, p_user_id) THEN
    RETURN true;
  END IF;

  -- 4. Es asistente activo de la organización (para directorio básico)
  IF security.has_org_role(v_org_id, ARRAY['assistant'], p_user_id) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;
REVOKE EXECUTE ON FUNCTION security.can_read_patient(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION security.can_read_patient(uuid, uuid) TO authenticated, service_role;

-- 8. security.can_read_clinical_data (SEC-01)
CREATE OR REPLACE FUNCTION security.can_read_clinical_data(p_patient_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  IF p_patient_id IS NULL OR p_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT organization_id INTO v_org_id
  FROM app.patients
  WHERE id = p_patient_id;

  IF v_org_id IS NULL THEN
    RETURN false;
  END IF;

  -- 1. Owner de la organización activa
  IF security.has_org_role(v_org_id, ARRAY['organization_owner'], p_user_id) THEN
    RETURN true;
  END IF;

  -- 2. Nutricionista asignado al paciente
  IF security.is_assigned_nutritionist(p_patient_id, p_user_id) THEN
    RETURN true;
  END IF;

  -- 3. Paciente autenticado con acceso portal (únicamente para sus datos propios)
  IF security.has_patient_portal_access(p_patient_id, p_user_id) THEN
    RETURN true;
  END IF;

  -- Asistente y Platform Admin NO tienen acceso clínico
  RETURN false;
END;
$$;
REVOKE EXECUTE ON FUNCTION security.can_read_clinical_data(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION security.can_read_clinical_data(uuid, uuid) TO authenticated, service_role;
