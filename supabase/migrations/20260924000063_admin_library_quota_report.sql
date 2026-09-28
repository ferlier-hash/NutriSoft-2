-- Exact aggregate of the enforced per-professional PDF quotas.
-- No professional or file identities are returned.
CREATE OR REPLACE FUNCTION api.get_admin_library_quota_report()
RETURNS TABLE (
  organization_id uuid,
  upload_enabled_professionals bigint,
  effective_library_quota_bytes bigint,
  professionals_near_library_quota bigint,
  professionals_over_library_quota bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT security.is_current_platform_admin() THEN
    RAISE EXCEPTION 'Acceso no autorizado: requiere rol platform_admin';
  END IF;

  RETURN QUERY
  WITH eligible AS (
    SELECT m.organization_id, m.user_id, s.storage_limit_bytes
    FROM app.organization_members m
    JOIN app.professional_library_settings s
      ON s.organization_id = m.organization_id AND s.owner_user_id = m.user_id
    WHERE m.role = 'nutritionist' AND m.status = 'active'
      AND s.policy_version = '2026-09-13-v1' AND s.accepted_at IS NOT NULL
  ), individual_usage AS (
    SELECT split_part(o.name, '/', 2)::uuid AS organization_id,
           split_part(o.name, '/', 1)::uuid AS owner_user_id,
           sum(CASE WHEN o.metadata->>'size' ~ '^[0-9]+$'
                    THEN (o.metadata->>'size')::bigint ELSE 0 END)::bigint AS used_bytes
    FROM storage.objects o
    WHERE o.bucket_id = 'educational-documents'
      AND split_part(o.name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND split_part(o.name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    GROUP BY split_part(o.name, '/', 2)::uuid, split_part(o.name, '/', 1)::uuid
  )
  SELECT e.organization_id,
         count(*)::bigint,
         sum(e.storage_limit_bytes)::bigint,
         count(*) FILTER (WHERE coalesce(u.used_bytes, 0) >= e.storage_limit_bytes * 0.8)::bigint,
         count(*) FILTER (WHERE coalesce(u.used_bytes, 0) > e.storage_limit_bytes)::bigint
  FROM eligible e
  LEFT JOIN individual_usage u ON u.organization_id = e.organization_id AND u.owner_user_id = e.user_id
  GROUP BY e.organization_id
  ORDER BY e.organization_id;
END;
$$;

REVOKE ALL ON FUNCTION api.get_admin_library_quota_report() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION api.get_admin_library_quota_report() TO authenticated;
NOTIFY pgrst, 'reload schema';
