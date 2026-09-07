-- Defaults are contextual to the professional and consultorio. They only prefill
-- future appointment forms; every appointment retains its own quoted amount/currency.
ALTER TABLE app.professional_practice_settings
  ADD COLUMN IF NOT EXISTS default_duration_minutes smallint NOT NULL DEFAULT 45
    CHECK (default_duration_minutes IN (15,30,45,60,75,90)),
  ADD COLUMN IF NOT EXISTS default_virtual_price numeric(12,2) NOT NULL DEFAULT 0
    CHECK (default_virtual_price >= 0),
  ADD COLUMN IF NOT EXISTS default_in_person_price numeric(12,2) NOT NULL DEFAULT 0
    CHECK (default_in_person_price >= 0);

CREATE OR REPLACE FUNCTION api.get_my_appointment_preferences(p_org uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
  IF security.is_current_platform_admin() OR NOT security.has_current_org_role(p_org, ARRAY['nutritionist']) THEN
    RAISE EXCEPTION 'Configuración no autorizada.';
  END IF;
  SELECT jsonb_build_object(
    'currency', default_currency,
    'durationMinutes', default_duration_minutes,
    'virtualPrice', default_virtual_price,
    'inPersonPrice', default_in_person_price,
    'updatedAt', updated_at
  ) INTO result
  FROM app.professional_practice_settings
  WHERE organization_id=p_org AND nutritionist_user_id=auth.uid();
  RETURN coalesce(result, jsonb_build_object('currency','ARS','durationMinutes',45,'virtualPrice',0,'inPersonPrice',0,'updatedAt',NULL));
END; $$;

CREATE OR REPLACE FUNCTION api.save_my_appointment_preferences(p_org uuid,p_settings jsonb,p_expected timestamptz DEFAULT NULL) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE prior app.professional_practice_settings; stamp timestamptz; currency text; duration smallint; virtual_price numeric; in_person_price numeric;
BEGIN
  IF security.is_current_platform_admin() OR NOT security.has_current_org_role(p_org, ARRAY['nutritionist']) THEN
    RAISE EXCEPTION 'Configuración no autorizada.';
  END IF;
  IF p_settings IS NULL OR jsonb_typeof(p_settings) <> 'object'
    OR NOT p_settings ?& ARRAY['currency','durationMinutes','virtualPrice','inPersonPrice']
    OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_settings) key WHERE key NOT IN ('currency','durationMinutes','virtualPrice','inPersonPrice')) THEN
    RAISE EXCEPTION 'Preferencias incompletas.';
  END IF;
  currency := p_settings->>'currency';
  duration := (p_settings->>'durationMinutes')::smallint;
  virtual_price := (p_settings->>'virtualPrice')::numeric;
  in_person_price := (p_settings->>'inPersonPrice')::numeric;
  IF currency NOT IN ('ARS','CLP','BRL','USD','MXN','COP','PEN','EUR','UYU')
    OR duration NOT IN (15,30,45,60,75,90) OR virtual_price < 0 OR in_person_price < 0
    OR virtual_price > 9999999999.99 OR in_person_price > 9999999999.99 THEN
    RAISE EXCEPTION 'Revisá moneda, duración e importes sugeridos.';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('appointment-preferences:'||auth.uid()::text,0));
  SELECT * INTO prior FROM app.professional_practice_settings WHERE organization_id=p_org AND nutritionist_user_id=auth.uid() FOR UPDATE;
  IF prior.updated_at IS DISTINCT FROM p_expected THEN
    RAISE EXCEPTION 'La configuración cambió. Recargá antes de guardar.';
  END IF;
  INSERT INTO app.professional_practice_settings(organization_id,nutritionist_user_id,default_currency,default_duration_minutes,default_virtual_price,default_in_person_price)
  VALUES(p_org,auth.uid(),currency,duration,virtual_price,in_person_price)
  ON CONFLICT(organization_id,nutritionist_user_id) DO UPDATE SET
    default_currency=excluded.default_currency,
    default_duration_minutes=excluded.default_duration_minutes,
    default_virtual_price=excluded.default_virtual_price,
    default_in_person_price=excluded.default_in_person_price
  RETURNING updated_at INTO stamp;
  INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details)
  VALUES(auth.uid(),p_org,'UPDATE_APPOINTMENT_PREFERENCES','professional_practice',p_org,jsonb_build_object('currency',currency,'duration_minutes',duration));
  RETURN stamp;
END; $$;

REVOKE ALL ON FUNCTION api.get_my_appointment_preferences(uuid),api.save_my_appointment_preferences(uuid,jsonb,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION api.get_my_appointment_preferences(uuid),api.save_my_appointment_preferences(uuid,jsonb,timestamptz) TO authenticated;
NOTIFY pgrst,'reload schema';
