-- Append-only correction pairs. A correction is not a real refund.
ALTER TABLE app.appointment_payment_movements
 ADD COLUMN correction_of uuid REFERENCES app.appointment_payment_movements(id),
 ADD COLUMN correction_revision integer,
 ADD COLUMN correction_role text,
 ADD CONSTRAINT ck_income_correction CHECK (
  (correction_of IS NULL AND correction_revision IS NULL AND correction_role IS NULL) OR
  (correction_of IS NOT NULL AND correction_revision>0 AND correction_role IN ('reversal','replacement') AND
   ((correction_role='reversal' AND movement_kind='refund') OR (correction_role='replacement' AND movement_kind='payment')))),
 ADD CONSTRAINT uq_income_correction UNIQUE(correction_of,correction_revision,correction_role);

CREATE OR REPLACE VIEW api.income_movements WITH(security_invoker=true) AS
SELECT p.id,p.appointment_id,coalesce(c.amount,p.amount) AS amount,p.currency,p.movement_kind,
 coalesce(c.method,p.method) AS method,CASE WHEN c.id IS NULL THEN p.note ELSE c.note END AS note,
 coalesce(c.occurred_at,p.occurred_at) AS occurred_at,p.refunded_payment_id,
 coalesce(c.id,p.id) AS revision_id,coalesce(c.correction_revision,0) AS correction_count,
 p.amount AS original_amount
FROM app.appointment_payment_movements p
LEFT JOIN LATERAL (
 SELECT * FROM app.appointment_payment_movements v
 WHERE v.correction_of=p.id AND v.correction_role='replacement'
 ORDER BY v.correction_revision DESC LIMIT 1
) c ON true
WHERE p.correction_of IS NULL AND NOT security.is_current_platform_admin();

