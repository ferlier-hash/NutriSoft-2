-- Platform Admin can invite professionals to a clinic. Membership is only
-- granted after the invited address is verified by Supabase Auth.

CREATE TABLE app.professional_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE RESTRICT,
  full_name text NOT NULL CHECK (char_length(btrim(full_name)) BETWEEN 1 AND 120),
  email text NOT NULL CHECK (email = lower(btrim(email)) AND char_length(email) <= 254),
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
  delivery_status text NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending','sent','failed','existing_account')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL DEFAULT (clock_timestamp() + interval '7 days'),
  accepted_at timestamptz,
  revoked_at timestamptz,
  accepted_user_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  CHECK ((status = 'accepted') = (accepted_at IS NOT NULL)),
  CHECK ((status = 'accepted') = (accepted_user_id IS NOT NULL))
);
ALTER TABLE app.professional_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app.professional_invitations FROM PUBLIC, anon, authenticated;
CREATE UNIQUE INDEX professional_invitations_one_pending_email
  ON app.professional_invitations (organization_id, email) WHERE status = 'pending';
CREATE INDEX professional_invitations_admin_list
  ON app.professional_invitations (organization_id, created_at DESC);

CREATE FUNCTION api.create_professional_invitation(p_organization_id uuid,p_full_name text,p_email text)
RETURNS TABLE(invitation_id uuid,organization_id uuid,full_name text,email text,status text,delivery_status text,created_at timestamptz,expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_org app.organizations%ROWTYPE; v_email text; v_inv app.professional_invitations%ROWTYPE;
  v_subscription app.organization_subscriptions%ROWTYPE; v_capacity integer; v_count integer;
BEGIN
  IF NOT security.is_current_platform_admin() THEN RAISE EXCEPTION 'Acceso no autorizado.'; END IF;
  IF p_organization_id IS NULL OR p_full_name IS NULL OR char_length(btrim(p_full_name)) NOT BETWEEN 1 AND 120
     OR p_email IS NULL OR char_length(btrim(p_email)) > 254 OR btrim(p_email) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  THEN RAISE EXCEPTION 'Ingresá nombre y un correo válido.'; END IF;
  v_email := lower(btrim(p_email));
  SELECT * INTO v_org FROM app.organizations WHERE id=p_organization_id FOR UPDATE;
  IF NOT FOUND OR v_org.status <> 'active' THEN RAISE EXCEPTION 'El consultorio no está disponible para nuevas invitaciones.'; END IF;
  IF EXISTS (SELECT 1 FROM app.user_platform_roles r JOIN auth.users u ON u.id=r.user_id WHERE r.role='platform_admin' AND lower(u.email)=v_email) THEN
    RAISE EXCEPTION 'No se puede asociar una cuenta Platform Admin como profesional.';
  END IF;
  IF EXISTS (SELECT 1 FROM app.organization_members m JOIN auth.users u ON u.id=m.user_id WHERE m.organization_id=p_organization_id AND lower(u.email)=v_email) THEN
    RAISE EXCEPTION 'Ese correo ya tiene una membresía en este consultorio.';
  END IF;
  UPDATE app.professional_invitations i SET status='expired'
   WHERE i.organization_id=p_organization_id AND i.email=v_email AND i.status='pending' AND i.expires_at<=clock_timestamp();
  SELECT * INTO v_inv FROM app.professional_invitations i
   WHERE i.organization_id=p_organization_id AND i.email=v_email AND i.status='pending' FOR UPDATE;
  IF FOUND THEN
    RETURN QUERY SELECT v_inv.id,v_inv.organization_id,v_inv.full_name,v_inv.email,v_inv.status,v_inv.delivery_status,v_inv.created_at,v_inv.expires_at;
    RETURN;
  END IF;
  v_subscription := security.current_subscription(p_organization_id);
  IF v_subscription.organization_id IS NULL OR v_subscription.status NOT IN ('trialing','active','grace') THEN
    RAISE EXCEPTION 'Configurá una suscripción vigente antes de sumar profesionales.';
  END IF;
  SELECT p.included_professionals + v_subscription.extra_professionals INTO v_capacity
   FROM app.plan_catalog_versions p WHERE p.plan_slug=v_subscription.plan_slug AND p.version=v_subscription.plan_version AND p.active;
  IF v_capacity IS NULL THEN RAISE EXCEPTION 'El plan vigente no tiene capacidad profesional disponible.'; END IF;
  SELECT count(*) INTO v_count FROM app.organization_members m
    WHERE m.organization_id=p_organization_id AND m.role IN ('organization_owner','nutritionist') AND m.status='active';
  v_count := v_count + (SELECT count(*) FROM app.professional_invitations i WHERE i.organization_id=p_organization_id AND i.status='pending' AND i.expires_at>clock_timestamp());
  IF v_count >= v_capacity THEN RAISE EXCEPTION 'El consultorio alcanzó el límite de profesionales de su plan.'; END IF;
  INSERT INTO app.professional_invitations(organization_id,full_name,email,invited_by)
    VALUES(p_organization_id,btrim(p_full_name),v_email,auth.uid()) RETURNING * INTO v_inv;
  INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details)
    VALUES(auth.uid(),p_organization_id,'CREATE_PROFESSIONAL_INVITATION','professional_invitation',v_inv.id,jsonb_build_object('status','pending'));
  RETURN QUERY SELECT v_inv.id,v_inv.organization_id,v_inv.full_name,v_inv.email,v_inv.status,v_inv.delivery_status,v_inv.created_at,v_inv.expires_at;
