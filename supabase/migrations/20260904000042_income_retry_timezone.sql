CREATE OR REPLACE FUNCTION api.record_income_movement(p_appointment uuid,p_request uuid,p_amount numeric,p_date date,p_method text,p_refund uuid DEFAULT NULL,p_note text DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a app.appointments; original app.appointment_payment_movements; previous app.appointment_payment_movements; new_id uuid; remaining numeric;
BEGIN
 IF security.is_current_platform_admin() OR NOT security.can_current_manage_appointment(p_appointment) THEN RAISE EXCEPTION 'Cita no autorizada.'; END IF;
 SELECT * INTO a FROM app.appointments WHERE id=p_appointment FOR UPDATE;
 IF p_request IS NULL OR p_amount IS NULL OR p_amount<=0 OR p_amount>=10000000000 OR p_amount<>round(p_amount,2) OR p_date IS NULL OR p_date>CURRENT_DATE OR p_method IS NULL OR p_method NOT IN('cash','transfer','other') THEN RAISE EXCEPTION 'Revisá importe, fecha y medio de pago.'; END IF;
 SELECT * INTO previous FROM app.appointment_payment_movements WHERE request_id=p_request;
 IF FOUND THEN
 IF previous.appointment_id<>p_appointment OR previous.recorded_by<>auth.uid() OR previous.amount<>p_amount OR previous.refunded_payment_id IS DISTINCT FROM p_refund OR previous.method<>p_method OR (previous.occurred_at AT TIME ZONE a.time_zone)::date<>p_date OR previous.note IS DISTINCT FROM nullif(trim(p_note),'') THEN RAISE EXCEPTION 'Solicitud reutilizada con datos diferentes.'; END IF;
 RETURN previous.id; END IF;
 IF p_refund IS NOT NULL THEN
 SELECT * INTO original FROM app.appointment_payment_movements WHERE id=p_refund AND appointment_id=a.id AND movement_kind='payment';
 IF original.id IS NULL OR p_date<(original.occurred_at AT TIME ZONE a.time_zone)::date THEN RAISE EXCEPTION 'Cobro original o fecha de reembolso no válidos.'; END IF;
 SELECT original.amount-coalesce(sum(amount),0) INTO remaining FROM app.appointment_payment_movements WHERE refunded_payment_id=p_refund;
 IF p_amount>remaining THEN RAISE EXCEPTION 'El reembolso supera el saldo del cobro original.'; END IF;
 ELSE
 IF a.billing_disposition='no_charge' THEN RAISE EXCEPTION 'Esta cita está sin cargo.'; END IF;
 SELECT a.quoted_amount-coalesce(sum(CASE WHEN movement_kind='payment' THEN amount ELSE -amount END),0) INTO remaining FROM app.appointment_payment_movements WHERE appointment_id=a.id;
 IF p_amount>remaining THEN RAISE EXCEPTION 'El cobro supera el saldo de la cita.'; END IF;
 END IF;
 INSERT INTO app.appointment_payment_movements(organization_id,appointment_id,amount,currency,movement_kind,method,note,occurred_at,recorded_by,refunded_payment_id,request_id)
 VALUES(a.organization_id,a.id,p_amount,a.currency,CASE WHEN p_refund IS NULL THEN 'payment' ELSE 'refund' END,p_method,nullif(trim(p_note),''),(p_date+time '12:00') AT TIME ZONE a.time_zone,auth.uid(),p_refund,p_request) RETURNING id INTO new_id;
 INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details) VALUES(auth.uid(),a.organization_id,'RECORD_INCOME_MOVEMENT','appointment_payment_movement',new_id,jsonb_build_object('appointment_id',a.id));
 RETURN new_id;
END; $$;
REVOKE ALL ON FUNCTION api.record_income_movement(uuid,uuid,numeric,date,text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.record_income_movement(uuid,uuid,numeric,date,text,uuid,text) TO authenticated;
NOTIFY pgrst,'reload schema';

