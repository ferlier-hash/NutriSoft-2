-- Migration: align the Admin directory with current-user authorization helpers.

CREATE OR REPLACE VIEW api.admin_organizations
WITH (security_invoker = true) AS
SELECT id, name, slug, status, created_at, updated_at
FROM app.organizations
WHERE security.is_current_platform_admin();

GRANT SELECT ON api.admin_organizations TO authenticated;
