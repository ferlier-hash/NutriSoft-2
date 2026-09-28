-- Platform Admin audit surface. Only whitelisted commercial/account actions are exposed.

-- Preserve historical subscription events in the immutable, centralized audit stream.
INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details,created_at)
SELECT e.created_by,e.organization_id,'SET_ORGANIZATION_SUBSCRIPTION','organization_subscription_event',e.id,
       jsonb_build_object(
         'previous_plan_slug',e.previous_plan_slug,
         'next_plan_slug',e.next_plan_slug,
         'previous_status',e.previous_status,
         'next_status',e.next_status,
         'extra_professionals',e.extra_professionals
       ),e.created_at
FROM app.organization_subscription_events e
WHERE NOT EXISTS (
  SELECT 1 FROM app.audit_logs l
  WHERE l.action='SET_ORGANIZATION_SUBSCRIPTION'
    AND l.resource_type='organization_subscription_event'
    AND l.resource_id=e.id
);

CREATE OR REPLACE FUNCTION api.set_organization_status(p_org_id uuid,p_status text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=''
AS $$
DECLARE
  v_org app.organizations%ROWTYPE;
BEGIN
  IF NOT security.is_current_platform_admin() THEN
    RAISE EXCEPTION 'Acceso no autorizado: requiere rol platform_admin';
  END IF;
  IF p_status NOT IN ('active','suspended') THEN
    RAISE EXCEPTION 'Estado no válido';
  END IF;

  SELECT * INTO v_org FROM app.organizations WHERE id=p_org_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Organización no encontrada'; END IF;
  IF v_org.status=p_status THEN RETURN true; END IF;

  UPDATE app.organizations SET status=p_status WHERE id=p_org_id;
  INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details)
  VALUES(auth.uid(),p_org_id,'SET_ORGANIZATION_STATUS','organization',p_org_id,
    jsonb_build_object('previous_status',v_org.status,'status',p_status,'organization_name',v_org.name,'organization_slug',v_org.slug));
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION api.set_organization_subscription(
  p_org uuid,p_plan_slug text,p_status text DEFAULT 'active',p_extra_professionals integer DEFAULT 0,p_reason text DEFAULT 'commercial configuration'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=''
AS $$
DECLARE
  v_old app.organization_subscriptions;
  v_org app.organizations%ROWTYPE;
  v_event_id uuid;
  v_extras integer;
BEGIN
  IF NOT security.is_current_platform_admin() THEN RAISE EXCEPTION 'Sólo Platform Admin puede configurar suscripciones.'; END IF;
  IF p_plan_slug NOT IN ('pro','ultra','custom') OR p_status NOT IN ('trialing','active','grace','suspended','cancelled') OR p_extra_professionals < 0 THEN
    RAISE EXCEPTION 'Configuración comercial inválida.';
  END IF;
  SELECT * INTO v_org FROM app.organizations WHERE id=p_org FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Organización no encontrada.'; END IF;
  SELECT * INTO v_old FROM app.organization_subscriptions WHERE organization_id=p_org FOR UPDATE;
  v_extras := CASE WHEN p_plan_slug='pro' THEN p_extra_professionals ELSE 0 END;
  IF v_old.organization_id IS NOT NULL AND v_old.plan_slug=p_plan_slug AND v_old.status=p_status AND v_old.extra_professionals=v_extras THEN
    RETURN;
  END IF;

  INSERT INTO app.organization_subscriptions(organization_id,plan_slug,status,extra_professionals)
  VALUES(p_org,p_plan_slug,p_status,v_extras)
  ON CONFLICT(organization_id) DO UPDATE
    SET plan_slug=excluded.plan_slug,status=excluded.status,extra_professionals=excluded.extra_professionals,updated_at=clock_timestamp();

  INSERT INTO app.organization_subscription_events(organization_id,previous_plan_slug,next_plan_slug,previous_status,next_status,extra_professionals,reason,created_by)
  VALUES(p_org,v_old.plan_slug,p_plan_slug,v_old.status,p_status,v_extras,left(trim(p_reason),200),auth.uid())
  RETURNING id INTO v_event_id;

  INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details)
  VALUES(auth.uid(),p_org,'SET_ORGANIZATION_SUBSCRIPTION','organization_subscription_event',v_event_id,
    jsonb_build_object(
      'previous_plan_slug',v_old.plan_slug,'next_plan_slug',p_plan_slug,
      'previous_status',v_old.status,'next_status',p_status,'extra_professionals',v_extras,
      'organization_name',v_org.name,'organization_slug',v_org.slug
    ));
