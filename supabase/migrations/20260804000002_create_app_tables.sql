-- Migration: 20260804000002_create_app_tables.sql
-- Description: Tablas internas del esquema app, foreign keys compuestas multi-tenant e índices

-- Trigger reusable para updated_at (INTEGRITY-06)
CREATE OR REPLACE FUNCTION app.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. app.organizations (DATA-02)
CREATE TABLE app.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  status text NOT NULL CHECK (status IN ('active', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON app.organizations FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- 2. app.profiles (DATA-03)
CREATE TABLE app.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  phone text NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON app.profiles FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- 3. app.user_platform_roles (DATA-04)
CREATE TABLE app.user_platform_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('platform_admin')),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_platform_role UNIQUE (user_id, role)
);

-- 4. app.organization_members (DATA-05)
CREATE TABLE app.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('organization_owner', 'nutritionist', 'assistant')),
  status text NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_organization_member UNIQUE (organization_id, user_id)
);
CREATE TRIGGER trg_organization_members_updated_at BEFORE UPDATE ON app.organization_members FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- 5. app.patients (DATA-06)
CREATE TABLE app.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NULL,
  phone text NULL,
  birth_date date NULL,
  city text NULL,
  country_code text NULL,
  nutrition_goal text NULL,
  current_plan_name text NULL,
  status text NOT NULL CHECK (status IN ('active', 'archived')),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_patients_org_id UNIQUE (organization_id, id)
);
CREATE TRIGGER trg_patients_updated_at BEFORE UPDATE ON app.patients FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- 6. app.patient_portal_access (DATA-07)
CREATE TABLE app.patient_portal_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('active', 'revoked')),
  granted_at timestamptz NOT NULL DEFAULT NOW(),
  revoked_at timestamptz NULL,
  CONSTRAINT uq_patient_portal_access_org_pat UNIQUE (organization_id, patient_id),
  CONSTRAINT fk_portal_access_patient FOREIGN KEY (organization_id, patient_id) REFERENCES app.patients(organization_id, id) ON DELETE CASCADE
);

-- 7. app.patient_assignments (DATA-08)
CREATE TABLE app.patient_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  nutritionist_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  is_primary boolean NOT NULL DEFAULT true,
  status text NOT NULL CHECK (status IN ('active', 'inactive')),
  assigned_at timestamptz NOT NULL DEFAULT NOW(),
  ended_at timestamptz NULL,
  CONSTRAINT fk_patient_assignments_patient FOREIGN KEY (organization_id, patient_id) REFERENCES app.patients(organization_id, id) ON DELETE CASCADE
);
-- Máximo una asignación primaria activa por paciente
CREATE UNIQUE INDEX idx_patient_assignments_primary_active ON app.patient_assignments(organization_id, patient_id) WHERE is_primary = true AND status = 'active';

-- 8. app.check_in_assignments (DATA-09)
CREATE TABLE app.check_in_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'expired', 'cancelled')),
  due_date timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  completed_at timestamptz NULL,
  expired_at timestamptz NULL,
  CONSTRAINT uq_checkin_assignments_org_pat_id UNIQUE (organization_id, patient_id, id),
  CONSTRAINT fk_checkin_assignments_patient FOREIGN KEY (organization_id, patient_id) REFERENCES app.patients(organization_id, id) ON DELETE CASCADE
);

-- 9. app.check_in_responses (DATA-10)
CREATE TABLE app.check_in_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  assignment_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  submitted_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  energy smallint NOT NULL CHECK (energy >= 1 AND energy <= 5),
  adherence smallint NOT NULL CHECK (adherence >= 1 AND adherence <= 5),
  help_requested boolean NOT NULL DEFAULT false,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_checkin_responses_assignment UNIQUE (organization_id, patient_id, assignment_id),
  CONSTRAINT uq_checkin_responses_org_pat_id UNIQUE (organization_id, patient_id, id),
  CONSTRAINT fk_checkin_responses_assignment FOREIGN KEY (organization_id, patient_id, assignment_id) REFERENCES app.check_in_assignments(organization_id, patient_id, id) ON DELETE CASCADE
);

