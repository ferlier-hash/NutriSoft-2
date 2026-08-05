-- Migration: 20260804000006_phase_2_1_integrity_hardening.sql
-- Description: Integridad referencial compuesta para recomendaciones y asignaciones profesionales (REC-01 a REC-03, ASSIGN-01 a ASSIGN-06)

-- 1. FK Compuesta en app.patient_recommendations hacia app.check_in_responses (REC-01, REC-02, REC-03)
ALTER TABLE app.patient_recommendations
  ADD CONSTRAINT fk_recommendations_response_composite
  FOREIGN KEY (organization_id, patient_id, response_id)
  REFERENCES app.check_in_responses(organization_id, patient_id, id)
  ON DELETE RESTRICT;

-- 2. FK Compuesta en app.patient_assignments hacia app.organization_members (ASSIGN-01, ASSIGN-02)
ALTER TABLE app.patient_assignments
  ADD CONSTRAINT fk_patient_assignments_member_composite
  FOREIGN KEY (organization_id, nutritionist_user_id)
  REFERENCES app.organization_members(organization_id, user_id)
  ON DELETE RESTRICT;

-- 3. Trigger para validar rol activo de nutricionista u owner al asignar paciente (ASSIGN-03, ASSIGN-04)
CREATE OR REPLACE FUNCTION app.verify_patient_assignment_member()
RETURNS TRIGGER AS $$
DECLARE
  v_role text;
  v_status text;
BEGIN
  SELECT role, status INTO v_role, v_status
  FROM app.organization_members
  WHERE organization_id = NEW.organization_id AND user_id = NEW.nutritionist_user_id;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'El usuario no es miembro de la organización indicada';
  END IF;

  IF v_status != 'active' THEN
    RAISE EXCEPTION 'El profesional seleccionado no es un miembro activo de la organización';
  END IF;

  IF v_role NOT IN ('organization_owner', 'nutritionist') THEN
    RAISE EXCEPTION 'El profesional asignado debe tener un rol activo de nutricionista u owner';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_verify_patient_assignment BEFORE INSERT OR UPDATE ON app.patient_assignments
  FOR EACH ROW EXECUTE FUNCTION app.verify_patient_assignment_member();

-- 4. Trigger para impedir desactivación o degradación de miembros con asignaciones clínicas activas (ASSIGN-05)
CREATE OR REPLACE FUNCTION app.prevent_member_mutation_with_active_assignments()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') OR (OLD.status = 'active' AND (NEW.status = 'inactive' OR NEW.role = 'assistant')) THEN
    IF EXISTS (
      SELECT 1
      FROM app.patient_assignments
      WHERE organization_id = OLD.organization_id
        AND nutritionist_user_id = OLD.user_id
        AND status = 'active'
    ) THEN
      RAISE EXCEPTION 'No se puede desactivar o cambiar el rol de un miembro con asignaciones clínicas activas';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_member_mutation BEFORE UPDATE OR DELETE ON app.organization_members
  FOR EACH ROW EXECUTE FUNCTION app.prevent_member_mutation_with_active_assignments();
