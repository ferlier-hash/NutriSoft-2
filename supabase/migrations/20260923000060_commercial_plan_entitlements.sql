-- Commercial plan catalog, organization subscriptions and professional audience.
-- Prices are intentionally nullable: billing is recorded later, not processed here.

CREATE TABLE app.plan_catalog (
  slug text PRIMARY KEY CHECK (slug IN ('pro','ultra','custom')),
  display_name text NOT NULL,
  parent_slug text NULL REFERENCES app.plan_catalog(slug),
  max_active_patients integer NULL CHECK (max_active_patients IS NULL OR max_active_patients > 0),
  included_professionals integer NOT NULL CHECK (included_professionals > 0),
  extra_professional_enabled boolean NOT NULL DEFAULT false,
  storage_limit_bytes bigint NULL CHECK (storage_limit_bytes IS NULL OR storage_limit_bytes > 0),
  custom_branding_enabled boolean NOT NULL DEFAULT false,
  price_monthly numeric(12,2) NULL CHECK (price_monthly IS NULL OR price_monthly >= 0),
  price_yearly numeric(12,2) NULL CHECK (price_yearly IS NULL OR price_yearly >= 0),
  currency text NULL CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TRIGGER trg_plan_catalog_updated_at BEFORE UPDATE ON app.plan_catalog
FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

INSERT INTO app.plan_catalog(slug,display_name,parent_slug,max_active_patients,included_professionals,extra_professional_enabled,storage_limit_bytes,custom_branding_enabled)
VALUES
  ('pro','PRO',NULL,50,1,true,1073741824,false),
  ('ultra','ULTRA','pro',NULL,10,false,2147483648,false),
  ('custom','CUSTOM','ultra',NULL,1,false,NULL,true)
ON CONFLICT(slug) DO UPDATE SET display_name=excluded.display_name,parent_slug=excluded.parent_slug,max_active_patients=excluded.max_active_patients,included_professionals=excluded.included_professionals,extra_professional_enabled=excluded.extra_professional_enabled,storage_limit_bytes=excluded.storage_limit_bytes,custom_branding_enabled=excluded.custom_branding_enabled;

CREATE TABLE app.organization_subscriptions (
  organization_id uuid PRIMARY KEY REFERENCES app.organizations(id) ON DELETE CASCADE,
  plan_slug text NOT NULL REFERENCES app.plan_catalog(slug),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('trialing','active','grace','suspended','cancelled')),
  extra_professionals integer NOT NULL DEFAULT 0 CHECK (extra_professionals >= 0),
  starts_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  current_period_end timestamptz NULL,
  grace_until timestamptz NULL,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT ck_subscription_grace CHECK (status <> 'grace' OR grace_until IS NOT NULL)
);

CREATE TRIGGER trg_organization_subscriptions_updated_at BEFORE UPDATE ON app.organization_subscriptions
FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE TABLE app.organization_subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  previous_plan_slug text NULL,
  next_plan_slug text NOT NULL REFERENCES app.plan_catalog(slug),
  previous_status text NULL,
  next_status text NOT NULL,
  extra_professionals integer NOT NULL DEFAULT 0,
  reason text NOT NULL CHECK (char_length(trim(reason)) BETWEEN 1 AND 200),
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE app.plan_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.organization_subscription_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app.plan_catalog,app.organization_subscriptions,app.organization_subscription_events FROM authenticated,anon;

CREATE OR REPLACE FUNCTION security.current_subscription(p_org uuid)
RETURNS app.organization_subscriptions
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$ SELECT s FROM app.organization_subscriptions s WHERE s.organization_id=p_org $$;

CREATE OR REPLACE FUNCTION security.organization_has_plan_feature(p_org uuid,p_feature text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app.organization_subscriptions s
    JOIN app.plan_catalog p ON p.slug=s.plan_slug
    WHERE s.organization_id=p_org AND s.status IN ('trialing','active','grace') AND p.active
      AND CASE p_feature
        WHEN 'custom_branding' THEN p.custom_branding_enabled
        WHEN 'extra_professional' THEN p.extra_professional_enabled
        ELSE false
      END
  )
$$;

CREATE OR REPLACE FUNCTION security.can_add_professional(p_org uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app.organization_subscriptions s
    JOIN app.plan_catalog p ON p.slug=s.plan_slug
    WHERE s.organization_id=p_org AND s.status IN ('trialing','active','grace') AND p.active
      AND (SELECT count(*) FROM app.organization_members m WHERE m.organization_id=p_org AND m.role IN ('organization_owner','nutritionist') AND m.status='active')
          < p.included_professionals + s.extra_professionals
  )
$$;

CREATE OR REPLACE FUNCTION api.get_plan_catalog()
RETURNS SETOF app.plan_catalog
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$ SELECT * FROM app.plan_catalog WHERE active ORDER BY CASE slug WHEN 'pro' THEN 1 WHEN 'ultra' THEN 2 ELSE 3 END $$;