-- Inmutabilidad de check_in_responses (DATA-10: no update, no delete)
CREATE OR REPLACE FUNCTION app.prevent_mutation_checkin_responses()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Las respuestas de check-in son inmutables y no pueden modificarse ni eliminarse.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_checkin_responses_no_update BEFORE UPDATE ON app.check_in_responses FOR EACH ROW EXECUTE FUNCTION app.prevent_mutation_checkin_responses();
CREATE TRIGGER trg_checkin_responses_no_delete BEFORE DELETE ON app.check_in_responses FOR EACH ROW EXECUTE FUNCTION app.prevent_mutation_checkin_responses();

-- 10. app.alerts (DATA-11)
CREATE TABLE app.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  response_id uuid NOT NULL,
  rule_code text NOT NULL CHECK (rule_code IN ('HELP_REQUESTED', 'LOW_ENERGY', 'LOW_ADHERENCE')),
  priority text NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  recommended_action text NOT NULL,
  status text NOT NULL CHECK (status IN ('unresolved', 'acknowledged', 'resolved')),
  acknowledged_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at timestamptz NULL,
  resolved_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz NULL,
  resolution_notes text NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_alerts_response_rule UNIQUE (response_id, rule_code),
  CONSTRAINT fk_alerts_response FOREIGN KEY (organization_id, patient_id, response_id) REFERENCES app.check_in_responses(organization_id, patient_id, id) ON DELETE CASCADE
);
CREATE TRIGGER trg_alerts_updated_at BEFORE UPDATE ON app.alerts FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- 11. app.patient_recommendations (DATA-12)
CREATE TABLE app.patient_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  response_id uuid NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  recommendation_text text NOT NULL,
  status text NOT NULL CHECK (status IN ('published', 'archived')),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  archived_at timestamptz NULL,
  CONSTRAINT fk_recommendations_patient FOREIGN KEY (organization_id, patient_id) REFERENCES app.patients(organization_id, id) ON DELETE CASCADE
);

-- 12. app.audit_logs (DATA-13)
CREATE TABLE app.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id uuid NULL REFERENCES app.organizations(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address inet NULL,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Inmutabilidad de audit_logs (DATA-13: no update, no delete)
CREATE OR REPLACE FUNCTION app.prevent_mutation_audit_logs()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Los registros de auditoría son inmutables y no pueden modificarse ni eliminarse.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_logs_no_update BEFORE UPDATE ON app.audit_logs FOR EACH ROW EXECUTE FUNCTION app.prevent_mutation_audit_logs();
CREATE TRIGGER trg_audit_logs_no_delete BEFORE DELETE ON app.audit_logs FOR EACH ROW EXECUTE FUNCTION app.prevent_mutation_audit_logs();

-- ÍNDICES COMPLEMENTARIOS DE ALTO RENDIMIENTO (INTEGRITY-05)
CREATE INDEX idx_org_members_org ON app.organization_members(organization_id);
CREATE INDEX idx_org_members_user ON app.organization_members(user_id);
CREATE INDEX idx_patients_org ON app.patients(organization_id);
CREATE INDEX idx_patient_portal_access_user ON app.patient_portal_access(user_id);
CREATE INDEX idx_patient_assignments_nutri ON app.patient_assignments(nutritionist_user_id);
CREATE INDEX idx_patient_assignments_patient ON app.patient_assignments(patient_id);
CREATE INDEX idx_checkin_assignments_patient ON app.check_in_assignments(patient_id);
CREATE INDEX idx_checkin_assignments_status ON app.check_in_assignments(status);
CREATE INDEX idx_checkin_responses_patient ON app.check_in_responses(patient_id);
CREATE INDEX idx_alerts_org ON app.alerts(organization_id);
CREATE INDEX idx_alerts_patient ON app.alerts(patient_id);
CREATE INDEX idx_alerts_status ON app.alerts(status);
CREATE INDEX idx_recommendations_patient ON app.patient_recommendations(patient_id);
CREATE INDEX idx_audit_logs_org ON app.audit_logs(organization_id);