END;
$$;

CREATE OR REPLACE FUNCTION api.get_admin_audit_events(
  p_from timestamptz,
  p_to timestamptz,
  p_event_type text DEFAULT NULL,
  p_query text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  event_id uuid,
  occurred_at timestamptz,
  event_type text,
  organization_id uuid,
  organization_name text,
  organization_slug text,
  previous_value text,
  new_value text,
  extra_professionals integer,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path=''
AS $$
BEGIN
  IF NOT security.is_current_platform_admin() THEN RAISE EXCEPTION 'Acceso no autorizado: requiere rol platform_admin'; END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_from >= p_to OR p_to-p_from > interval '366 days' THEN
    RAISE EXCEPTION 'El período de auditoría debe ser válido y no superar 366 días.';
  END IF;
  IF p_event_type IS NOT NULL AND p_event_type NOT IN ('organization_created','organization_status_changed','subscription_changed') THEN
    RAISE EXCEPTION 'Tipo de evento no válido.';
  END IF;
  IF p_query IS NOT NULL AND char_length(trim(p_query)) > 100 THEN RAISE EXCEPTION 'La búsqueda supera el máximo permitido.'; END IF;
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 OR p_offset IS NULL OR p_offset < 0 OR p_offset > 100000 THEN
    RAISE EXCEPTION 'Paginación no válida.';
  END IF;

  RETURN QUERY
  WITH events AS (
    SELECT l.id AS id,l.created_at,
      CASE l.action WHEN 'CREATE_ORGANIZATION' THEN 'organization_created'
        WHEN 'SET_ORGANIZATION_STATUS' THEN 'organization_status_changed'
        ELSE 'subscription_changed' END AS kind,
      l.organization_id,
      coalesce(o.name,nullif(l.details->>'organization_name',''),'Consultorio eliminado') AS org_name,
      coalesce(o.slug,nullif(l.details->>'organization_slug',''),nullif(l.details->>'slug','')) AS org_slug,
      CASE l.action
        WHEN 'SET_ORGANIZATION_STATUS' THEN l.details->>'previous_status'
        WHEN 'SET_ORGANIZATION_SUBSCRIPTION' THEN concat_ws(' · ',upper(l.details->>'previous_plan_slug'),l.details->>'previous_status')
        ELSE NULL
      END AS old_value,
      CASE l.action
        WHEN 'CREATE_ORGANIZATION' THEN 'created'
        WHEN 'SET_ORGANIZATION_STATUS' THEN l.details->>'status'
        ELSE concat_ws(' · ',upper(l.details->>'next_plan_slug'),l.details->>'next_status')
      END AS next_value,
      CASE WHEN l.action='SET_ORGANIZATION_SUBSCRIPTION' THEN nullif(l.details->>'extra_professionals','')::integer ELSE NULL END AS extra_professionals
    FROM app.audit_logs l
    LEFT JOIN app.organizations o ON o.id=l.organization_id
    WHERE l.action IN ('CREATE_ORGANIZATION','SET_ORGANIZATION_STATUS','SET_ORGANIZATION_SUBSCRIPTION')
      AND l.created_at>=p_from AND l.created_at<p_to
  ), filtered AS (
    SELECT e.* FROM events e
    WHERE (p_event_type IS NULL OR e.kind=p_event_type)
      AND (nullif(trim(p_query),'') IS NULL OR position(lower(trim(p_query)) IN lower(coalesce(e.org_name,'')||' '||coalesce(e.org_slug,'')))>0)
  ), paged AS (
    SELECT f.*,count(*) OVER() AS full_count
    FROM filtered f
    ORDER BY f.created_at DESC,f.id DESC
    LIMIT p_limit OFFSET p_offset
  )
  SELECT p.id,p.created_at,p.kind,p.organization_id,p.org_name,p.org_slug,p.old_value,p.next_value,p.extra_professionals,p.full_count
  FROM paged p;
END;
$$;

REVOKE ALL ON FUNCTION api.get_admin_audit_events(timestamptz,timestamptz,text,text,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION api.get_admin_audit_events(timestamptz,timestamptz,text,text,integer,integer) TO authenticated;
NOTIFY pgrst,'reload schema';
