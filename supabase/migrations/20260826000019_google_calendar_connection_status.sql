-- Safe read surface for the Google connection. It never exposes tokens,
-- scopes, calendar IDs, or any external event metadata to the browser.

CREATE OR REPLACE FUNCTION api.get_google_calendar_connection_status(
  p_organization_id uuid
) RETURNS TABLE (
  status text,
  connected_at timestamptz,
  calendar_selected boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT security.has_current_org_role(p_organization_id, ARRAY['nutritionist']) THEN
    RAISE EXCEPTION 'Sólo la profesional activa puede consultar este calendario';
  END IF;

  RETURN QUERY
  SELECT
    CASE
      WHEN connection.organization_id IS NOT NULL AND connection.disconnected_at IS NULL THEN 'connected'
      ELSE 'not_connected'
    END,
    CASE
      WHEN connection.disconnected_at IS NULL THEN connection.created_at
      ELSE NULL
    END,
    COALESCE(settings.selected_google_calendar_id IS NOT NULL, false)
  FROM (SELECT p_organization_id AS organization_id) requested
  LEFT JOIN app.google_calendar_connections AS connection
    ON connection.organization_id = requested.organization_id
    AND connection.nutritionist_user_id = auth.uid()
  LEFT JOIN app.professional_practice_settings AS settings
    ON settings.organization_id = requested.organization_id
    AND settings.nutritionist_user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION api.get_google_calendar_connection_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.get_google_calendar_connection_status(uuid) TO authenticated;