CREATE OR REPLACE FUNCTION api.get_my_organization_subscription(p_org uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT security.has_current_org_role(p_org, ARRAY['organization_owner','nutritionist']) THEN RAISE EXCEPTION 'Suscripción no autorizada.'; END IF;
  SELECT jsonb_build_object('organizationId',s.organization_id,'plan',s.plan_slug,'status',s.status,'extraProfessionals',s.extra_professionals,'startsAt',s.starts_at,'currentPeriodEnd',s.current_period_end,'graceUntil',s.grace_until,'includedProfessionals',p.included_professionals,'maxActivePatients',p.max_active_patients,'storageLimitBytes',p.storage_limit_bytes,'customBrandingEnabled',p.custom_branding_enabled,'canAddProfessional',security.can_add_professional(p_org))
    INTO result FROM app.organization_subscriptions s JOIN app.plan_catalog p ON p.slug=s.plan_slug WHERE s.organization_id=p_org;
  RETURN coalesce(result,'{}'::jsonb);
END; $$;

CREATE OR REPLACE FUNCTION api.set_organization_subscription(p_org uuid,p_plan_slug text,p_status text DEFAULT 'active',p_extra_professionals integer DEFAULT 0,p_reason text DEFAULT 'commercial configuration')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE old app.organization_subscriptions;
BEGIN
  IF NOT security.is_current_platform_admin() THEN RAISE EXCEPTION 'Sólo Platform Admin puede configurar suscripciones.'; END IF;
  IF p_plan_slug NOT IN ('pro','ultra','custom') OR p_status NOT IN ('trialing','active','grace','suspended','cancelled') OR p_extra_professionals < 0 THEN RAISE EXCEPTION 'Configuración comercial inválida.'; END IF;
  SELECT * INTO old FROM app.organization_subscriptions WHERE organization_id=p_org FOR UPDATE;
  INSERT INTO app.organization_subscriptions(organization_id,plan_slug,status,extra_professionals)
  VALUES(p_org,p_plan_slug,p_status,CASE WHEN p_plan_slug='pro' THEN p_extra_professionals ELSE 0 END)
  ON CONFLICT(organization_id) DO UPDATE SET plan_slug=excluded.plan_slug,status=excluded.status,extra_professionals=excluded.extra_professionals,updated_at=clock_timestamp();
  INSERT INTO app.organization_subscription_events(organization_id,previous_plan_slug,next_plan_slug,previous_status,next_status,extra_professionals,reason,created_by)
  VALUES(p_org,old.plan_slug,p_plan_slug,old.status,p_status,CASE WHEN p_plan_slug='pro' THEN p_extra_professionals ELSE 0 END,left(trim(p_reason),200),auth.uid());
END; $$;

CREATE OR REPLACE FUNCTION api.get_professional_newsletter_contacts()
RETURNS TABLE(full_name text,email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
  SELECT DISTINCT ON (lower(trim(p.email))) trim(p.full_name), lower(trim(p.email))
  FROM app.profiles p
  JOIN app.organization_members m ON m.user_id=p.id AND m.status='active' AND m.role IN ('organization_owner','nutritionist')
  JOIN app.organizations o ON o.id=m.organization_id AND o.status='active'
  WHERE security.is_current_platform_admin() AND nullif(trim(p.email),'') IS NOT NULL
  ORDER BY lower(trim(p.email)), trim(p.full_name)
$$;

CREATE OR REPLACE FUNCTION api.get_admin_organization_subscriptions()
RETURNS TABLE(organization_id uuid,plan_slug text,status text,extra_professionals integer,included_professionals integer,max_active_patients integer,storage_limit_bytes bigint,custom_branding_enabled boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
  SELECT s.organization_id,s.plan_slug,s.status,s.extra_professionals,p.included_professionals,p.max_active_patients,p.storage_limit_bytes,p.custom_branding_enabled
  FROM app.organization_subscriptions s JOIN app.plan_catalog p ON p.slug=s.plan_slug
  WHERE security.is_current_platform_admin()
  ORDER BY s.organization_id
$$;

REVOKE ALL ON FUNCTION security.current_subscription(uuid),security.organization_has_plan_feature(uuid,text),security.can_add_professional(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION security.current_subscription(uuid),security.organization_has_plan_feature(uuid,text),security.can_add_professional(uuid) TO authenticated,service_role;
REVOKE ALL ON FUNCTION api.get_plan_catalog(),api.get_my_organization_subscription(uuid),api.set_organization_subscription(uuid,text,text,integer,text),api.get_professional_newsletter_contacts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.get_plan_catalog(),api.get_my_organization_subscription(uuid),api.set_organization_subscription(uuid,text,text,integer,text),api.get_professional_newsletter_contacts(),api.get_admin_organization_subscriptions() TO authenticated;

NOTIFY pgrst,'reload schema';
