-- Revisiones antropométricas profesionales. Datos clínicos: nunca direct DML.

CREATE TABLE app.professional_anthropometric_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE RESTRICT,
  nutritionist_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  label text NOT NULL CHECK (char_length(trim(label)) BETWEEN 1 AND 80),
  unit text NOT NULL CHECK (char_length(trim(unit)) BETWEEN 1 AND 20),
  position integer NOT NULL CHECK (position >= 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, nutritionist_user_id, label)
);
CREATE TRIGGER trg_professional_anthropometric_fields_updated_at BEFORE UPDATE ON app.professional_anthropometric_fields FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE TABLE app.patient_anthropometric_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE RESTRICT,
  patient_id uuid NOT NULL,
  recorded_by_nutritionist_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  recorded_on date NOT NULL CHECK (recorded_on <= CURRENT_DATE),
  values jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(values) = 'object' AND values <> '{}'::jsonb),
  note text NULL CHECK (note IS NULL OR char_length(note) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, patient_id) REFERENCES app.patients(organization_id, id) ON DELETE RESTRICT
);
CREATE INDEX idx_patient_anthropometric_revisions_patient_date ON app.patient_anthropometric_revisions(patient_id, recorded_on DESC);
CREATE TRIGGER trg_patient_anthropometric_revisions_updated_at BEFORE UPDATE ON app.patient_anthropometric_revisions FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

ALTER TABLE app.professional_anthropometric_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.patient_anthropometric_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY anthropometric_fields_own_professional ON app.professional_anthropometric_fields FOR SELECT USING (nutritionist_user_id = auth.uid() AND security.is_current_active_org_member(organization_id));
CREATE POLICY anthropometric_revisions_assigned_professional ON app.patient_anthropometric_revisions FOR SELECT USING (security.is_current_assigned_nutritionist(patient_id));
REVOKE ALL ON app.professional_anthropometric_fields, app.patient_anthropometric_revisions FROM authenticated;

CREATE OR REPLACE VIEW api.professional_anthropometric_fields WITH (security_invoker = true) AS
SELECT id, organization_id, label, unit, position, status FROM app.professional_anthropometric_fields ORDER BY position, created_at;
CREATE OR REPLACE VIEW api.professional_patient_anthropometry WITH (security_invoker = true) AS
SELECT r.id, r.patient_id, r.recorded_on, r.values, r.note, r.created_at, r.updated_at
FROM app.patient_anthropometric_revisions r;
GRANT SELECT ON api.professional_anthropometric_fields, api.professional_patient_anthropometry TO authenticated;

CREATE OR REPLACE FUNCTION api.save_patient_anthropometric_revision(p_revision_id uuid, p_patient_id uuid, p_recorded_on date, p_values jsonb, p_note text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_org_id uuid; v_id uuid;
BEGIN
  SELECT organization_id INTO v_org_id FROM app.patients WHERE id = p_patient_id;
  IF v_org_id IS NULL OR NOT security.is_current_assigned_nutritionist(p_patient_id) THEN RAISE EXCEPTION 'No autorizado para esta ficha.'; END IF;
  IF p_recorded_on IS NULL OR p_recorded_on > CURRENT_DATE OR jsonb_typeof(p_values) <> 'object' OR p_values = '{}'::jsonb THEN RAISE EXCEPTION 'La revisión debe tener fecha válida y al menos un valor.'; END IF;
  IF p_revision_id IS NULL THEN
    INSERT INTO app.patient_anthropometric_revisions(organization_id,patient_id,recorded_by_nutritionist_user_id,recorded_on,values,note) VALUES(v_org_id,p_patient_id,auth.uid(),p_recorded_on,p_values,NULLIF(trim(p_note),'')) RETURNING id INTO v_id;
  ELSE
    UPDATE app.patient_anthropometric_revisions SET recorded_on=p_recorded_on,values=p_values,note=NULLIF(trim(p_note),'') WHERE id=p_revision_id AND patient_id=p_patient_id AND recorded_by_nutritionist_user_id=auth.uid() RETURNING id INTO v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'No autorizado para editar esta revisión.'; END IF;
  END IF;
  RETURN v_id;
END; $$;
CREATE OR REPLACE FUNCTION api.delete_patient_anthropometric_revision(p_revision_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  DELETE FROM app.patient_anthropometric_revisions r WHERE r.id=p_revision_id AND r.recorded_by_nutritionist_user_id=auth.uid() AND security.is_current_assigned_nutritionist(r.patient_id);
  IF NOT FOUND THEN RAISE EXCEPTION 'No autorizado para eliminar esta revisión.'; END IF;
END; $$;
GRANT EXECUTE ON FUNCTION api.save_patient_anthropometric_revision(uuid,uuid,date,jsonb,text), api.delete_patient_anthropometric_revision(uuid) TO authenticated;
