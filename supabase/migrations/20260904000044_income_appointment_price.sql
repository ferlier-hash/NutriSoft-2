-- Correct the agreed price without rewriting payments or operational state.
CREATE FUNCTION api.update_income_appointment_price(p_appointment uuid,p_expected timestamptz,p_amount numeric)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a app.appointments; result timestamptz;
BEGIN
 IF security.is_current_platform_admin() OR NOT security.can_current_manage_appointment(p_appointment) THEN RAISE EXCEPTION 'Cita no autorizada.'; END IF;
 SELECT * INTO a FROM app.appointments WHERE id=p_appointment FOR UPDATE;
 IF p_expected IS NULL OR p_amount IS NULL OR p_amount<0 OR p_amount>=10000000000 OR p_amount<>round(p_amount,2) THEN RAISE EXCEPTION 'Ingresá un precio válido, desde cero y con hasta dos decimales.'; END IF;
 -- An identical retry is harmless, including after a lost response.
 IF a.quoted_amount=p_amount THEN RETURN a.updated_at; END IF;
 IF a.updated_at<>p_expected THEN RAISE EXCEPTION 'La cita cambió. Cerrá y actualizá Ingresos antes de editar el precio.'; END IF;
 UPDATE app.appointments SET quoted_amount=p_amount WHERE id=a.id RETURNING updated_at INTO result;
 INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details)
 VALUES(auth.uid(),a.organization_id,'CORRECT_APPOINTMENT_PRICE','appointment',a.id,jsonb_build_object('previous_amount',a.quoted_amount,'amount',p_amount,'currency',a.currency));
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION api.update_income_appointment_price(uuid,timestamptz,numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.update_income_appointment_price(uuid,timestamptz,numeric) TO authenticated;
NOTIFY pgrst,'reload schema';
