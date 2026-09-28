-- Transferencia clínica explícita entre profesionales.
-- El acceso del profesional anterior es sólo de lectura y caduca por tiempo.
CREATE TABLE app.patient_professional_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE RESTRICT,
  patient_id uuid NOT NULL,
  previous_professional_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  new_professional_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  read_only_until timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  revoked_at timestamptz NULL,
  FOREIGN KEY (organization_id, patient_id) REFERENCES app.patients(organization_id, id) ON DELETE RESTRICT,
  CHECK (previous_professional_user_id <> new_professional_user_id),
  CHECK (read_only_until > created_at)
);
CREATE INDEX idx_patient_transfer_read_access ON app.patient_professional_transfers(patient_id, previous_professional_user_id, read_only_until)
  WHERE revoked_at IS NULL;
ALTER TABLE app.patient_professional_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY patient_transfer_history_owner ON app.patient_professional_transfers
  FOR SELECT TO authenticated USING (security.has_current_org_role(organization_id, ARRAY['organization_owner']));
REVOKE ALL ON app.patient_professional_transfers FROM authenticated, anon;

CREATE OR REPLACE FUNCTION security.is_transfer_readonly_professional(p_patient_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM app.patient_professional_transfers t
    JOIN app.organizations o ON o.id=t.organization_id AND o.status='active'
    JOIN app.organization_members m ON m.organization_id=t.organization_id AND m.user_id=auth.uid()
      AND m.role='nutritionist' AND m.status='active'
    WHERE t.patient_id=p_patient_id AND t.previous_professional_user_id=auth.uid()
      AND t.revoked_at IS NULL AND t.read_only_until > clock_timestamp()
  );
$$;
CREATE OR REPLACE FUNCTION security.is_transfer_readonly_meal_plan(p_meal_plan_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM app.meal_plans mp
    WHERE mp.id=p_meal_plan_id AND mp.bound_patient_id IS NOT NULL
      AND security.is_transfer_readonly_professional(mp.bound_patient_id)
  );
