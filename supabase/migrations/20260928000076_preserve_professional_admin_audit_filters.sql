-- Extend, rather than narrow, the established allowlisted audit event surface.
CREATE OR REPLACE FUNCTION api.get_admin_audit_events(
  p_from timestamptz,p_to timestamptz,p_event_type text DEFAULT NULL,p_query text DEFAULT NULL,p_limit integer DEFAULT 50,p_offset integer DEFAULT 0
)
RETURNS TABLE(event_id uuid,occurred_at timestamptz,event_type text,organization_id uuid,organization_name text,organization_slug text,previous_value text,new_value text,extra_professionals integer,total_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $$
BEGIN
  IF NOT security.is_current_platform_admin() THEN RAISE EXCEPTION 'Acceso no autorizado: requiere rol platform_admin'; END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_from>=p_to OR p_to-p_from>interval '366 days' THEN RAISE EXCEPTION 'El período de auditoría debe ser válido y no superar 366 días.'; END IF;
  IF p_event_type IS NOT NULL AND p_event_type NOT IN ('organization_created','organization_status_changed','subscription_changed','professional_membership_changed','professional_account_suspension_changed') THEN RAISE EXCEPTION 'Tipo de evento no válido.'; END IF;
  IF p_query IS NOT NULL AND char_length(trim(p_query))>100 THEN RAISE EXCEPTION 'La búsqueda supera el máximo permitido.'; END IF;
  IF p_limit IS NULL OR p_limit<1 OR p_limit>100 OR p_offset IS NULL OR p_offset<0 OR p_offset>100000 THEN RAISE EXCEPTION 'Paginación no válida.'; END IF;
  RETURN QUERY WITH events AS (
    SELECT l.id,l.created_at,
      CASE l.action WHEN 'CREATE_ORGANIZATION' THEN 'organization_created' WHEN 'SET_ORGANIZATION_STATUS' THEN 'organization_status_changed'
        WHEN 'SET_PROFESSIONAL_MEMBERSHIP_STATUS' THEN 'professional_membership_changed' WHEN 'SET_PROFESSIONAL_ACCOUNT_SUSPENSION' THEN 'professional_account_suspension_changed' ELSE 'subscription_changed' END AS kind,
      l.organization_id,CASE WHEN l.action='SET_PROFESSIONAL_ACCOUNT_SUSPENSION' THEN 'Acceso global' ELSE coalesce(o.name,nullif(l.details->>'organization_name',''),'Consultorio eliminado') END AS org_name,
      coalesce(o.slug,nullif(l.details->>'organization_slug',''),nullif(l.details->>'slug','')) AS org_slug,
      CASE WHEN l.action='SET_ORGANIZATION_STATUS' THEN l.details->>'previous_status'
        WHEN l.action='SET_ORGANIZATION_SUBSCRIPTION' THEN concat_ws(' · ',upper(l.details->>'previous_plan_slug'),l.details->>'previous_status')
        WHEN l.action='SET_PROFESSIONAL_MEMBERSHIP_STATUS' THEN l.details->>'previous_status'
        WHEN l.action='SET_PROFESSIONAL_ACCOUNT_SUSPENSION' THEN CASE WHEN coalesce((l.details->>'previous_status')::boolean,false) THEN 'suspended' ELSE 'active' END ELSE NULL END AS old_value,
      CASE WHEN l.action='CREATE_ORGANIZATION' THEN 'created'
        WHEN l.action='SET_ORGANIZATION_STATUS' THEN l.details->>'status'
        WHEN l.action='SET_ORGANIZATION_SUBSCRIPTION' THEN concat_ws(' · ',upper(l.details->>'next_plan_slug'),l.details->>'next_status')
        WHEN l.action='SET_PROFESSIONAL_MEMBERSHIP_STATUS' THEN l.details->>'status'
        WHEN l.action='SET_PROFESSIONAL_ACCOUNT_SUSPENSION' THEN CASE WHEN (l.details->>'is_suspended')::boolean THEN 'suspended' ELSE 'active' END
        ELSE concat_ws(' · ',upper(coalesce(l.details->>'plan',l.details->>'next_plan_slug')),l.details->>'effective_on') END AS next_value,
      nullif(l.details->>'extra_professionals','')::integer AS extras
    FROM app.audit_logs l LEFT JOIN app.organizations o ON o.id=l.organization_id
    WHERE l.action IN ('CREATE_ORGANIZATION','SET_ORGANIZATION_STATUS','SET_ORGANIZATION_SUBSCRIPTION','SCHEDULE_ORGANIZATION_SUBSCRIPTION','CANCEL_SCHEDULED_SUBSCRIPTION','APPLY_SCHEDULED_SUBSCRIPTION','SET_PROFESSIONAL_MEMBERSHIP_STATUS','SET_PROFESSIONAL_ACCOUNT_SUSPENSION')
      AND l.created_at>=p_from AND l.created_at<p_to
  ), filtered AS (SELECT e.* FROM events e WHERE (p_event_type IS NULL OR e.kind=p_event_type)
    AND (nullif(trim(p_query),'') IS NULL OR position(lower(trim(p_query)) IN lower(coalesce(e.org_name,'')||' '||coalesce(e.org_slug,'')))>0)),
    paged AS (SELECT f.*,count(*) OVER() AS full_count FROM filtered f ORDER BY f.created_at DESC,f.id DESC LIMIT p_limit OFFSET p_offset)
  SELECT p.id,p.created_at,p.kind,p.organization_id,p.org_name,p.org_slug,p.old_value,p.next_value,p.extras,p.full_count FROM paged p;
END; $$;

REVOKE ALL ON FUNCTION api.get_admin_audit_events(timestamptz,timestamptz,text,text,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION api.get_admin_audit_events(timestamptz,timestamptz,text,text,integer,integer) TO authenticated;
