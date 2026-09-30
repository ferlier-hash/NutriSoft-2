-- Citas lifecycle actions are restricted to the assigned professional and audited.
CREATE FUNCTION api.set_professional_appointment_outcome(
  p_appointment_id uuid, p_status text, p_billing_decision text DEFAULT NULL, p_amount numeric DEFAULT NULL
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a app.appointments%ROWTYPE;
BEGIN
  SELECT * INTO a FROM app.appointments WHERE id=p_appointment_id FOR UPDATE;
  IF a.id IS NULL OR a.nutritionist_user_id<>auth.uid() OR NOT security.is_current_assigned_nutritionist(a.patient_id) THEN
    RAISE EXCEPTION 'Cita no encontrada o sin permisos';
  END IF;
  IF a.status<>'confirmed' THEN RAISE EXCEPTION 'Sólo se puede cerrar una cita confirmada'; END IF;
  IF a.starts_at>clock_timestamp() THEN RAISE EXCEPTION 'La acción estará disponible cuando comience la cita'; END IF;
  IF p_status='completed' THEN
    IF p_billing_decision IS NOT NULL OR p_amount IS NOT NULL THEN RAISE EXCEPTION 'La cita completada no requiere resolución de cancelación'; END IF;
    UPDATE app.appointments SET status='completed' WHERE id=a.id;
  ELSIF p_status='no_show' THEN
    IF p_billing_decision IS NULL OR p_billing_decision NOT IN ('no_charge','pending') OR (p_billing_decision='pending' AND (p_amount IS NULL OR p_amount<0)) THEN
      RAISE EXCEPTION 'Definí cómo queda el importe antes de marcar ausencia';
    END IF;
    UPDATE app.appointments SET status='no_show',
      billing_disposition=CASE WHEN p_billing_decision='no_charge' THEN 'no_charge' ELSE 'chargeable' END,
      quoted_amount=CASE WHEN p_billing_decision='pending' THEN p_amount ELSE quoted_amount END
    WHERE id=a.id;
  ELSE RAISE EXCEPTION 'Estado final no permitido';
  END IF;
  INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details)
    VALUES(auth.uid(),a.organization_id,CASE WHEN p_status='completed' THEN 'COMPLETE_PROFESSIONAL_APPOINTMENT' ELSE 'MARK_PROFESSIONAL_APPOINTMENT_NO_SHOW' END,'appointment',a.id,
      CASE WHEN p_status='no_show' THEN jsonb_build_object('billing_decision',p_billing_decision) ELSE '{}'::jsonb END);
  RETURN true;
END; $$;

REVOKE ALL ON FUNCTION api.set_professional_appointment_outcome(uuid,text,text,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION api.set_professional_appointment_outcome(uuid,text,text,numeric) TO authenticated;
NOTIFY pgrst,'reload schema';