END; $$;

CREATE FUNCTION api.get_admin_professional_invitations(p_organization_id uuid)
RETURNS TABLE(invitation_id uuid,organization_id uuid,full_name text,email text,status text,delivery_status text,created_at timestamptz,expires_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT security.is_current_platform_admin() THEN RAISE EXCEPTION 'Acceso no autorizado.'; END IF;
  RETURN QUERY SELECT i.id,i.organization_id,i.full_name,i.email,
    CASE WHEN i.status='pending' AND i.expires_at<=clock_timestamp() THEN 'expired' ELSE i.status END,
    i.delivery_status,i.created_at,i.expires_at
    FROM app.professional_invitations i WHERE i.organization_id=p_organization_id ORDER BY i.created_at DESC;
END; $$;

CREATE FUNCTION api.cancel_admin_professional_invitation(p_invitation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_inv app.professional_invitations%ROWTYPE;
BEGIN
  IF NOT security.is_current_platform_admin() THEN RAISE EXCEPTION 'Acceso no autorizado.'; END IF;
  SELECT * INTO v_inv FROM app.professional_invitations WHERE id=p_invitation_id AND status='pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La invitación ya no está pendiente.'; END IF;
  UPDATE app.professional_invitations SET status='revoked',revoked_at=clock_timestamp() WHERE id=v_inv.id;
  INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details)
    VALUES(auth.uid(),v_inv.organization_id,'CANCEL_PROFESSIONAL_INVITATION','professional_invitation',v_inv.id,jsonb_build_object('status','revoked'));
END; $$;

CREATE FUNCTION api.set_professional_invitation_delivery(p_invitation_id uuid,p_delivery_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF auth.role()<>'service_role' OR p_delivery_status NOT IN ('sent','failed','existing_account') THEN RAISE EXCEPTION 'No autorizado.'; END IF;
  UPDATE app.professional_invitations SET delivery_status=p_delivery_status
   WHERE id=p_invitation_id AND status='pending' AND expires_at>clock_timestamp();
  IF NOT FOUND THEN RAISE EXCEPTION 'Invitación no disponible.'; END IF;
END; $$;

CREATE FUNCTION api.accept_professional_invitations()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user auth.users%ROWTYPE; v_inv app.professional_invitations%ROWTYPE; v_count integer:=0;
  v_subscription app.organization_subscriptions%ROWTYPE; v_capacity integer; v_reserved integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticación requerida.'; END IF;
  SELECT * INTO v_user FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL;
  IF NOT FOUND THEN RETURN 0; END IF;
  IF security.is_platform_account_suspended(auth.uid()) OR EXISTS(SELECT 1 FROM app.user_platform_roles WHERE user_id=auth.uid()) THEN RETURN 0; END IF;
  FOR v_inv IN SELECT * FROM app.professional_invitations
    WHERE email=lower(v_user.email) AND status='pending' AND expires_at>clock_timestamp()
    ORDER BY created_at FOR UPDATE
  LOOP
    PERFORM 1 FROM app.organizations WHERE id=v_inv.organization_id AND status='active' FOR UPDATE;
    IF NOT FOUND THEN CONTINUE; END IF;
    IF EXISTS(SELECT 1 FROM app.organizations WHERE id=v_inv.organization_id AND status='active')
      AND NOT EXISTS(SELECT 1 FROM app.organization_members WHERE organization_id=v_inv.organization_id AND user_id=auth.uid())
    THEN
      v_subscription := security.current_subscription(v_inv.organization_id);
      SELECT p.included_professionals + v_subscription.extra_professionals INTO v_capacity
        FROM app.plan_catalog_versions p WHERE p.plan_slug=v_subscription.plan_slug AND p.version=v_subscription.plan_version AND p.active
          AND v_subscription.status IN ('trialing','active','grace');
      SELECT count(*) INTO v_reserved FROM app.organization_members m
        WHERE m.organization_id=v_inv.organization_id AND m.role IN ('organization_owner','nutritionist') AND m.status='active';
      v_reserved := v_reserved + (SELECT count(*) FROM app.professional_invitations i WHERE i.organization_id=v_inv.organization_id AND i.status='pending' AND i.expires_at>clock_timestamp());
      -- The pending invitation itself occupies the seat. A downgraded plan may
      -- leave the invite waiting, but it must never create an over-capacity member.
      IF v_capacity IS NULL OR v_reserved > v_capacity THEN CONTINUE; END IF;
      INSERT INTO app.profiles(id,email,full_name)
        VALUES(auth.uid(),lower(v_user.email),v_inv.full_name)
        ON CONFLICT(id) DO UPDATE SET email=EXCLUDED.email,full_name=COALESCE(NULLIF(app.profiles.full_name,''),EXCLUDED.full_name);
      INSERT INTO app.organization_members(organization_id,user_id,role,status)
        VALUES(v_inv.organization_id,auth.uid(),'nutritionist','active');
      UPDATE app.professional_invitations SET status='accepted',accepted_at=clock_timestamp(),accepted_user_id=auth.uid()
        WHERE id=v_inv.id;
      INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details)
        VALUES(auth.uid(),v_inv.organization_id,'ACCEPT_PROFESSIONAL_INVITATION','professional_invitation',v_inv.id,jsonb_build_object('status','accepted'));
      v_count:=v_count+1;
    END IF;
  END LOOP;
  RETURN v_count;
END; $$;

REVOKE ALL ON FUNCTION api.create_professional_invitation(uuid,text,text),api.get_admin_professional_invitations(uuid),api.cancel_admin_professional_invitation(uuid),api.set_professional_invitation_delivery(uuid,text),api.accept_professional_invitations() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION api.create_professional_invitation(uuid,text,text),api.get_admin_professional_invitations(uuid),api.cancel_admin_professional_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION api.set_professional_invitation_delivery(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION api.accept_professional_invitations() TO authenticated;

-- Extend the existing allowlisted admin audit view without revealing invitee identity.
CREATE OR REPLACE FUNCTION api.get_admin_audit_events(
  p_from timestamptz,p_to timestamptz,p_event_type text DEFAULT NULL,p_query text DEFAULT NULL,p_limit integer DEFAULT 50,p_offset integer DEFAULT 0
)
RETURNS TABLE(event_id uuid,occurred_at timestamptz,event_type text,organization_id uuid,organization_name text,organization_slug text,previous_value text,new_value text,extra_professionals integer,total_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $$
BEGIN
  IF NOT security.is_current_platform_admin() THEN RAISE EXCEPTION 'Acceso no autorizado: requiere rol platform_admin'; END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_from>=p_to OR p_to-p_from>interval '366 days' THEN RAISE EXCEPTION 'El período de auditoría debe ser válido y no superar 366 días.'; END IF;
  IF p_event_type IS NOT NULL AND p_event_type NOT IN ('organization_created','organization_status_changed','subscription_changed','professional_membership_changed','professional_account_suspension_changed','professional_invitation_changed') THEN RAISE EXCEPTION 'Tipo de evento no válido.'; END IF;
  IF p_query IS NOT NULL AND char_length(trim(p_query))>100 THEN RAISE EXCEPTION 'La búsqueda supera el máximo permitido.'; END IF;
  IF p_limit IS NULL OR p_limit<1 OR p_limit>100 OR p_offset IS NULL OR p_offset<0 OR p_offset>100000 THEN RAISE EXCEPTION 'Paginación no válida.'; END IF;
  RETURN QUERY WITH events AS (
    SELECT l.id,l.created_at,
      CASE WHEN l.action IN ('CREATE_PROFESSIONAL_INVITATION','CANCEL_PROFESSIONAL_INVITATION','ACCEPT_PROFESSIONAL_INVITATION') THEN 'professional_invitation_changed'
        WHEN l.action='CREATE_ORGANIZATION' THEN 'organization_created' WHEN l.action='SET_ORGANIZATION_STATUS' THEN 'organization_status_changed'
        WHEN l.action='SET_PROFESSIONAL_MEMBERSHIP_STATUS' THEN 'professional_membership_changed' WHEN l.action='SET_PROFESSIONAL_ACCOUNT_SUSPENSION' THEN 'professional_account_suspension_changed' ELSE 'subscription_changed' END AS kind,
      l.organization_id,CASE WHEN l.action='SET_PROFESSIONAL_ACCOUNT_SUSPENSION' THEN 'Acceso global' ELSE coalesce(o.name,nullif(l.details->>'organization_name',''),'Consultorio eliminado') END AS org_name,
      coalesce(o.slug,nullif(l.details->>'organization_slug',''),nullif(l.details->>'slug','')) AS org_slug,
      CASE WHEN l.action='SET_ORGANIZATION_STATUS' THEN l.details->>'previous_status'
        WHEN l.action='SET_ORGANIZATION_SUBSCRIPTION' THEN concat_ws(' · ',upper(l.details->>'previous_plan_slug'),l.details->>'previous_status')
        WHEN l.action='SET_PROFESSIONAL_MEMBERSHIP_STATUS' THEN l.details->>'previous_status'
        WHEN l.action='SET_PROFESSIONAL_ACCOUNT_SUSPENSION' THEN CASE WHEN coalesce((l.details->>'previous_status')::boolean,false) THEN 'suspended' ELSE 'active' END ELSE NULL END AS old_value,
      CASE WHEN l.action='CREATE_ORGANIZATION' THEN 'created'
        WHEN l.action IN ('CREATE_PROFESSIONAL_INVITATION','ACCEPT_PROFESSIONAL_INVITATION','CANCEL_PROFESSIONAL_INVITATION') THEN l.details->>'status'
        WHEN l.action='SET_ORGANIZATION_STATUS' THEN l.details->>'status'
        WHEN l.action='SET_ORGANIZATION_SUBSCRIPTION' THEN concat_ws(' · ',upper(l.details->>'next_plan_slug'),l.details->>'next_status')
        WHEN l.action='SET_PROFESSIONAL_MEMBERSHIP_STATUS' THEN l.details->>'status'
        WHEN l.action='SET_PROFESSIONAL_ACCOUNT_SUSPENSION' THEN CASE WHEN (l.details->>'is_suspended')::boolean THEN 'suspended' ELSE 'active' END
        ELSE concat_ws(' · ',upper(coalesce(l.details->>'plan',l.details->>'next_plan_slug')),l.details->>'effective_on') END AS next_value,
      nullif(l.details->>'extra_professionals','')::integer AS extras
    FROM app.audit_logs l LEFT JOIN app.organizations o ON o.id=l.organization_id
    WHERE l.action IN ('CREATE_ORGANIZATION','SET_ORGANIZATION_STATUS','SET_ORGANIZATION_SUBSCRIPTION','SCHEDULE_ORGANIZATION_SUBSCRIPTION','CANCEL_SCHEDULED_SUBSCRIPTION','APPLY_SCHEDULED_SUBSCRIPTION','SET_PROFESSIONAL_MEMBERSHIP_STATUS','SET_PROFESSIONAL_ACCOUNT_SUSPENSION','CREATE_PROFESSIONAL_INVITATION','CANCEL_PROFESSIONAL_INVITATION','ACCEPT_PROFESSIONAL_INVITATION')
      AND l.created_at>=p_from AND l.created_at<p_to
  ), filtered AS (SELECT e.* FROM events e WHERE (p_event_type IS NULL OR e.kind=p_event_type)
    AND (nullif(trim(p_query),'') IS NULL OR position(lower(trim(p_query)) IN lower(coalesce(e.org_name,'')||' '||coalesce(e.org_slug,'')))>0)),
    paged AS (SELECT f.*,count(*) OVER() AS full_count FROM filtered f ORDER BY f.created_at DESC,f.id DESC LIMIT p_limit OFFSET p_offset)
  SELECT p.id,p.created_at,p.kind,p.organization_id,p.org_name,p.org_slug,p.old_value,p.next_value,p.extras,p.full_count FROM paged p;
END; $$;
REVOKE ALL ON FUNCTION api.get_admin_audit_events(timestamptz,timestamptz,text,text,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION api.get_admin_audit_events(timestamptz,timestamptz,text,text,integer,integer) TO authenticated;