CREATE FUNCTION api.correct_income_payment(p_payment uuid,p_expected uuid,p_request uuid,p_amount numeric,p_date date,p_method text,p_note text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a app.appointments; root app.appointment_payment_movements; current_payment app.appointment_payment_movements;
 previous app.appointment_payment_movements; returned numeric; current_net numeric; next_revision integer; result uuid;
BEGIN
 SELECT * INTO root FROM app.appointment_payment_movements WHERE id=p_payment AND movement_kind='payment' AND correction_of IS NULL;
 IF root.id IS NULL OR security.is_current_platform_admin() OR NOT security.can_current_manage_appointment(root.appointment_id) THEN RAISE EXCEPTION 'Cobro no autorizado.'; END IF;
 SELECT * INTO a FROM app.appointments WHERE id=root.appointment_id FOR UPDATE;
 IF p_request IS NULL OR p_expected IS NULL OR p_amount IS NULL OR p_amount<=0 OR p_amount>=10000000000 OR p_amount<>round(p_amount,2)
 OR p_date IS NULL OR p_date>(now() AT TIME ZONE a.time_zone)::date OR p_method IS NULL OR p_method NOT IN ('cash','transfer','other')
 OR char_length(trim(p_note))>500 THEN RAISE EXCEPTION 'Revisá importe, fecha y medio de pago.'; END IF;
 SELECT * INTO previous FROM app.appointment_payment_movements WHERE request_id=p_request;
 IF FOUND THEN
  IF previous.correction_of IS DISTINCT FROM root.id OR previous.correction_role IS DISTINCT FROM 'replacement' OR previous.recorded_by<>auth.uid()
   OR previous.amount<>p_amount OR previous.method<>p_method OR (previous.occurred_at AT TIME ZONE a.time_zone)::date<>p_date
   OR previous.note IS DISTINCT FROM nullif(trim(p_note),'') THEN RAISE EXCEPTION 'Solicitud reutilizada con datos diferentes.'; END IF;
  RETURN previous.id;
 END IF;
 SELECT * INTO current_payment FROM app.appointment_payment_movements WHERE correction_of=root.id AND correction_role='replacement' ORDER BY correction_revision DESC LIMIT 1;
 IF NOT FOUND THEN current_payment:=root; END IF;
 IF current_payment.id<>p_expected THEN RAISE EXCEPTION 'El cobro cambió. Cerrá y actualizá Ingresos antes de corregirlo.'; END IF;
 SELECT coalesce(sum(amount),0) INTO returned FROM app.appointment_payment_movements WHERE refunded_payment_id=root.id AND correction_of IS NULL;
 IF p_amount<returned THEN RAISE EXCEPTION 'El importe no puede ser menor que lo ya reembolsado.'; END IF;
 IF EXISTS(SELECT 1 FROM app.appointment_payment_movements WHERE refunded_payment_id=root.id AND correction_of IS NULL AND (occurred_at AT TIME ZONE a.time_zone)::date<p_date) THEN RAISE EXCEPTION 'La fecha del cobro debe ser anterior o igual a sus reembolsos.'; END IF;
 SELECT coalesce(sum(CASE WHEN movement_kind='payment' THEN amount ELSE -amount END),0) INTO current_net FROM app.appointment_payment_movements WHERE appointment_id=a.id;
 IF p_amount>current_payment.amount AND (a.billing_disposition='no_charge' OR current_net-current_payment.amount+p_amount>a.quoted_amount) THEN RAISE EXCEPTION 'El importe corregido supera el saldo permitido de la cita.'; END IF;
 next_revision:=coalesce(current_payment.correction_revision,0)+1;
 INSERT INTO app.appointment_payment_movements(organization_id,appointment_id,amount,currency,movement_kind,method,occurred_at,recorded_by,correction_of,correction_revision,correction_role)
 VALUES(a.organization_id,a.id,current_payment.amount,a.currency,'refund',current_payment.method,current_payment.occurred_at,auth.uid(),root.id,next_revision,'reversal');
 INSERT INTO app.appointment_payment_movements(organization_id,appointment_id,amount,currency,movement_kind,method,note,occurred_at,recorded_by,correction_of,correction_revision,correction_role,request_id)
 VALUES(a.organization_id,a.id,p_amount,a.currency,'payment',p_method,nullif(trim(p_note),''),(p_date+time '12:00') AT TIME ZONE a.time_zone,auth.uid(),root.id,next_revision,'replacement',p_request) RETURNING id INTO result;
 INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details)
 VALUES(auth.uid(),a.organization_id,'CORRECT_INCOME_PAYMENT','appointment_payment_movement',root.id,jsonb_build_object('revision',next_revision));
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION api.correct_income_payment(uuid,uuid,uuid,numeric,date,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.correct_income_payment(uuid,uuid,uuid,numeric,date,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION api.record_income_movement(p_appointment uuid,p_request uuid,p_amount numeric,p_date date,p_method text,p_refund uuid DEFAULT NULL,p_note text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a app.appointments; original record; previous app.appointment_payment_movements; new_id uuid; remaining numeric;
BEGIN
 IF security.is_current_platform_admin() OR NOT security.can_current_manage_appointment(p_appointment) THEN RAISE EXCEPTION 'Cita no autorizada.'; END IF;
 SELECT * INTO a FROM app.appointments WHERE id=p_appointment FOR UPDATE;
 IF p_request IS NULL OR p_amount IS NULL OR p_amount<=0 OR p_amount>=10000000000 OR p_amount<>round(p_amount,2) OR p_date IS NULL OR p_date>(now() AT TIME ZONE a.time_zone)::date OR p_method IS NULL OR p_method NOT IN('cash','transfer','other') THEN RAISE EXCEPTION 'Revisá importe, fecha y medio de pago.'; END IF;
 SELECT * INTO previous FROM app.appointment_payment_movements WHERE request_id=p_request;
 IF FOUND THEN
 IF previous.correction_of IS NOT NULL OR previous.appointment_id<>p_appointment OR previous.recorded_by<>auth.uid() OR previous.amount<>p_amount OR previous.refunded_payment_id IS DISTINCT FROM p_refund OR previous.method<>p_method OR (previous.occurred_at AT TIME ZONE a.time_zone)::date<>p_date OR previous.note IS DISTINCT FROM nullif(trim(p_note),'') THEN RAISE EXCEPTION 'Solicitud reutilizada con datos diferentes.'; END IF;
 RETURN previous.id; END IF;
 IF p_refund IS NOT NULL THEN
 SELECT * INTO original FROM api.income_movements WHERE id=p_refund AND appointment_id=a.id AND movement_kind='payment';
 IF NOT FOUND THEN RAISE EXCEPTION 'Cobro original no válido.'; END IF;
 IF p_date<(original.occurred_at AT TIME ZONE a.time_zone)::date THEN RAISE EXCEPTION 'Fecha de reembolso no válida.'; END IF;
 SELECT original.amount-coalesce(sum(amount),0) INTO remaining FROM app.appointment_payment_movements WHERE refunded_payment_id=p_refund AND correction_of IS NULL;
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
CREATE OR REPLACE VIEW api.appointments
WITH (security_invoker = true) AS
SELECT a.id, a.organization_id, a.patient_id, a.nutritionist_user_id, a.starts_at,
  a.ends_at, a.time_zone, a.duration_minutes, a.modality, a.status, a.quoted_amount,
  a.currency, a.billing_disposition, a.virtual_meeting_url, a.created_at, a.updated_at,
  coalesce(m.total_paid, 0)::numeric(12,2) AS total_paid,
  CASE
    WHEN a.billing_disposition = 'no_charge' THEN 'no_charge'
    WHEN coalesce(m.total_refunded, 0) > 0 AND coalesce(m.total_paid, 0) - coalesce(m.total_refunded, 0) <= 0 THEN 'refunded'
    WHEN coalesce(m.total_paid, 0) - coalesce(m.total_refunded, 0) >= a.quoted_amount AND a.quoted_amount > 0 THEN 'paid'
    WHEN coalesce(m.total_paid, 0) - coalesce(m.total_refunded, 0) > 0 THEN 'partial'
    ELSE 'pending'
  END AS payment_status,
  a.google_calendar_conflict_detected_at
FROM app.appointments a
LEFT JOIN LATERAL (
  SELECT sum(amount) FILTER (WHERE movement_kind = 'payment') AS total_paid,
    sum(amount) FILTER (WHERE movement_kind = 'refund') AS total_refunded
  FROM api.income_movements m WHERE m.appointment_id = a.id
) m ON true;

CREATE OR REPLACE VIEW api.appointment_income_summary
WITH (security_invoker = true) AS
SELECT
  a.organization_id, a.nutritionist_user_id, pm.currency,
  coalesce(sum(pm.amount) FILTER (WHERE pm.movement_kind = 'payment'), 0)::numeric(12,2) AS collected_amount,
  coalesce(sum(pm.amount) FILTER (WHERE pm.movement_kind = 'refund'), 0)::numeric(12,2) AS refunded_amount,
  count(*) FILTER (WHERE pm.movement_kind = 'payment')::integer AS payment_count
FROM app.appointments a
LEFT JOIN api.income_movements pm ON pm.appointment_id = a.id
GROUP BY a.organization_id, a.nutritionist_user_id, pm.currency;
NOTIFY pgrst,'reload schema';
