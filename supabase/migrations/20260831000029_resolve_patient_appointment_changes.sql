CREATE VIEW api.professional_pending_appointment_changes WITH (security_invoker = true) AS
SELECT r.id, r.appointment_id, r.patient_id, r.kind, r.requested_starts_at,
  r.requested_duration_minutes, r.requested_modality, r.created_at,
  a.quoted_amount, a.currency
FROM app.patient_appointment_change_requests r
JOIN app.appointments a ON a.id = r.appointment_id
WHERE r.status = 'pending'
  AND r.nutritionist_user_id = auth.uid()
  AND security.is_current_assigned_nutritionist(r.patient_id);

CREATE OR REPLACE FUNCTION api.resolve_patient_appointment_change(
  p_request_id uuid, p_decision text, p_billing_decision text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r app.patient_appointment_change_requests%ROWTYPE; a app.appointments%ROWTYPE; v_new_id uuid;
BEGIN
  SELECT * INTO r FROM app.patient_appointment_change_requests WHERE id = p_request_id FOR UPDATE;
  IF r.id IS NULL OR r.nutritionist_user_id <> auth.uid() OR NOT security.is_current_assigned_nutritionist(r.patient_id) THEN RAISE EXCEPTION 'Solicitud no encontrada o sin permisos'; END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION 'La solicitud ya fue resuelta'; END IF;
  IF p_decision NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Decisión inválida'; END IF;
  SELECT * INTO a FROM app.appointments WHERE id = r.appointment_id FOR UPDATE;
  IF a.status <> 'confirmed' THEN RAISE EXCEPTION 'La cita original ya no está disponible'; END IF;
  IF p_decision = 'rejected' THEN
    UPDATE app.patient_appointment_change_requests SET status='rejected', resolved_at=now() WHERE id=r.id;
    RETURN r.appointment_id;
  END IF;
  IF r.kind = 'cancel' THEN
    IF p_billing_decision NOT IN ('no_charge','pending') THEN RAISE EXCEPTION 'Definí cómo queda el cobro antes de aprobar la cancelación'; END IF;
    UPDATE app.appointments SET status='cancelled_by_patient', billing_disposition=CASE WHEN p_billing_decision='no_charge' THEN 'no_charge' ELSE 'chargeable' END WHERE id=a.id;
  ELSE
    UPDATE app.appointments SET status='rescheduled' WHERE id=a.id;
    INSERT INTO app.appointments (organization_id,patient_id,nutritionist_user_id,starts_at,ends_at,time_zone,duration_minutes,modality,status,quoted_amount,currency,created_by,rescheduled_from_appointment_id)
    VALUES (a.organization_id,a.patient_id,a.nutritionist_user_id,r.requested_starts_at,r.requested_starts_at + make_interval(mins => r.requested_duration_minutes),a.time_zone,r.requested_duration_minutes,r.requested_modality,'confirmed',a.quoted_amount,a.currency,auth.uid(),a.id) RETURNING id INTO v_new_id;
  END IF;
  UPDATE app.patient_appointment_change_requests SET status='approved', resolved_at=now() WHERE id=r.id;
  INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details) VALUES (auth.uid(),r.organization_id,'RESOLVE_PATIENT_APPOINTMENT_CHANGE','appointment_change_request',r.id,jsonb_build_object('decision',p_decision,'kind',r.kind));
  RETURN coalesce(v_new_id, a.id);
END; $$;
REVOKE ALL ON FUNCTION api.resolve_patient_appointment_change(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.resolve_patient_appointment_change(uuid,text,text) TO authenticated;
NOTIFY pgrst, 'reload schema';
