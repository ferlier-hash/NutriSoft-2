CREATE TABLE app.patient_initial_measurements (
 patient_id uuid PRIMARY KEY REFERENCES app.patients(id),
 recorded_on date NOT NULL,
 height_cm numeric CHECK(height_cm>0 AND height_cm<=300),
 initial_weight_kg numeric CHECK(initial_weight_kg>0 AND initial_weight_kg<=1000),
 waist_cm numeric CHECK(waist_cm>0 AND waist_cm<=500),
 hip_cm numeric CHECK(hip_cm>0 AND hip_cm<=500),
 target_weight_kg numeric CHECK(target_weight_kg>0 AND target_weight_kg<=1000),
 updated_by uuid NOT NULL REFERENCES auth.users(id), updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE app.patient_initial_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY initial_read ON app.patient_initial_measurements FOR SELECT USING(security.daily_reader(patient_id));
REVOKE ALL ON app.patient_initial_measurements FROM authenticated,anon;
GRANT SELECT ON app.patient_initial_measurements TO authenticated;
CREATE VIEW api.patient_initial_measurements WITH(security_invoker=true) AS SELECT * FROM app.patient_initial_measurements;
CREATE VIEW api.clinical_patient_profiles WITH(security_invoker=true) AS
 SELECT p.id,p.organization_id,p.first_name,p.last_name,p.email,p.phone,p.birth_date,p.city,p.status
 FROM app.patients p WHERE security.daily_reader(p.id);
GRANT SELECT ON api.patient_initial_measurements,api.clinical_patient_profiles TO authenticated;
CREATE FUNCTION api.save_patient_initial_measurements(p_patient uuid,p_date date,p_values jsonb,p_expected timestamptz DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE previous app.patient_initial_measurements; field text; value jsonb; v_org uuid;
BEGIN
 IF NOT security.daily_reader(p_patient) THEN RAISE EXCEPTION 'Ficha no autorizada.'; END IF;
 IF p_date IS NULL OR p_date>CURRENT_DATE OR p_values IS NULL OR jsonb_typeof(p_values)<>'object' THEN RAISE EXCEPTION 'Revisá la fecha y los datos iniciales.'; END IF;
 FOR field,value IN SELECT * FROM jsonb_each(p_values) LOOP
 IF field NOT IN('height_cm','initial_weight_kg','waist_cm','hip_cm','target_weight_kg') OR (value<>'null'::jsonb AND (jsonb_typeof(value)<>'number' OR value::text::numeric<=0)) THEN RAISE EXCEPTION 'Medición no válida.'; END IF;
 END LOOP;
 PERFORM pg_advisory_xact_lock(hashtextextended('initial:'||p_patient::text,0));
 SELECT * INTO previous FROM app.patient_initial_measurements WHERE patient_id=p_patient;
 IF FOUND AND p_expected IS DISTINCT FROM previous.updated_at THEN RAISE EXCEPTION 'La ficha cambió. Recargá antes de guardar.'; END IF;
 IF NOT security.has_current_patient_portal_access(p_patient) AND (p_values->>'target_weight_kg')::numeric IS DISTINCT FROM previous.target_weight_kg THEN RAISE EXCEPTION 'El peso objetivo lo declara el paciente.'; END IF;
 INSERT INTO app.patient_initial_measurements(patient_id,recorded_on,height_cm,initial_weight_kg,waist_cm,hip_cm,target_weight_kg,updated_by)
 VALUES(p_patient,p_date,(p_values->>'height_cm')::numeric,(p_values->>'initial_weight_kg')::numeric,(p_values->>'waist_cm')::numeric,(p_values->>'hip_cm')::numeric,(p_values->>'target_weight_kg')::numeric,auth.uid())
 ON CONFLICT(patient_id) DO UPDATE SET recorded_on=excluded.recorded_on,height_cm=excluded.height_cm,initial_weight_kg=excluded.initial_weight_kg,waist_cm=excluded.waist_cm,hip_cm=excluded.hip_cm,target_weight_kg=excluded.target_weight_kg,updated_by=auth.uid(),updated_at=clock_timestamp();
 SELECT organization_id INTO v_org FROM app.patients WHERE id=p_patient;
 INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details) VALUES(auth.uid(),v_org,'UPDATE_INITIAL_MEASUREMENTS','patient',p_patient,'{}');
END; $$;
REVOKE ALL ON FUNCTION api.save_patient_initial_measurements(uuid,date,jsonb,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION api.save_patient_initial_measurements(uuid,date,jsonb,timestamptz) TO authenticated;
