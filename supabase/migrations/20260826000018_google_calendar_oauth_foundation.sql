-- Google Calendar OAuth foundation.
-- Tokens are encrypted by the Edge Function before storage and are never exposed
-- through the api schema or to the browser.

CREATE TABLE app.google_calendar_connections (
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  nutritionist_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  refresh_token_ciphertext text NOT NULL CHECK (char_length(refresh_token_ciphertext) BETWEEN 1 AND 8192),
  refresh_token_iv text NOT NULL CHECK (char_length(refresh_token_iv) BETWEEN 1 AND 512),
  granted_scopes text[] NOT NULL DEFAULT '{}',
  access_token_expires_at timestamptz NULL,
  last_synced_at timestamptz NULL,
  last_error_code text NULL CHECK (last_error_code IS NULL OR char_length(last_error_code) <= 80),
  disconnected_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, nutritionist_user_id),
  CONSTRAINT fk_google_calendar_connection_member
    FOREIGN KEY (organization_id, nutritionist_user_id)
    REFERENCES app.organization_members(organization_id, user_id) ON DELETE CASCADE
);
CREATE TRIGGER trg_google_calendar_connections_updated_at
  BEFORE UPDATE ON app.google_calendar_connections
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE TABLE app.google_calendar_oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_hash text NOT NULL UNIQUE CHECK (char_length(state_hash) = 64),
  organization_id uuid NOT NULL,
  nutritionist_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_google_calendar_state_member
    FOREIGN KEY (organization_id, nutritionist_user_id)
    REFERENCES app.organization_members(organization_id, user_id) ON DELETE CASCADE,
  CONSTRAINT ck_google_calendar_state_expiry CHECK (expires_at > created_at)
);
CREATE INDEX idx_google_calendar_oauth_states_expiry
  ON app.google_calendar_oauth_states(expires_at) WHERE consumed_at IS NULL;

ALTER TABLE app.google_calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.google_calendar_oauth_states ENABLE ROW LEVEL SECURITY;

-- No client-facing policy deliberately: encrypted tokens and OAuth state are
-- accessible only by SECURITY DEFINER RPCs invoked by the authenticated owner
-- or by the server-side service role.
REVOKE ALL ON app.google_calendar_connections, app.google_calendar_oauth_states FROM authenticated;

CREATE OR REPLACE FUNCTION api.create_google_calendar_oauth_state(
  p_organization_id uuid,
  p_state_hash text,
  p_expires_at timestamptz
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF p_state_hash IS NULL OR p_state_hash !~ '^[a-f0-9]{64}$'
     OR p_expires_at IS NULL OR p_expires_at <= now() OR p_expires_at > now() + interval '15 minutes' THEN
    RAISE EXCEPTION 'Estado OAuth inválido';
  END IF;
  IF NOT security.has_current_org_role(p_organization_id, ARRAY['nutritionist']) THEN
    RAISE EXCEPTION 'Sólo la profesional activa puede conectar su calendario';
  END IF;
  DELETE FROM app.google_calendar_oauth_states
    WHERE organization_id = p_organization_id
      AND nutritionist_user_id = auth.uid()
      AND consumed_at IS NULL;
  INSERT INTO app.google_calendar_oauth_states (state_hash, organization_id, nutritionist_user_id, expires_at)
  VALUES (p_state_hash, p_organization_id, auth.uid(), p_expires_at);
END;
$$;

CREATE OR REPLACE FUNCTION api.consume_google_calendar_oauth_state(
  p_state_hash text
) RETURNS TABLE (organization_id uuid, nutritionist_user_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Sólo el backend puede consumir un estado OAuth';
  END IF;
  RETURN QUERY
  UPDATE app.google_calendar_oauth_states
  SET consumed_at = now()
  WHERE state_hash = p_state_hash
    AND consumed_at IS NULL
    AND expires_at > now()
  RETURNING app.google_calendar_oauth_states.organization_id,
            app.google_calendar_oauth_states.nutritionist_user_id;
END;
$$;

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
    organization_id, nutritionist_user_id, google_connection_status
  ) VALUES (
    p_organization_id, p_nutritionist_user_id, 'connected'
  ) ON CONFLICT (organization_id, nutritionist_user_id) DO UPDATE
    SET google_connection_status = 'connected';
END;
$$;

REVOKE ALL ON FUNCTION api.create_google_calendar_oauth_state(uuid, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION api.consume_google_calendar_oauth_state(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION api.store_google_calendar_connection(uuid, uuid, text, text, text[], timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.create_google_calendar_oauth_state(uuid, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION api.consume_google_calendar_oauth_state(text) TO service_role;
GRANT EXECUTE ON FUNCTION api.store_google_calendar_connection(uuid, uuid, text, text, text[], timestamptz) TO service_role;
