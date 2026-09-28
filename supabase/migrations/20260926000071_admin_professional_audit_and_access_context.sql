-- Keep professional access changes visible in the allowlisted Admin audit feed.
CREATE OR REPLACE FUNCTION api.get_admin_audit_events(p_from timestamptz,p_to timestamptz,p_event_type text DEFAULT NULL,p_query text DEFAULT NULL,p_limit integer DEFAULT 50,p_offset integer DEFAULT 0)
RETURNS TABLE(event_id uuid,occurred_at timestamptz,event_type text,organization_id uuid,organization_name text,organization_slug text,previous_value text,new_value text,extra_professionals integer,total_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT security.is_current_platform_admin() THEN RAISE EXCEPTION 'Acceso no autorizado: requiere rol platform_admin'; END IF;
 IF p_from IS NULL OR p_to IS NULL OR p_from>=p_to OR p_to-p_from>interval '366 days' THEN RAISE EXCEPTION 'El período de auditoría debe ser válido y no superar 366 días.'; END IF;
 IF p_event_type IS NOT NULL AND p_event_type NOT IN ('organization_created','organization_status_changed','subscription_changed','professional_membership_changed','professional_account_suspension_changed') THEN RAISE EXCEPTION 'Tipo de evento no válido.'; END IF;
 IF length(coalesce(p_query,''))>100 OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 OR p_offset IS NULL OR p_offset NOT BETWEEN 0 AND 100000 THEN RAISE EXCEPTION 'Filtros o paginación no válidos.'; END IF;
 RETURN QUERY WITH events AS (
  SELECT l.id,l.created_at,
   CASE l.action WHEN 'CREATE_ORGANIZATION' THEN 'organization_created' WHEN 'SET_ORGANIZATION_STATUS' THEN 'organization_status_changed' WHEN 'SET_ORGANIZATION_SUBSCRIPTION' THEN 'subscription_changed' WHEN 'SET_PROFESSIONAL_MEMBERSHIP_STATUS' THEN 'professional_membership_changed' ELSE 'professional_account_suspension_changed' END AS kind,
   l.organization_id,
   CASE WHEN l.action='SET_PROFESSIONAL_ACCOUNT_SUSPENSION' THEN 'Acceso global' ELSE coalesce(o.name,nullif(l.details->>'organization_name',''),'Consultorio eliminado') END AS org_name,
   coalesce(o.slug,nullif(l.details->>'organization_slug',''),nullif(l.details->>'slug','')) AS org_slug,
   CASE l.action WHEN 'SET_ORGANIZATION_STATUS' THEN l.details->>'previous_status' WHEN 'SET_ORGANIZATION_SUBSCRIPTION' THEN concat_ws(' · ',upper(l.details->>'previous_plan_slug'),l.details->>'previous_status') WHEN 'SET_PROFESSIONAL_MEMBERSHIP_STATUS' THEN l.details->>'previous_status' WHEN 'SET_PROFESSIONAL_ACCOUNT_SUSPENSION' THEN CASE WHEN coalesce((l.details->>'previous_status')::boolean,false) THEN 'suspended' ELSE 'active' END ELSE NULL END AS old_value,
   CASE l.action WHEN 'CREATE_ORGANIZATION' THEN 'created' WHEN 'SET_ORGANIZATION_STATUS' THEN l.details->>'status' WHEN 'SET_ORGANIZATION_SUBSCRIPTION' THEN concat_ws(' · ',upper(l.details->>'next_plan_slug'),l.details->>'next_status') WHEN 'SET_PROFESSIONAL_MEMBERSHIP_STATUS' THEN l.details->>'status' ELSE CASE WHEN (l.details->>'is_suspended')::boolean THEN 'suspended' ELSE 'active' END END AS next_value,
   CASE WHEN l.action='SET_ORGANIZATION_SUBSCRIPTION' THEN nullif(l.details->>'extra_professionals','')::integer ELSE NULL END AS extras
  FROM app.audit_logs l LEFT JOIN app.organizations o ON o.id=l.organization_id
  WHERE l.action IN ('CREATE_ORGANIZATION','SET_ORGANIZATION_STATUS','SET_ORGANIZATION_SUBSCRIPTION','SET_PROFESSIONAL_MEMBERSHIP_STATUS','SET_PROFESSIONAL_ACCOUNT_SUSPENSION') AND l.created_at>=p_from AND l.created_at<p_to
 ), filtered AS (SELECT e.* FROM events e WHERE (p_event_type IS NULL OR e.kind=p_event_type) AND (nullif(trim(p_query),'') IS NULL OR position(lower(trim(p_query)) IN lower(coalesce(e.org_name,'')||' '||coalesce(e.org_slug,'')))>0)), paged AS (SELECT f.*,count(*) OVER() AS full_count FROM filtered f ORDER BY f.created_at DESC,f.id DESC LIMIT p_limit OFFSET p_offset)
 SELECT p.id,p.created_at,p.kind,p.organization_id,p.org_name,p.org_slug,p.old_value,p.next_value,p.extras,p.full_count FROM paged p;
END; $$;
REVOKE ALL ON FUNCTION api.get_admin_audit_events(timestamptz,timestamptz,text,text,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION api.get_admin_audit_events(timestamptz,timestamptz,text,text,integer,integer) TO authenticated;

-- Make a global block revoke the temporary 14-day read-only transfer access as well.
CREATE OR REPLACE FUNCTION security.is_transfer_readonly_professional(p_patient_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND NOT security.is_platform_account_suspended(auth.uid()) AND EXISTS (
   SELECT 1 FROM app.patient_professional_transfers t JOIN app.organizations o ON o.id=t.organization_id AND o.status='active'
   JOIN app.organization_members m ON m.organization_id=t.organization_id AND m.user_id=auth.uid() AND m.role='nutritionist' AND m.status='active'
   WHERE t.patient_id=p_patient_id AND t.previous_professional_user_id=auth.uid() AND t.revoked_at IS NULL AND t.read_only_until>clock_timestamp()
 );
$$;
REVOKE ALL ON FUNCTION security.is_transfer_readonly_professional(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION security.is_transfer_readonly_professional(uuid) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION api.get_current_access_context()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user_id uuid:=auth.uid(); v_blocked boolean; v_result jsonb;
BEGIN
 IF v_user_id IS NULL THEN RAISE EXCEPTION 'Autenticación requerida'; END IF;
 v_blocked:=security.is_platform_account_suspended(v_user_id);
 SELECT jsonb_build_object(
  'user_id',v_user_id,
  'platform_role',CASE WHEN EXISTS(SELECT 1 FROM app.user_platform_roles r WHERE r.user_id=v_user_id AND r.role='platform_admin') THEN 'platform_admin' ELSE NULL END,
  'memberships',coalesce((SELECT jsonb_agg(jsonb_build_object('organization_id',m.organization_id,'organization_name',o.name,'organization_status',o.status,'role',m.role,'membership_status',CASE WHEN v_blocked THEN 'inactive' ELSE m.status END) ORDER BY m.created_at,m.organization_id) FROM app.organization_members m JOIN app.organizations o ON o.id=m.organization_id WHERE m.user_id=v_user_id),'[]'::jsonb),
  'patient_accesses',coalesce((SELECT jsonb_agg(jsonb_build_object('organization_id',a.organization_id,'organization_status',o.status,'patient_id',a.patient_id,'patient_status',p.status,'access_status',CASE WHEN v_blocked THEN 'revoked' ELSE a.status END) ORDER BY a.granted_at,a.patient_id) FROM app.patient_portal_access a JOIN app.patients p ON p.id=a.patient_id AND p.organization_id=a.organization_id JOIN app.organizations o ON o.id=a.organization_id WHERE a.user_id=v_user_id),'[]'::jsonb)
 ) INTO v_result;
 RETURN v_result;
END; $$;
REVOKE ALL ON FUNCTION api.get_current_access_context() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION api.get_current_access_context() TO authenticated,service_role;
NOTIFY pgrst,'reload schema';
