-- Professional practice data is contextual to a consultorio. Account identity
-- remains in app.profiles and is never exposed to platform administrators.
CREATE TABLE app.professional_profiles (
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  nutritionist_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  specialty text NULL CHECK (specialty IS NULL OR char_length(trim(specialty)) BETWEEN 2 AND 100),
  registration_number text NULL CHECK (registration_number IS NULL OR char_length(trim(registration_number)) BETWEEN 1 AND 40),
  registration_province text NULL CHECK (registration_province IS NULL OR char_length(trim(registration_province)) BETWEEN 1 AND 60),
  registration_country text NULL CHECK (registration_country IS NULL OR char_length(trim(registration_country)) BETWEEN 1 AND 60),
  time_zone text NOT NULL DEFAULT 'America/Argentina/Cordoba',
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (organization_id, nutritionist_user_id),
  FOREIGN KEY (organization_id,nutritionist_user_id) REFERENCES app.organization_members(organization_id,user_id) ON DELETE CASCADE,
  CHECK ((registration_number IS NULL AND registration_province IS NULL AND registration_country IS NULL) OR (registration_number IS NOT NULL AND registration_province IS NOT NULL AND registration_country IS NOT NULL))
);
ALTER TABLE app.professional_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app.professional_profiles FROM anon,authenticated;

CREATE FUNCTION api.get_my_professional_profile(p_org uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
  IF security.is_current_platform_admin() OR NOT security.has_current_org_role(p_org, ARRAY['nutritionist']) THEN RAISE EXCEPTION 'Perfil no autorizado.'; END IF;
  SELECT jsonb_build_object(
    'fullName', account.full_name,
    'email', account.email,
    'phone', account.phone,
    'accountUpdatedAt', account.updated_at,
    'specialty', practice.specialty,
    'registrationNumber', practice.registration_number,
    'registrationProvince', practice.registration_province,
    'registrationCountry', practice.registration_country,
    'timeZone', coalesce(practice.time_zone,'America/Argentina/Cordoba'),
    'practiceUpdatedAt', practice.updated_at
  ) INTO result
  FROM app.profiles account
  LEFT JOIN app.professional_profiles practice ON practice.organization_id=p_org AND practice.nutritionist_user_id=account.id
  WHERE account.id=auth.uid();
  IF result IS NULL THEN RAISE EXCEPTION 'No encontramos el perfil de tu cuenta.'; END IF;
  RETURN result;
END; $$;

CREATE FUNCTION api.save_my_professional_profile(p_org uuid,p_profile jsonb,p_expected_account timestamptz DEFAULT NULL,p_expected_practice timestamptz DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE account app.profiles; practice app.professional_profiles; v_full_name text; v_phone text; v_specialty text; v_registration_number text; v_registration_province text; v_registration_country text; v_zone text; account_stamp timestamptz; practice_stamp timestamptz;
BEGIN
  IF security.is_current_platform_admin() OR NOT security.has_current_org_role(p_org, ARRAY['nutritionist']) THEN RAISE EXCEPTION 'Perfil no autorizado.'; END IF;
  IF p_profile IS NULL OR jsonb_typeof(p_profile) <> 'object' OR NOT p_profile ?& ARRAY['fullName','phone','specialty','registrationNumber','registrationProvince','registrationCountry','timeZone'] OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_profile) key WHERE key NOT IN ('fullName','phone','specialty','registrationNumber','registrationProvince','registrationCountry','timeZone')) THEN RAISE EXCEPTION 'Perfil incompleto.'; END IF;
  v_full_name := nullif(trim(p_profile->>'fullName'),''); v_phone := nullif(trim(p_profile->>'phone'),''); v_specialty := nullif(trim(p_profile->>'specialty'),''); v_registration_number := nullif(trim(p_profile->>'registrationNumber'),''); v_registration_province := nullif(trim(p_profile->>'registrationProvince'),''); v_registration_country := nullif(trim(p_profile->>'registrationCountry'),''); v_zone := trim(p_profile->>'timeZone');
  IF v_full_name IS NULL OR char_length(v_full_name) > 120 OR (v_phone IS NOT NULL AND char_length(v_phone)>30) OR (v_specialty IS NOT NULL AND char_length(v_specialty)>100) OR NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=v_zone) THEN RAISE EXCEPTION 'Revisá nombre, teléfono, especialidad y zona horaria.'; END IF;
  IF (v_registration_number IS NULL) <> (v_registration_province IS NULL) OR (v_registration_number IS NULL) <> (v_registration_country IS NULL) THEN RAISE EXCEPTION 'Completá matrícula, provincia y país, o dejá los tres campos vacíos.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('professional-profile:'||auth.uid()::text,0));
  SELECT * INTO account FROM app.profiles WHERE id=auth.uid() FOR UPDATE;
  SELECT * INTO practice FROM app.professional_profiles WHERE organization_id=p_org AND nutritionist_user_id=auth.uid() FOR UPDATE;
  IF account.updated_at IS DISTINCT FROM p_expected_account OR practice.updated_at IS DISTINCT FROM p_expected_practice THEN RAISE EXCEPTION 'El perfil cambió. Recargá antes de guardar.'; END IF;
  UPDATE app.profiles SET full_name=v_full_name, phone=v_phone, updated_at=clock_timestamp() WHERE id=auth.uid() RETURNING updated_at INTO account_stamp;
  INSERT INTO app.professional_profiles(organization_id,nutritionist_user_id,specialty,registration_number,registration_province,registration_country,time_zone)
  VALUES(p_org,auth.uid(),v_specialty,v_registration_number,v_registration_province,v_registration_country,v_zone)
  ON CONFLICT(organization_id,nutritionist_user_id) DO UPDATE SET specialty=excluded.specialty,registration_number=excluded.registration_number,registration_province=excluded.registration_province,registration_country=excluded.registration_country,time_zone=excluded.time_zone,updated_at=clock_timestamp()
  RETURNING updated_at INTO practice_stamp;
  INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details) VALUES(auth.uid(),p_org,'UPDATE_PROFESSIONAL_PROFILE','professional_profile',auth.uid(),jsonb_build_object('has_phone',v_phone IS NOT NULL,'has_registration',v_registration_number IS NOT NULL,'has_specialty',v_specialty IS NOT NULL));
  RETURN jsonb_build_object('accountUpdatedAt',account_stamp,'practiceUpdatedAt',practice_stamp);
END; $$;

REVOKE ALL ON FUNCTION api.get_my_professional_profile(uuid),api.save_my_professional_profile(uuid,jsonb,timestamptz,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION api.get_my_professional_profile(uuid),api.save_my_professional_profile(uuid,jsonb,timestamptz,timestamptz) TO authenticated;
NOTIFY pgrst,'reload schema';
