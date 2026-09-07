-- Mantiene alineada la edición de Agenda con la zona horaria que usa el formulario.
-- Se reemplaza la firma anterior para evitar sobrecargas ambiguas en PostgREST.
DROP FUNCTION IF EXISTS api.update_professional_appointment(uuid,timestamptz,smallint,text,numeric);

CREATE OR REPLACE FUNCTION api.update_professional_appointment(
  p_appointment_id uuid,
  p_starts_at timestamptz,
  p_duration_minutes smallint,
  p_time_zone text,
  p_modality text,
  p_quoted_amount numeric
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' AS $$
DECLARE
  v app.appointments%ROWTYPE;
BEGIN
  SELECT * INTO v
  FROM app.appointments
  WHERE id = p_appointment_id
  FOR UPDATE;

  IF v.id IS NULL
    OR v.nutritionist_user_id <> auth.uid()
    OR NOT security.is_current_assigned_nutritionist(v.patient_id)
  THEN
    RAISE EXCEPTION 'Cita no encontrada o sin permisos';
  END IF;

  IF v.status NOT IN ('requested', 'confirmed') THEN
    RAISE EXCEPTION 'Sólo se pueden editar citas activas';
  END IF;

  IF p_duration_minutes NOT IN (15,30,45,60,75,90)
    OR nullif(trim(p_time_zone), '') IS NULL
    OR p_modality NOT IN ('in_person','virtual')
    OR p_quoted_amount IS NULL
    OR p_quoted_amount < 0
  THEN
    RAISE EXCEPTION 'Los datos de la cita no son válidos';
  END IF;

  UPDATE app.appointments
  SET starts_at = p_starts_at,
      ends_at = p_starts_at + make_interval(mins => p_duration_minutes),
      time_zone = trim(p_time_zone),
      duration_minutes = p_duration_minutes,
      modality = p_modality,
      quoted_amount = p_quoted_amount
  WHERE id = v.id;

  INSERT INTO app.audit_logs (
    actor_id, organization_id, action, resource_type, resource_id, details
  ) VALUES (
    auth.uid(), v.organization_id, 'UPDATE_PROFESSIONAL_APPOINTMENT',
    'appointment', v.id, jsonb_build_object('time_zone', trim(p_time_zone))
  );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION api.update_professional_appointment(uuid,timestamptz,smallint,text,text,numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.update_professional_appointment(uuid,timestamptz,smallint,text,text,numeric) TO authenticated;

NOTIFY pgrst, 'reload schema';
