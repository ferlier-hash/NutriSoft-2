-- Migration: 20260804000004_rls_policies.sql
-- Description: Políticas RLS en todas las tablas del esquema app para platform_admin, owner, nutritionist, assistant y patient

-- 1. Habilitar RLS en todas las tablas del esquema app (RLS-01)
ALTER TABLE app.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.user_platform_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.patient_portal_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.patient_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.check_in_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.check_in_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.patient_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.audit_logs ENABLE ROW LEVEL SECURITY;

-- No se crean políticas para rol anon (RLS-02)

-- =================================================================
-- 2. POLÍTICAS SOBRE app.organizations
-- =================================================================
CREATE POLICY "platform_admin_select_organizations" ON app.organizations
  FOR SELECT TO authenticated
  USING (security.is_platform_admin(auth.uid()));

CREATE POLICY "members_select_own_organization" ON app.organizations
  FOR SELECT TO authenticated
  USING (security.is_active_org_member(id, auth.uid()));

-- =================================================================
-- 3. POLÍTICAS SOBRE app.profiles
-- =================================================================
CREATE POLICY "users_select_own_profile" ON app.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "platform_admin_select_profiles" ON app.profiles
  FOR SELECT TO authenticated
  USING (security.is_platform_admin(auth.uid()));

-- =================================================================
-- 4. POLÍTICAS SOBRE app.user_platform_roles
-- =================================================================
CREATE POLICY "platform_admin_select_platform_roles" ON app.user_platform_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR security.is_platform_admin(auth.uid()));

-- =================================================================
-- 5. POLÍTICAS SOBRE app.organization_members
-- =================================================================
CREATE POLICY "members_select_own_org_members" ON app.organization_members
  FOR SELECT TO authenticated
  USING (security.is_active_org_member(organization_id, auth.uid()));

-- =================================================================
-- 6. POLÍTICAS SOBRE app.patients (RLS-03, RLS-04, RLS-05, RLS-06, RLS-07)
-- =================================================================
CREATE POLICY "patients_select_policy" ON app.patients
  FOR SELECT TO authenticated
  USING (security.can_read_patient(id, auth.uid()));

-- =================================================================
-- 7. POLÍTICAS SOBRE app.patient_portal_access
-- =================================================================
CREATE POLICY "owner_select_portal_access" ON app.patient_portal_access
  FOR SELECT TO authenticated
  USING (security.has_org_role(organization_id, ARRAY['organization_owner'], auth.uid()));

CREATE POLICY "patient_select_own_portal_access" ON app.patient_portal_access
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- =================================================================
-- 8. POLÍTICAS SOBRE app.patient_assignments
-- =================================================================
CREATE POLICY "assignments_select_policy" ON app.patient_assignments
  FOR SELECT TO authenticated
  USING (
    security.has_org_role(organization_id, ARRAY['organization_owner'], auth.uid()) OR
    nutritionist_user_id = auth.uid() OR
    security.has_patient_portal_access(patient_id, auth.uid())
  );

-- =================================================================
-- 9. POLÍTICAS SOBRE app.check_in_assignments
-- =================================================================
CREATE POLICY "checkin_assignments_select_policy" ON app.check_in_assignments
  FOR SELECT TO authenticated
  USING (
    security.has_org_role(organization_id, ARRAY['organization_owner', 'assistant'], auth.uid()) OR
    security.is_assigned_nutritionist(patient_id, auth.uid()) OR
    security.has_patient_portal_access(patient_id, auth.uid())
  );

-- =================================================================
-- 10. POLÍTICAS SOBRE app.check_in_responses (RLS-03, RLS-06, RLS-07)
-- =================================================================
-- Asistente y Platform Admin EXCLUIDOS
CREATE POLICY "checkin_responses_select_policy" ON app.check_in_responses
  FOR SELECT TO authenticated
  USING (security.can_read_clinical_data(patient_id, auth.uid()));

CREATE POLICY "patient_insert_own_response" ON app.check_in_responses
  FOR INSERT TO authenticated
  WITH CHECK (
    submitted_by = auth.uid() AND
    security.has_patient_portal_access(patient_id, auth.uid()) AND
    security.is_active_organization(organization_id)
  );

-- =================================================================
-- 11. POLÍTICAS SOBRE app.alerts (RLS-03, RLS-06, RLS-07)
-- =================================================================
-- Paciente, Asistente y Platform Admin EXCLUIDOS
CREATE POLICY "alerts_select_policy" ON app.alerts
  FOR SELECT TO authenticated
  USING (
    security.has_org_role(organization_id, ARRAY['organization_owner'], auth.uid()) OR
    security.is_assigned_nutritionist(patient_id, auth.uid())
  );

CREATE POLICY "alerts_update_policy" ON app.alerts
  FOR UPDATE TO authenticated
  USING (
    security.has_org_role(organization_id, ARRAY['organization_owner'], auth.uid()) OR
    security.is_assigned_nutritionist(patient_id, auth.uid())
  )
  WITH CHECK (
    security.has_org_role(organization_id, ARRAY['organization_owner'], auth.uid()) OR
    security.is_assigned_nutritionist(patient_id, auth.uid())
  );

-- =================================================================
-- 12. POLÍTICAS SOBRE app.patient_recommendations
-- =================================================================
CREATE POLICY "recommendations_select_policy" ON app.patient_recommendations
  FOR SELECT TO authenticated
  USING (
    security.has_org_role(organization_id, ARRAY['organization_owner'], auth.uid()) OR
    security.is_assigned_nutritionist(patient_id, auth.uid()) OR
    (security.has_patient_portal_access(patient_id, auth.uid()) AND status = 'published')
  );

-- =================================================================
-- 13. POLÍTICAS SOBRE app.audit_logs
-- =================================================================
CREATE POLICY "owner_select_audit_logs" ON app.audit_logs
  FOR SELECT TO authenticated
  USING (
    security.has_org_role(organization_id, ARRAY['organization_owner'], auth.uid())
  );
