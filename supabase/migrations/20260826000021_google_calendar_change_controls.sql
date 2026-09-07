-- A reconnection can belong to a different Google account. Clear the prior
-- selection so a calendar from the old account is never reused by mistake.

CREATE OR REPLACE FUNCTION api.store_google_calendar_connection(
  p_organization_id uuid,
  p_nutritionist_user_id uuid,
  p_refresh_token_ciphertext text,
  p_refresh_token_iv text,
  p_granted_scopes text[],
  p_access_token_expires_at timestamptz
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Sólo el backend puede guardar tokens OAuth';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM app.organization_members
    WHERE organization_id = p_organization_id
      AND user_id = p_nutritionist_user_id
      AND role = 'nutritionist'
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'La profesional ya no tiene acceso activo';
  END IF;
  INSERT INTO app.google_calendar_connections (
    organization_id, nutritionist_user_id, refresh_token_ciphertext,
    refresh_token_iv, granted_scopes, access_token_expires_at, disconnected_at, last_error_code
  ) VALUES (
    p_organization_id, p_nutritionist_user_id, p_refresh_token_ciphertext,
    p_refresh_token_iv, coalesce(p_granted_scopes, '{}'), p_access_token_expires_at, NULL, NULL
  ) ON CONFLICT (organization_id, nutritionist_user_id) DO UPDATE
    SET refresh_token_ciphertext = EXCLUDED.refresh_token_ciphertext,
        refresh_token_iv = EXCLUDED.refresh_token_iv,
        granted_scopes = EXCLUDED.granted_scopes,
        access_token_expires_at = EXCLUDED.access_token_expires_at,
        disconnected_at = NULL,
        last_error_code = NULL;

  INSERT INTO app.professional_practice_settings (
    organization_id, nutritionist_user_id, selected_google_calendar_id, google_calendar_label, google_connection_status
  ) VALUES (
    p_organization_id, p_nutritionist_user_id, NULL, NULL, 'connected'
  ) ON CONFLICT (organization_id, nutritionist_user_id) DO UPDATE
    SET selected_google_calendar_id = NULL,
        google_calendar_label = NULL,
        google_connection_status = 'connected';
END;
$$;

DROP FUNCTION IF EXISTS api.get_google_calendar_connection_status(uuid);

CREATE FUNCTION api.get_google_calendar_connection_status(
  p_organization_id uuid
) RETURNS TABLE (
  status text,
  connected_at timestamptz,
  calendar_selected boolean,
  calendar_label text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT security.has_current_org_role(p_organization_id, ARRAY['nutritionist']) THEN
    RAISE EXCEPTION 'Sólo la profesional activa puede consultar este calendario';
  END IF;

  RETURN QUERY
  SELECT
    CASE WHEN connection.organization_id IS NOT NULL AND connection.disconnected_at IS NULL THEN 'connected' ELSE 'not_connected' END,
    CASE WHEN connection.disconnected_at IS NULL THEN connection.created_at ELSE NULL END,
    COALESCE(settings.selected_google_calendar_id IS NOT NULL, false),
    settings.google_calendar_label
  FROM (SELECT p_organization_id AS organization_id) requested
  LEFT JOIN app.google_calendar_connections AS connection
    ON connection.organization_id = requested.organization_id AND connection.nutritionist_user_id = auth.uid()
  LEFT JOIN app.professional_practice_settings AS settings
    ON settings.organization_id = requested.organization_id AND settings.nutritionist_user_id = auth.uid();
END;
$$;
