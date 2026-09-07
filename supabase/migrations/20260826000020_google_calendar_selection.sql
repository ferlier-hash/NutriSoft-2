-- Server-only accessors for the calendar selector. Refresh tokens remain
-- encrypted and are returned solely to the Edge Function running as service_role.

CREATE OR REPLACE FUNCTION api.get_google_calendar_connection_for_service(
  p_organization_id uuid,
  p_nutritionist_user_id uuid
) RETURNS TABLE (
  refresh_token_ciphertext text,
  refresh_token_iv text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Sólo el backend puede leer la conexión de Google';
  END IF;
  RETURN QUERY
  SELECT connection.refresh_token_ciphertext, connection.refresh_token_iv
  FROM app.google_calendar_connections AS connection
  WHERE connection.organization_id = p_organization_id
    AND connection.nutritionist_user_id = p_nutritionist_user_id
    AND connection.disconnected_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION api.set_google_calendar_selection_for_service(
  p_organization_id uuid,
  p_nutritionist_user_id uuid,
  p_calendar_id text,
  p_calendar_label text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Sólo el backend puede guardar el calendario elegido';
  END IF;
  IF nullif(trim(p_calendar_id), '') IS NULL OR char_length(trim(p_calendar_id)) > 255
     OR nullif(trim(p_calendar_label), '') IS NULL OR char_length(trim(p_calendar_label)) > 120 THEN
    RAISE EXCEPTION 'Calendario inválido';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM app.google_calendar_connections
    WHERE organization_id = p_organization_id
      AND nutritionist_user_id = p_nutritionist_user_id
      AND disconnected_at IS NULL
  ) THEN
    RAISE EXCEPTION 'No existe una conexión activa de Google';
  END IF;

  INSERT INTO app.professional_practice_settings (
    organization_id, nutritionist_user_id, selected_google_calendar_id, google_calendar_label, google_connection_status
  ) VALUES (
    p_organization_id, p_nutritionist_user_id, trim(p_calendar_id), trim(p_calendar_label), 'connected'
  ) ON CONFLICT (organization_id, nutritionist_user_id) DO UPDATE
    SET selected_google_calendar_id = EXCLUDED.selected_google_calendar_id,
        google_calendar_label = EXCLUDED.google_calendar_label,
        google_connection_status = 'connected';

  INSERT INTO app.audit_logs (actor_id, organization_id, action, resource_type, resource_id, details)
  VALUES (
    p_nutritionist_user_id,
    p_organization_id,
    'SELECT_GOOGLE_CALENDAR',
    'google_calendar_connection',
    p_nutritionist_user_id,
    jsonb_build_object('calendar_selected', true)
  );
END;
$$;

REVOKE ALL ON FUNCTION api.get_google_calendar_connection_for_service(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION api.set_google_calendar_selection_for_service(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.get_google_calendar_connection_for_service(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION api.set_google_calendar_selection_for_service(uuid, uuid, text, text) TO service_role;