$$;
REVOKE ALL ON FUNCTION security.is_transfer_readonly_professional(uuid), security.is_transfer_readonly_meal_plan(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION security.is_transfer_readonly_professional(uuid), security.is_transfer_readonly_meal_plan(uuid) TO authenticated, service_role;

ALTER POLICY patients_select_policy ON app.patients USING (security.can_current_read_patient(id) OR security.is_transfer_readonly_professional(id));
ALTER POLICY assignments_select_policy ON app.patient_assignments USING (
  security.has_current_org_role(organization_id, ARRAY['organization_owner']) OR nutritionist_user_id=auth.uid()
  OR security.has_current_patient_portal_access(patient_id) OR security.is_transfer_readonly_professional(patient_id)
);
ALTER POLICY checkin_assignments_select_policy ON app.check_in_assignments USING (
  security.has_current_org_role(organization_id, ARRAY['organization_owner','assistant'])
  OR security.is_current_assigned_nutritionist(patient_id) OR security.has_current_patient_portal_access(patient_id)
  OR security.is_transfer_readonly_professional(patient_id)
);
ALTER POLICY checkin_responses_select_policy ON app.check_in_responses USING (security.can_current_read_clinical_data(patient_id) OR security.is_transfer_readonly_professional(patient_id));
ALTER POLICY alerts_select_policy ON app.alerts USING (security.has_current_org_role(organization_id, ARRAY['organization_owner']) OR security.is_current_assigned_nutritionist(patient_id) OR security.is_transfer_readonly_professional(patient_id));
ALTER POLICY recommendations_select_policy ON app.patient_recommendations USING (
  security.has_current_org_role(organization_id, ARRAY['organization_owner']) OR security.is_current_assigned_nutritionist(patient_id)
  OR (security.has_current_patient_portal_access(patient_id) AND status='published') OR security.is_transfer_readonly_professional(patient_id)
);
ALTER POLICY anthropometric_revisions_assigned_professional ON app.patient_anthropometric_revisions USING (security.is_current_assigned_nutritionist(patient_id) OR security.is_transfer_readonly_professional(patient_id));
ALTER POLICY initial_read ON app.patient_initial_measurements USING (security.daily_reader(patient_id) OR security.is_transfer_readonly_professional(patient_id));
ALTER POLICY daily_weights_read ON app.daily_weights USING (security.daily_reader(patient_id) OR security.is_transfer_readonly_professional(patient_id));
ALTER POLICY daily_activity_read ON app.daily_activity USING (security.daily_reader(patient_id) OR security.is_transfer_readonly_professional(patient_id));

ALTER POLICY meal_plans_select_authorized ON app.meal_plans USING (security.can_current_read_meal_plan(id) OR security.is_transfer_readonly_meal_plan(id));
ALTER POLICY meal_plan_versions_select_authorized ON app.meal_plan_versions USING (security.can_current_read_meal_plan(meal_plan_id) OR security.is_transfer_readonly_meal_plan(meal_plan_id));
ALTER POLICY meal_plan_assignments_select_authorized ON app.meal_plan_assignments USING (
  (security.can_current_read_meal_plan(meal_plan_id) AND (security.is_current_assigned_nutritionist(patient_id) OR (security.has_current_patient_portal_access(patient_id) AND status='active')))
  OR security.is_transfer_readonly_meal_plan(meal_plan_id)
);
ALTER POLICY meal_plan_activity_select_authorized ON app.meal_plan_meal_activity USING (
  (security.can_current_read_meal_plan(meal_plan_id) AND (security.is_current_assigned_nutritionist(patient_id) OR security.has_current_patient_portal_access(patient_id)))
  OR security.is_transfer_readonly_meal_plan(meal_plan_id)
);

CREATE OR REPLACE VIEW api.professional_meal_plans WITH (security_invoker=true) AS
SELECT mp.id, mp.organization_id, mp.owner_nutritionist_user_id, mp.bound_patient_id AS patient_id,
  p.first_name AS patient_first_name, p.last_name AS patient_last_name, mp.title, mp.status,
  mpa.assignment_kind, mpa.status AS assignment_status, mpa.visible_version_id,
  draft.id AS draft_version_id, COALESCE(draft.version_number,published.version_number) AS editable_version_number,
  COALESCE(draft.title,published.title,mp.title) AS editable_title,
  COALESCE(draft.content,'{"days":[]}'::jsonb) AS editable_content,
  published.version_number AS published_version_number, published.published_at,
  (SELECT count(*)::integer FROM app.meal_plan_meal_activity activity WHERE activity.meal_plan_id=mp.id AND activity.patient_comment IS NOT NULL AND activity.reviewed_at IS NULL) AS pending_comment_count,
  mp.created_at, mp.updated_at
FROM app.meal_plans mp
LEFT JOIN app.patients p ON p.organization_id=mp.organization_id AND p.id=mp.bound_patient_id
LEFT JOIN app.meal_plan_assignments mpa ON mpa.meal_plan_id=mp.id
LEFT JOIN app.meal_plan_versions draft ON draft.meal_plan_id=mp.id AND draft.status='draft'
LEFT JOIN app.meal_plan_versions published ON published.meal_plan_id=mp.id AND published.status='published'
WHERE mp.owner_nutritionist_user_id=auth.uid() OR security.is_transfer_readonly_meal_plan(mp.id);

CREATE FUNCTION api.get_patient_transfer_candidates(p_patient uuid)
RETURNS TABLE(user_id uuid, display_name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT m.user_id, coalesce(nullif(trim(pr.full_name),''),'Profesional sin nombre')
  FROM app.patients p
  JOIN app.organization_members m ON m.organization_id=p.organization_id AND m.role='nutritionist' AND m.status='active'
  LEFT JOIN app.profiles pr ON pr.id=m.user_id
  WHERE p.id=p_patient AND (security.is_current_assigned_nutritionist(p_patient) OR security.has_current_org_role(p.organization_id,ARRAY['organization_owner']))
    AND m.user_id <> (SELECT nutritionist_user_id FROM app.patient_assignments WHERE patient_id=p_patient AND is_primary AND status='active' LIMIT 1)
  ORDER BY 2;
$$;

CREATE FUNCTION api.transfer_patient_to_professional(p_patient uuid, p_new_professional uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_org uuid; v_old uuid; v_until timestamptz; v_plan_count integer; v_transfer uuid;
BEGIN
  SELECT organization_id INTO v_org FROM app.patients WHERE id=p_patient AND status='active' FOR UPDATE;
  IF v_org IS NULL THEN RAISE EXCEPTION 'Paciente no disponible.'; END IF;
  IF NOT (security.is_current_assigned_nutritionist(p_patient) OR security.has_current_org_role(v_org,ARRAY['organization_owner'])) THEN RAISE EXCEPTION 'No tenés autorización para transferir este paciente.'; END IF;
  SELECT nutritionist_user_id INTO v_old FROM app.patient_assignments WHERE organization_id=v_org AND patient_id=p_patient AND is_primary AND status='active' FOR UPDATE;
  IF v_old IS NULL OR v_old=p_new_professional THEN RAISE EXCEPTION 'La transferencia no es válida.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM app.organization_members WHERE organization_id=v_org AND user_id=p_new_professional AND role='nutritionist' AND status='active') THEN RAISE EXCEPTION 'El profesional destino no está activo en este consultorio.'; END IF;
  UPDATE app.patient_assignments SET status='inactive', ended_at=clock_timestamp() WHERE organization_id=v_org AND patient_id=p_patient AND is_primary AND status='active';
  INSERT INTO app.patient_assignments(organization_id,patient_id,nutritionist_user_id,is_primary,status) VALUES(v_org,p_patient,p_new_professional,true,'active');
  v_until := clock_timestamp() + interval '14 days';
  INSERT INTO app.patient_professional_transfers(organization_id,patient_id,previous_professional_user_id,new_professional_user_id,read_only_until)
    VALUES(v_org,p_patient,v_old,p_new_professional,v_until) RETURNING id INTO v_transfer;
  UPDATE app.meal_plans SET owner_nutritionist_user_id=p_new_professional, updated_at=clock_timestamp()
    WHERE organization_id=v_org AND bound_patient_id=p_patient AND owner_nutritionist_user_id=v_old;
  GET DIAGNOSTICS v_plan_count = ROW_COUNT;
  INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details)
    VALUES(auth.uid(),v_org,'TRANSFER_PATIENT','patient',p_patient,jsonb_build_object('previous_professional_id',v_old,'new_professional_id',p_new_professional,'read_only_until',v_until,'meal_plan_count',v_plan_count));
  RETURN jsonb_build_object('transfer_id',v_transfer,'read_only_until',v_until,'meal_plan_count',v_plan_count);
END; $$;
REVOKE ALL ON FUNCTION api.get_patient_transfer_candidates(uuid), api.transfer_patient_to_professional(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION api.get_patient_transfer_candidates(uuid), api.transfer_patient_to_professional(uuid,uuid) TO authenticated;
