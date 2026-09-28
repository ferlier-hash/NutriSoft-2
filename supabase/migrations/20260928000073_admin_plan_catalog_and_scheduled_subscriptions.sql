-- Version the plan catalog, assign technical add-ons, and schedule subscription changes.
-- All commercial money remains in the separate manual tariff/receipt flow.

CREATE TABLE app.plan_catalog_versions (
  plan_slug text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  max_active_patients integer NULL CHECK (max_active_patients IS NULL OR max_active_patients > 0),
  included_professionals integer NOT NULL CHECK (included_professionals > 0),
  extra_professional_enabled boolean NOT NULL,
  storage_limit_bytes bigint NULL CHECK (storage_limit_bytes IS NULL OR storage_limit_bytes > 0),
  custom_branding_enabled boolean NOT NULL,
  active boolean NOT NULL,
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (plan_slug, version),
  FOREIGN KEY (plan_slug) REFERENCES app.plan_catalog(slug)
);
ALTER TABLE app.plan_catalog_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app.plan_catalog_versions FROM PUBLIC, anon, authenticated;

INSERT INTO app.plan_catalog_versions(plan_slug,version,max_active_patients,included_professionals,extra_professional_enabled,storage_limit_bytes,custom_branding_enabled,active)
SELECT slug,1,max_active_patients,included_professionals,extra_professional_enabled,storage_limit_bytes,custom_branding_enabled,active
FROM app.plan_catalog
ON CONFLICT (plan_slug,version) DO NOTHING;

ALTER TABLE app.organization_subscriptions
  ADD COLUMN plan_version integer NOT NULL DEFAULT 1,
  ADD COLUMN library_extra_bytes_per_professional bigint NOT NULL DEFAULT 0
    CHECK (library_extra_bytes_per_professional BETWEEN 0 AND 10737418240),
  ADD CONSTRAINT fk_subscription_plan_version
    FOREIGN KEY (plan_slug,plan_version) REFERENCES app.plan_catalog_versions(plan_slug,version);
ALTER TABLE app.organization_subscriptions DROP CONSTRAINT IF EXISTS ck_subscription_grace;

ALTER TABLE app.organization_subscription_events
  ADD COLUMN event_kind text NOT NULL DEFAULT 'changed'
    CHECK (event_kind IN ('changed','scheduled','schedule_cancelled','schedule_applied')),
  ADD COLUMN effective_on date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN next_plan_version integer NOT NULL DEFAULT 1,
  ADD COLUMN library_extra_bytes_per_professional bigint NOT NULL DEFAULT 0
    CHECK (library_extra_bytes_per_professional BETWEEN 0 AND 10737418240);

CREATE TABLE app.commercial_addon_catalog (
  code text PRIMARY KEY CHECK (code IN ('extra_professional','extra_pdf_space')),
  display_name text NOT NULL,
  unit_kind text NOT NULL CHECK (unit_kind IN ('professional_seat','pdf_bytes_per_professional')),
  unit_bytes bigint NULL CHECK (unit_bytes IS NULL OR unit_bytes BETWEEN 1048576 AND 10737418240),
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK ((unit_kind='pdf_bytes_per_professional') = (unit_bytes IS NOT NULL))
);
ALTER TABLE app.commercial_addon_catalog ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app.commercial_addon_catalog FROM PUBLIC, anon, authenticated;
INSERT INTO app.commercial_addon_catalog(code,display_name,unit_kind,unit_bytes,active) VALUES
  ('extra_professional','Profesional adicional','professional_seat',NULL,true),
  ('extra_pdf_space','Espacio PDF adicional por profesional','pdf_bytes_per_professional',262144000,true)
ON CONFLICT(code) DO NOTHING;

CREATE TABLE app.organization_subscription_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  plan_slug text NOT NULL,
  plan_version integer NOT NULL,
  status text NOT NULL CHECK (status IN ('trialing','active','grace','suspended','cancelled')),
  extra_professionals integer NOT NULL DEFAULT 0 CHECK (extra_professionals >= 0),
  library_extra_bytes_per_professional bigint NOT NULL DEFAULT 0
    CHECK (library_extra_bytes_per_professional BETWEEN 0 AND 10737418240),
  effective_on date NOT NULL,
  schedule_state text NOT NULL DEFAULT 'scheduled' CHECK (schedule_state IN ('scheduled','applied','cancelled')),
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (plan_slug,plan_version) REFERENCES app.plan_catalog_versions(plan_slug,version)
);
CREATE UNIQUE INDEX ux_one_pending_subscription_schedule
  ON app.organization_subscription_schedules(organization_id) WHERE schedule_state='scheduled';
CREATE INDEX ix_subscription_schedules_due
  ON app.organization_subscription_schedules(effective_on,organization_id) WHERE schedule_state='scheduled';
ALTER TABLE app.organization_subscription_schedules ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app.organization_subscription_schedules FROM PUBLIC, anon, authenticated;
ALTER TABLE app.organization_subscription_events ADD COLUMN schedule_id uuid NULL
  REFERENCES app.organization_subscription_schedules(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION app.subscription_at(p_organization_id uuid,p_as_of date)
RETURNS app.organization_subscriptions
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_subscription app.organization_subscriptions; v_schedule app.organization_subscription_schedules;
BEGIN
  SELECT * INTO v_subscription FROM app.organization_subscriptions WHERE organization_id=p_organization_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO v_schedule FROM app.organization_subscription_schedules
   WHERE organization_id=p_organization_id AND schedule_state='scheduled'
     AND effective_on<=p_as_of
   ORDER BY effective_on DESC,created_at DESC LIMIT 1;
  IF FOUND AND v_schedule.effective_on>=v_subscription.starts_at::date THEN
    v_subscription.plan_slug:=v_schedule.plan_slug;
    v_subscription.plan_version:=v_schedule.plan_version;
    v_subscription.status:=v_schedule.status;
    v_subscription.extra_professionals:=v_schedule.extra_professionals;
    v_subscription.library_extra_bytes_per_professional:=v_schedule.library_extra_bytes_per_professional;
  END IF;
  RETURN v_subscription;
END; $$;

CREATE OR REPLACE FUNCTION security.current_subscription(p_org uuid)
RETURNS app.organization_subscriptions
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$ SELECT app.subscription_at(p_org,CURRENT_DATE) $$;

CREATE OR REPLACE FUNCTION security.organization_has_plan_feature(p_org uuid,p_feature text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app.plan_catalog_versions p
    CROSS JOIN LATERAL (SELECT security.current_subscription(p_org) AS s) current_sub
    WHERE p.plan_slug=(current_sub.s).plan_slug AND p.version=(current_sub.s).plan_version
      AND (current_sub.s).status IN ('trialing','active','grace') AND p.active
      AND CASE p_feature
        WHEN 'custom_branding' THEN p.custom_branding_enabled
        WHEN 'extra_professional' THEN p.extra_professional_enabled
        WHEN 'extra_pdf_space' THEN (current_sub.s).library_extra_bytes_per_professional>0
        ELSE false
      END
  )
$$;

CREATE OR REPLACE FUNCTION security.can_add_professional(p_org uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app.plan_catalog_versions p
    CROSS JOIN LATERAL (SELECT security.current_subscription(p_org) AS s) current_sub
    WHERE p.plan_slug=(current_sub.s).plan_slug AND p.version=(current_sub.s).plan_version
      AND (current_sub.s).status IN ('trialing','active','grace') AND p.active
      AND (SELECT count(*) FROM app.organization_members m
           WHERE m.organization_id=p_org AND m.role IN ('organization_owner','nutritionist') AND m.status='active')
          < p.included_professionals + (current_sub.s).extra_professionals
  )
$$;

CREATE OR REPLACE FUNCTION api.get_admin_plan_configuration()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $$
BEGIN
  IF NOT security.is_current_platform_admin() THEN RAISE EXCEPTION 'Sólo Platform Admin puede consultar la configuración comercial.'; END IF;
  RETURN jsonb_build_object(
    'plans',(SELECT coalesce(jsonb_agg(jsonb_build_object(
      'slug',p.slug,'displayName',p.display_name,'version',(SELECT max(v.version) FROM app.plan_catalog_versions v WHERE v.plan_slug=p.slug),
      'maxActivePatients',p.max_active_patients,'includedProfessionals',p.included_professionals,
      'extraProfessionalEnabled',p.extra_professional_enabled,'storageLimitBytes',p.storage_limit_bytes,
      'customBrandingEnabled',p.custom_branding_enabled,'active',p.active
    ) ORDER BY CASE p.slug WHEN 'pro' THEN 1 WHEN 'ultra' THEN 2 ELSE 3 END),'[]'::jsonb) FROM app.plan_catalog p),
    'addons',(SELECT coalesce(jsonb_agg(jsonb_build_object('code',code,'displayName',display_name,'unitKind',unit_kind,'unitBytes',unit_bytes,'active',active) ORDER BY code),'[]'::jsonb) FROM app.commercial_addon_catalog)
  );
END; $$;

CREATE OR REPLACE FUNCTION api.save_admin_plan_configuration(
  p_plan_slug text,p_max_active_patients integer,p_included_professionals integer,
  p_extra_professional_enabled boolean,p_storage_limit_bytes bigint,p_custom_branding_enabled boolean,p_active boolean
)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_old app.plan_catalog%ROWTYPE; v_version integer;
BEGIN
  IF NOT security.is_current_platform_admin() THEN RAISE EXCEPTION 'Sólo Platform Admin puede configurar planes.'; END IF;
  IF p_plan_slug NOT IN ('pro','ultra','custom') OR p_included_professionals NOT BETWEEN 1 AND 100
     OR (p_max_active_patients IS NOT NULL AND p_max_active_patients NOT BETWEEN 1 AND 100000)
     OR (p_storage_limit_bytes IS NOT NULL AND p_storage_limit_bytes NOT BETWEEN 10485760 AND 10995116277760)
     OR p_extra_professional_enabled IS NULL OR p_custom_branding_enabled IS NULL OR p_active IS NULL THEN
    RAISE EXCEPTION 'Los límites del plan no son válidos.';
  END IF;
  SELECT * INTO v_old FROM app.plan_catalog WHERE slug=p_plan_slug FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan no encontrado.'; END IF;
  IF NOT p_active AND (EXISTS(SELECT 1 FROM app.organization_subscriptions s WHERE s.plan_slug=p_plan_slug AND s.status IN ('trialing','active','grace'))
      OR EXISTS(SELECT 1 FROM app.organization_subscription_schedules s WHERE s.plan_slug=p_plan_slug AND s.schedule_state='scheduled')) THEN
    RAISE EXCEPTION 'No se puede desactivar un plan que todavía tiene consultorios activos.';
  END IF;
  SELECT coalesce(max(version),0)+1 INTO v_version FROM app.plan_catalog_versions WHERE plan_slug=p_plan_slug;
  INSERT INTO app.plan_catalog_versions(plan_slug,version,max_active_patients,included_professionals,extra_professional_enabled,storage_limit_bytes,custom_branding_enabled,active,created_by)
  VALUES(p_plan_slug,v_version,p_max_active_patients,p_included_professionals,p_extra_professional_enabled,p_storage_limit_bytes,p_custom_branding_enabled,p_active,auth.uid());
  UPDATE app.plan_catalog SET max_active_patients=p_max_active_patients,included_professionals=p_included_professionals,
    extra_professional_enabled=p_extra_professional_enabled,storage_limit_bytes=p_storage_limit_bytes,
    custom_branding_enabled=p_custom_branding_enabled,active=p_active,updated_at=clock_timestamp()
  WHERE slug=p_plan_slug;
  INSERT INTO app.audit_logs(actor_id,action,resource_type,resource_id,details)
  VALUES(auth.uid(),'UPDATE_PLAN_CONFIGURATION','plan',NULL,jsonb_build_object('plan_slug',p_plan_slug,'version',v_version,
    'max_active_patients',p_max_active_patients,'included_professionals',p_included_professionals,
    'extra_professional_enabled',p_extra_professional_enabled,'storage_limit_bytes',p_storage_limit_bytes,
    'custom_branding_enabled',p_custom_branding_enabled,'active',p_active));
  RETURN v_version;
END; $$;

CREATE OR REPLACE FUNCTION api.save_admin_addon_configuration(p_storage_unit_bytes bigint,p_storage_active boolean,p_professional_addon_active boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
  IF NOT security.is_current_platform_admin() THEN RAISE EXCEPTION 'Sólo Platform Admin puede configurar adicionales.'; END IF;
  IF p_storage_unit_bytes NOT BETWEEN 1048576 AND 10737418240 OR p_storage_active IS NULL OR p_professional_addon_active IS NULL THEN
    RAISE EXCEPTION 'La unidad de almacenamiento debe estar entre 1 MB y 10 GB.';
  END IF;
  UPDATE app.commercial_addon_catalog SET active=p_professional_addon_active,updated_at=clock_timestamp() WHERE code='extra_professional';
  UPDATE app.commercial_addon_catalog SET unit_bytes=p_storage_unit_bytes,active=p_storage_active,updated_at=clock_timestamp() WHERE code='extra_pdf_space';
  INSERT INTO app.audit_logs(actor_id,action,resource_type,resource_id,details)
  VALUES(auth.uid(),'UPDATE_ADDON_CONFIGURATION','commercial_addons',NULL,jsonb_build_object('addon_code','extra_pdf_space','storage_unit_bytes',p_storage_unit_bytes,'storage_active',p_storage_active,'professional_addon_active',p_professional_addon_active));
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION app.apply_due_organization_subscription_changes()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_schedule app.organization_subscription_schedules%ROWTYPE; v_old app.organization_subscriptions%ROWTYPE; v_count integer:=0;
BEGIN
  FOR v_schedule IN SELECT * FROM app.organization_subscription_schedules
    WHERE schedule_state='scheduled' AND effective_on<=CURRENT_DATE ORDER BY effective_on,created_at FOR UPDATE SKIP LOCKED
  LOOP
    SELECT * INTO v_old FROM app.organization_subscriptions WHERE organization_id=v_schedule.organization_id FOR UPDATE;
    IF NOT FOUND THEN CONTINUE; END IF;
    UPDATE app.organization_subscriptions SET plan_slug=v_schedule.plan_slug,plan_version=v_schedule.plan_version,status=v_schedule.status,
      extra_professionals=v_schedule.extra_professionals,library_extra_bytes_per_professional=v_schedule.library_extra_bytes_per_professional,
      updated_at=clock_timestamp() WHERE organization_id=v_schedule.organization_id;
    UPDATE app.organization_subscription_schedules SET schedule_state='applied',updated_at=clock_timestamp() WHERE id=v_schedule.id;
    INSERT INTO app.organization_subscription_events(organization_id,previous_plan_slug,next_plan_slug,previous_status,next_status,extra_professionals,reason,created_by,event_kind,effective_on,next_plan_version,library_extra_bytes_per_professional,schedule_id)
    VALUES(v_schedule.organization_id,v_old.plan_slug,v_schedule.plan_slug,v_old.status,v_schedule.status,v_schedule.extra_professionals,'Scheduled subscription change applied',v_schedule.created_by,'schedule_applied',v_schedule.effective_on,v_schedule.plan_version,v_schedule.library_extra_bytes_per_professional,v_schedule.id);
    INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details)
    VALUES(v_schedule.created_by,v_schedule.organization_id,'APPLY_SCHEDULED_SUBSCRIPTION','organization_subscription_schedule',v_schedule.id,
      jsonb_build_object('plan',v_schedule.plan_slug,'effective_on',v_schedule.effective_on,'extra_professionals',v_schedule.extra_professionals,'extra_pdf_bytes_per_professional',v_schedule.library_extra_bytes_per_professional));
    v_count:=v_count+1;
  END LOOP;
  RETURN v_count;
END; $$;

CREATE OR REPLACE FUNCTION api.configure_organization_subscription(
  p_organization_id uuid,p_plan_slug text,p_status text,p_extra_professionals integer,
  p_extra_pdf_bytes bigint,p_effective_on date
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_org app.organizations%ROWTYPE; v_current app.organization_subscriptions%ROWTYPE;
  v_plan_version integer; v_extra_bytes bigint; v_professional_addon_active boolean; v_storage_addon record;
  v_schedule_id uuid; v_event_id uuid;
BEGIN
  IF NOT security.is_current_platform_admin() THEN RAISE EXCEPTION 'Sólo Platform Admin puede configurar suscripciones.'; END IF;
  IF p_effective_on IS NULL OR p_plan_slug NOT IN ('pro','ultra','custom')
     OR p_status NOT IN ('trialing','active','grace','suspended','cancelled')
     OR p_extra_professionals NOT BETWEEN 0 AND 100 OR p_extra_pdf_bytes NOT BETWEEN 0 AND 10737418240 THEN
    RAISE EXCEPTION 'La configuración de suscripción no es válida.';
  END IF;
  PERFORM app.apply_due_organization_subscription_changes();
  SELECT * INTO v_org FROM app.organizations WHERE id=p_organization_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Consultorio no encontrado.'; END IF;
  SELECT * INTO v_current FROM app.organization_subscriptions WHERE organization_id=p_organization_id FOR UPDATE;
  SELECT coalesce(max(version),1) INTO v_plan_version FROM app.plan_catalog_versions WHERE plan_slug=p_plan_slug;
  IF NOT EXISTS(SELECT 1 FROM app.plan_catalog_versions WHERE plan_slug=p_plan_slug AND version=v_plan_version AND active) THEN
    RAISE EXCEPTION 'El plan elegido no está disponible para nuevas suscripciones.';
  END IF;
  SELECT active INTO v_professional_addon_active FROM app.commercial_addon_catalog WHERE code='extra_professional';
  SELECT * INTO v_storage_addon FROM app.commercial_addon_catalog WHERE code='extra_pdf_space';
  IF p_extra_professionals>0 AND (p_plan_slug<>'pro'
     OR (p_extra_professionals>coalesce(v_current.extra_professionals,0) AND coalesce(v_professional_addon_active,false)=false)
     OR NOT (SELECT extra_professional_enabled FROM app.plan_catalog_versions WHERE plan_slug=p_plan_slug AND version=v_plan_version)) THEN
    RAISE EXCEPTION 'El adicional de profesionales no está disponible para este plan.';
  END IF;
  v_extra_bytes:=p_extra_pdf_bytes;
  IF v_extra_bytes>coalesce(v_current.library_extra_bytes_per_professional,0) AND coalesce(v_storage_addon.active,false)=false THEN RAISE EXCEPTION 'El adicional de espacio PDF no está disponible.'; END IF;
  IF v_extra_bytes IS DISTINCT FROM coalesce(v_current.library_extra_bytes_per_professional,0)
     AND v_extra_bytes>0 AND mod(v_extra_bytes,v_storage_addon.unit_bytes)<>0 THEN
    RAISE EXCEPTION 'El nuevo adicional debe ser múltiplo de la unidad vigente (% bytes).',v_storage_addon.unit_bytes;
  END IF;
  IF v_current.organization_id IS NULL THEN
    IF p_effective_on>CURRENT_DATE THEN RAISE EXCEPTION 'Primero configurá la suscripción inicial con vigencia actual; luego podrás programar cambios futuros.'; END IF;
    INSERT INTO app.organization_subscriptions(organization_id,plan_slug,plan_version,status,extra_professionals,library_extra_bytes_per_professional,starts_at)
    VALUES(p_organization_id,p_plan_slug,v_plan_version,p_status,p_extra_professionals,v_extra_bytes,p_effective_on::timestamptz);
    INSERT INTO app.organization_subscription_events(organization_id,previous_plan_slug,next_plan_slug,previous_status,next_status,extra_professionals,reason,created_by,event_kind,effective_on,next_plan_version,library_extra_bytes_per_professional)
    VALUES(p_organization_id,NULL,p_plan_slug,NULL,p_status,p_extra_professionals,'Initial subscription configuration',auth.uid(),'changed',p_effective_on,v_plan_version,v_extra_bytes) RETURNING id INTO v_event_id;
    INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details)
    VALUES(auth.uid(),p_organization_id,'SET_ORGANIZATION_SUBSCRIPTION','organization_subscription_event',v_event_id,
      jsonb_build_object('next_plan_slug',p_plan_slug,'next_status',p_status,'extra_professionals',p_extra_professionals,'extra_pdf_bytes_per_professional',v_extra_bytes,'effective_on',p_effective_on,'organization_name',v_org.name,'organization_slug',v_org.slug));
    RETURN v_event_id;
  END IF;
  IF EXISTS(SELECT 1 FROM app.professional_library_settings s JOIN app.organization_members m
      ON m.organization_id=s.organization_id AND m.user_id=s.owner_user_id AND m.role='nutritionist' AND m.status='active'
      WHERE s.organization_id=p_organization_id AND s.storage_limit_bytes+v_extra_bytes>10737418240) THEN
    RAISE EXCEPTION 'El adicional superaría el máximo técnico de 10 GB para algún profesional activo.';
  END IF;
  IF p_effective_on>CURRENT_DATE THEN
    IF EXISTS(SELECT 1 FROM app.organization_subscription_schedules WHERE organization_id=p_organization_id AND schedule_state='scheduled') THEN
      RAISE EXCEPTION 'Ya existe un cambio futuro programado. Cancelalo antes de crear otro.';
    END IF;
    INSERT INTO app.organization_subscription_schedules(organization_id,plan_slug,plan_version,status,extra_professionals,library_extra_bytes_per_professional,effective_on,created_by)
    VALUES(p_organization_id,p_plan_slug,v_plan_version,p_status,p_extra_professionals,v_extra_bytes,p_effective_on,auth.uid()) RETURNING id INTO v_schedule_id;
    INSERT INTO app.organization_subscription_events(organization_id,previous_plan_slug,next_plan_slug,previous_status,next_status,extra_professionals,reason,created_by,event_kind,effective_on,next_plan_version,library_extra_bytes_per_professional,schedule_id)
    VALUES(p_organization_id,v_current.plan_slug,p_plan_slug,v_current.status,p_status,p_extra_professionals,'Subscription change scheduled',auth.uid(),'scheduled',p_effective_on,v_plan_version,v_extra_bytes,v_schedule_id);
    INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details)
    VALUES(auth.uid(),p_organization_id,'SCHEDULE_ORGANIZATION_SUBSCRIPTION','organization_subscription_schedule',v_schedule_id,
      jsonb_build_object('plan',p_plan_slug,'effective_on',p_effective_on,'extra_professionals',p_extra_professionals,'extra_pdf_bytes_per_professional',v_extra_bytes,'organization_name',v_org.name,'organization_slug',v_org.slug));
    RETURN v_schedule_id;
  END IF;
  IF EXISTS(SELECT 1 FROM app.organization_subscription_schedules WHERE organization_id=p_organization_id AND schedule_state='scheduled') THEN
    RAISE EXCEPTION 'Cancelá el cambio futuro programado antes de aplicar uno inmediato.';
  END IF;
  IF v_current.plan_slug=p_plan_slug AND v_current.plan_version=v_plan_version AND v_current.status=p_status
     AND v_current.extra_professionals=p_extra_professionals AND v_current.library_extra_bytes_per_professional=v_extra_bytes THEN RETURN NULL; END IF;
  UPDATE app.organization_subscriptions SET plan_slug=p_plan_slug,plan_version=v_plan_version,status=p_status,
    extra_professionals=p_extra_professionals,library_extra_bytes_per_professional=v_extra_bytes,updated_at=clock_timestamp()
    WHERE organization_id=p_organization_id;
  INSERT INTO app.organization_subscription_events(organization_id,previous_plan_slug,next_plan_slug,previous_status,next_status,extra_professionals,reason,created_by,event_kind,effective_on,next_plan_version,library_extra_bytes_per_professional)
  VALUES(p_organization_id,v_current.plan_slug,p_plan_slug,v_current.status,p_status,p_extra_professionals,'Subscription changed',auth.uid(),'changed',p_effective_on,v_plan_version,v_extra_bytes) RETURNING id INTO v_event_id;
  INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details)
  VALUES(auth.uid(),p_organization_id,'SET_ORGANIZATION_SUBSCRIPTION','organization_subscription_event',v_event_id,
    jsonb_build_object('previous_plan_slug',v_current.plan_slug,'next_plan_slug',p_plan_slug,'previous_status',v_current.status,'next_status',p_status,
      'extra_professionals',p_extra_professionals,'extra_pdf_bytes_per_professional',v_extra_bytes,'effective_on',p_effective_on,'organization_name',v_org.name,'organization_slug',v_org.slug));
  RETURN v_event_id;
END; $$;

CREATE OR REPLACE FUNCTION api.cancel_organization_subscription_schedule(p_schedule_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_schedule app.organization_subscription_schedules%ROWTYPE; v_current app.organization_subscriptions%ROWTYPE; v_event_id uuid;
BEGIN
  IF NOT security.is_current_platform_admin() THEN RAISE EXCEPTION 'Sólo Platform Admin puede cancelar cambios programados.'; END IF;
  SELECT * INTO v_schedule FROM app.organization_subscription_schedules WHERE id=p_schedule_id FOR UPDATE;
  IF NOT FOUND OR v_schedule.schedule_state<>'scheduled' OR v_schedule.effective_on<=CURRENT_DATE THEN RAISE EXCEPTION 'El cambio ya no se puede cancelar.'; END IF;
  SELECT * INTO v_current FROM app.organization_subscriptions WHERE organization_id=v_schedule.organization_id FOR UPDATE;
  UPDATE app.organization_subscription_schedules SET schedule_state='cancelled',updated_at=clock_timestamp() WHERE id=p_schedule_id;
  INSERT INTO app.organization_subscription_events(organization_id,previous_plan_slug,next_plan_slug,previous_status,next_status,extra_professionals,reason,created_by,event_kind,effective_on,next_plan_version,library_extra_bytes_per_professional)
  VALUES(v_schedule.organization_id,v_current.plan_slug,v_schedule.plan_slug,v_current.status,v_schedule.status,v_schedule.extra_professionals,'Scheduled subscription change cancelled',auth.uid(),'schedule_cancelled',v_schedule.effective_on,v_schedule.plan_version,v_schedule.library_extra_bytes_per_professional) RETURNING id INTO v_event_id;
  INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details)
  VALUES(auth.uid(),v_schedule.organization_id,'CANCEL_SCHEDULED_SUBSCRIPTION','organization_subscription_schedule',p_schedule_id,
    jsonb_build_object('plan',v_schedule.plan_slug,'effective_on',v_schedule.effective_on,'organization_name',(SELECT name FROM app.organizations WHERE id=v_schedule.organization_id),'organization_slug',(SELECT slug FROM app.organizations WHERE id=v_schedule.organization_id)));
  RETURN true;
END; $$;

DROP FUNCTION api.get_admin_organization_subscriptions();
CREATE FUNCTION api.get_admin_organization_subscriptions()
RETURNS TABLE(organization_id uuid,plan_slug text,status text,extra_professionals integer,included_professionals integer,
  max_active_patients integer,storage_limit_bytes bigint,custom_branding_enabled boolean,plan_version integer,
  library_extra_bytes_per_professional bigint,scheduled_change_id uuid,scheduled_plan_slug text,scheduled_effective_on date,
  scheduled_extra_professionals integer,scheduled_library_extra_bytes_per_professional bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $$
BEGIN
  IF NOT security.is_current_platform_admin() THEN RAISE EXCEPTION 'Acceso no autorizado: requiere rol platform_admin'; END IF;
  RETURN QUERY
  SELECT s.organization_id,s.plan_slug,s.status,s.extra_professionals,p.included_professionals,p.max_active_patients,
    p.storage_limit_bytes,p.custom_branding_enabled,s.plan_version,s.library_extra_bytes_per_professional,
    pending.id,pending.plan_slug,pending.effective_on,pending.extra_professionals,pending.library_extra_bytes_per_professional
  FROM app.organization_subscriptions base
  CROSS JOIN LATERAL app.subscription_at(base.organization_id,CURRENT_DATE) s
  JOIN app.plan_catalog_versions p ON p.plan_slug=s.plan_slug AND p.version=s.plan_version
  LEFT JOIN LATERAL (SELECT * FROM app.organization_subscription_schedules x WHERE x.organization_id=s.organization_id AND x.schedule_state='scheduled' AND x.effective_on>CURRENT_DATE ORDER BY x.effective_on LIMIT 1) pending ON true
  ORDER BY s.organization_id;
END; $$;

CREATE OR REPLACE FUNCTION api.get_admin_organization_subscription_history(p_organization_id uuid)
RETURNS TABLE(event_id uuid,occurred_at timestamptz,effective_on date,event_kind text,previous_plan_slug text,next_plan_slug text,
  previous_status text,next_status text,extra_professionals integer,library_extra_bytes_per_professional bigint,entry_state text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $$
BEGIN
  IF NOT security.is_current_platform_admin() THEN RAISE EXCEPTION 'Acceso no autorizado: requiere rol platform_admin'; END IF;
  RETURN QUERY
  SELECT e.id,e.created_at,e.effective_on,e.event_kind,e.previous_plan_slug,e.next_plan_slug,e.previous_status,e.next_status,
    e.extra_professionals,e.library_extra_bytes_per_professional,
    CASE WHEN e.event_kind='scheduled' THEN coalesce(s.schedule_state,'scheduled') ELSE e.event_kind END
  FROM app.organization_subscription_events e
  LEFT JOIN app.organization_subscription_schedules s ON s.id=e.schedule_id
  WHERE e.organization_id=p_organization_id
  ORDER BY e.created_at DESC,e.id DESC LIMIT 100;
END; $$;

CREATE OR REPLACE FUNCTION api.get_my_organization_subscription(p_org uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_sub app.organization_subscriptions; v_plan app.plan_catalog_versions%ROWTYPE; v_result jsonb;
BEGIN
  IF NOT security.has_current_org_role(p_org,ARRAY['organization_owner','nutritionist']) THEN RAISE EXCEPTION 'Suscripción no autorizada.'; END IF;
  v_sub:=security.current_subscription(p_org);
  IF v_sub.organization_id IS NULL THEN RETURN '{}'::jsonb; END IF;
  SELECT * INTO v_plan FROM app.plan_catalog_versions WHERE plan_slug=v_sub.plan_slug AND version=v_sub.plan_version;
  SELECT jsonb_build_object('organizationId',v_sub.organization_id,'plan',v_sub.plan_slug,'status',v_sub.status,
    'extraProfessionals',v_sub.extra_professionals,'startsAt',v_sub.starts_at,'currentPeriodEnd',v_sub.current_period_end,
    'graceUntil',v_sub.grace_until,'includedProfessionals',v_plan.included_professionals,
    'maxActivePatients',v_plan.max_active_patients,'storageLimitBytes',v_plan.storage_limit_bytes,
    'libraryExtraBytesPerProfessional',v_sub.library_extra_bytes_per_professional,
    'customBrandingEnabled',v_plan.custom_branding_enabled,'canAddProfessional',security.can_add_professional(p_org)) INTO v_result;
  RETURN coalesce(v_result,'{}'::jsonb);
END; $$;

CREATE OR REPLACE FUNCTION api.get_my_library_settings(p_organization_id uuid)
RETURNS TABLE(policy_version text,accepted boolean,accepted_at timestamptz,used_bytes bigint,limit_bytes bigint,available_bytes bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_limit bigint; v_used bigint; v_version text; v_accepted_at timestamptz; v_extra bigint;
BEGIN
  IF security.is_current_platform_admin() OR NOT security.has_current_org_role(p_organization_id,ARRAY['nutritionist']) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
  SELECT s.policy_version,s.accepted_at,s.storage_limit_bytes INTO v_version,v_accepted_at,v_limit
  FROM app.professional_library_settings s WHERE s.organization_id=p_organization_id AND s.owner_user_id=auth.uid();
  SELECT library_extra_bytes_per_professional INTO v_extra FROM security.current_subscription(p_organization_id);
  v_limit:=least(coalesce(v_limit,262144000)+coalesce(v_extra,0),10737418240);
  SELECT coalesce(sum(CASE WHEN o.metadata->>'size' ~ '^[0-9]+$' THEN (o.metadata->>'size')::bigint ELSE 0 END),0)::bigint INTO v_used
  FROM storage.objects o WHERE o.bucket_id='educational-documents' AND split_part(o.name,'/',1)=auth.uid()::text AND split_part(o.name,'/',2)=p_organization_id::text;
  RETURN QUERY SELECT coalesce(v_version,'2026-09-13-v1'),(v_version='2026-09-13-v1' AND v_accepted_at IS NOT NULL),v_accepted_at,v_used,v_limit,greatest(v_limit-v_used,0::bigint);
END; $$;

CREATE OR REPLACE FUNCTION security.can_upload_educational_document(p_name text,p_size bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
 SELECT p_size>0 AND split_part(p_name,'/',1)=auth.uid()::text AND EXISTS (
   SELECT 1 FROM app.organization_members m JOIN app.professional_library_settings s
     ON s.organization_id=m.organization_id AND s.owner_user_id=m.user_id
   CROSS JOIN LATERAL security.current_subscription(m.organization_id) sub
   WHERE m.organization_id::text=split_part(p_name,'/',2) AND m.user_id=auth.uid() AND m.role='nutritionist' AND m.status='active'
     AND s.policy_version='2026-09-13-v1' AND s.accepted_at IS NOT NULL AND security.has_current_org_role(m.organization_id,ARRAY['nutritionist'])
     AND p_size+coalesce((SELECT sum(CASE WHEN o.metadata->>'size' ~ '^[0-9]+$' THEN (o.metadata->>'size')::bigint ELSE 0 END)
       FROM storage.objects o WHERE o.bucket_id='educational-documents' AND split_part(o.name,'/',1)=auth.uid()::text AND split_part(o.name,'/',2)=m.organization_id::text),0)
       <= least(s.storage_limit_bytes+coalesce((sub).library_extra_bytes_per_professional,0),10737418240)
 );
$$;

CREATE OR REPLACE FUNCTION api.reserve_secure_upload(p_organization_id uuid,p_kind text,p_filename text,p_mime text,p_size bigint)
RETURNS TABLE(upload_id uuid,bucket_id text,object_path text,status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_id uuid:=gen_random_uuid(); v_ext text; v_reserved bigint; v_limit bigint; v_subscription app.organization_subscriptions;
BEGIN
 IF security.is_current_platform_admin() THEN RAISE EXCEPTION 'No autorizado.'; END IF;
 IF p_kind NOT IN ('library_pdf','branding_logo','branding_patient_header','branding_professional_header') THEN RAISE EXCEPTION 'Tipo de archivo no válido.'; END IF;
 IF p_filename IS NULL OR length(trim(p_filename)) NOT BETWEEN 1 AND 240 OR p_filename ~ '[[:cntrl:]]' THEN RAISE EXCEPTION 'Nombre de archivo no válido.'; END IF;
 IF p_kind='library_pdf' THEN
  IF p_mime<>'application/pdf' OR p_size NOT BETWEEN 1 AND 10485760 THEN RAISE EXCEPTION 'Seleccioná un PDF de hasta 10 MB.'; END IF;
  IF NOT security.has_current_org_role(p_organization_id,ARRAY['nutritionist']) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text),hashtext(p_organization_id::text));
  SELECT storage_limit_bytes INTO v_limit FROM app.professional_library_settings WHERE organization_id=p_organization_id AND owner_user_id=auth.uid() AND policy_version='2026-09-13-v1' AND accepted_at IS NOT NULL;
  IF v_limit IS NULL THEN RAISE EXCEPTION 'Aceptá la declaración de responsabilidad antes de subir recursos.'; END IF;
  v_subscription:=security.current_subscription(p_organization_id);
  v_limit:=least(v_limit+coalesce(v_subscription.library_extra_bytes_per_professional,0),10737418240);
  SELECT coalesce(sum(f.declared_size),0) INTO v_reserved FROM app.file_uploads f WHERE f.organization_id=p_organization_id AND f.owner_user_id=auth.uid() AND f.kind='library_pdf' AND f.status IN('reserved','uploaded','scanning') AND f.expires_at>clock_timestamp();
  IF p_size+v_reserved+coalesce((SELECT sum(CASE WHEN o.metadata->>'size' ~ '^[0-9]+$' THEN (o.metadata->>'size')::bigint ELSE 0 END) FROM storage.objects o WHERE o.bucket_id='educational-documents' AND split_part(o.name,'/',1)=auth.uid()::text AND split_part(o.name,'/',2)=p_organization_id::text),0)>v_limit THEN RAISE EXCEPTION 'No queda espacio suficiente para este PDF.'; END IF;
  v_ext:='pdf';
 ELSE
  IF NOT security.brand_editor(p_organization_id) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
  IF p_mime NOT IN('image/jpeg','image/png','image/webp') OR p_size NOT BETWEEN 1 AND 2097152 THEN RAISE EXCEPTION 'Usá JPG, PNG o WebP de hasta 2 MB.'; END IF;
  v_ext:=CASE p_mime WHEN 'image/jpeg' THEN 'jpg' WHEN 'image/png' THEN 'png' ELSE 'webp' END;
 END IF;
 INSERT INTO app.file_uploads(id,organization_id,owner_user_id,kind,original_filename,declared_mime,declared_size,quarantine_path)
 VALUES(v_id,p_organization_id,auth.uid(),p_kind::app.file_asset_kind,trim(p_filename),p_mime,p_size,auth.uid()::text||'/'||p_organization_id::text||'/'||v_id::text||'/source.'||v_ext);
 INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details) VALUES(auth.uid(),p_organization_id,'RESERVE_FILE_UPLOAD','file_upload',v_id,jsonb_build_object('kind',p_kind,'size',p_size));
 RETURN QUERY SELECT v_id,'upload-quarantine'::text,(auth.uid()::text||'/'||p_organization_id::text||'/'||v_id::text||'/source.'||v_ext),'reserved'::text;
END; $$;

-- Replace the legacy RPC with a backward-compatible immediate wrapper.
CREATE OR REPLACE FUNCTION api.set_organization_subscription(p_org uuid,p_plan_slug text,p_status text DEFAULT 'active',p_extra_professionals integer DEFAULT 0,p_reason text DEFAULT 'commercial configuration')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_storage_bytes bigint:=0;
BEGIN
  IF NOT security.is_current_platform_admin() THEN RAISE EXCEPTION 'Sólo Platform Admin puede configurar suscripciones.'; END IF;
  PERFORM api.configure_organization_subscription(p_org,p_plan_slug,p_status,p_extra_professionals,v_storage_bytes,CURRENT_DATE);
END; $$;

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
  RETURN QUERY
  WITH events AS (
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
      nullif(l.details->>'extra_professionals','')::integer AS extra_professionals
    FROM app.audit_logs l LEFT JOIN app.organizations o ON o.id=l.organization_id
    WHERE l.action IN ('CREATE_ORGANIZATION','SET_ORGANIZATION_STATUS','SET_ORGANIZATION_SUBSCRIPTION','SCHEDULE_ORGANIZATION_SUBSCRIPTION','CANCEL_SCHEDULED_SUBSCRIPTION','APPLY_SCHEDULED_SUBSCRIPTION','SET_PROFESSIONAL_MEMBERSHIP_STATUS','SET_PROFESSIONAL_ACCOUNT_SUSPENSION')
      AND l.created_at>=p_from AND l.created_at<p_to
  ), filtered AS (
    SELECT e.* FROM events e WHERE (p_event_type IS NULL OR e.kind=p_event_type)
      AND (nullif(trim(p_query),'') IS NULL OR position(lower(trim(p_query)) IN lower(coalesce(e.org_name,'')||' '||coalesce(e.org_slug,'')))>0)
  ), paged AS (SELECT f.*,count(*) OVER() AS full_count FROM filtered f ORDER BY f.created_at DESC,f.id DESC LIMIT p_limit OFFSET p_offset)
  SELECT p.id,p.created_at,p.kind,p.organization_id,p.org_name,p.org_slug,p.old_value,p.next_value,p.extra_professionals,p.full_count FROM paged p;
END; $$;

CREATE OR REPLACE FUNCTION api.get_admin_library_quota_report()
RETURNS TABLE(organization_id uuid,upload_enabled_professionals bigint,effective_library_quota_bytes bigint,professionals_near_library_quota bigint,professionals_over_library_quota bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $$
BEGIN
  IF NOT security.is_current_platform_admin() THEN RAISE EXCEPTION 'Acceso no autorizado: requiere rol platform_admin'; END IF;
  RETURN QUERY
  WITH eligible AS (
    SELECT m.organization_id,m.user_id,least(s.storage_limit_bytes+coalesce((sub).library_extra_bytes_per_professional,0),10737418240) AS effective_limit
    FROM app.organization_members m JOIN app.professional_library_settings s ON s.organization_id=m.organization_id AND s.owner_user_id=m.user_id
    CROSS JOIN LATERAL security.current_subscription(m.organization_id) sub
    WHERE m.role='nutritionist' AND m.status='active' AND s.policy_version='2026-09-13-v1' AND s.accepted_at IS NOT NULL
  ), individual_usage AS (
    SELECT split_part(o.name,'/',2)::uuid AS organization_id,split_part(o.name,'/',1)::uuid AS owner_user_id,
      sum(CASE WHEN o.metadata->>'size' ~ '^[0-9]+$' THEN (o.metadata->>'size')::bigint ELSE 0 END)::bigint AS used_bytes
    FROM storage.objects o WHERE o.bucket_id='educational-documents'
      AND split_part(o.name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND split_part(o.name,'/',2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    GROUP BY split_part(o.name,'/',2)::uuid,split_part(o.name,'/',1)::uuid
  )
  SELECT e.organization_id,count(*)::bigint,sum(e.effective_limit)::bigint,
    count(*) FILTER(WHERE coalesce(u.used_bytes,0)>=e.effective_limit*0.8)::bigint,
    count(*) FILTER(WHERE coalesce(u.used_bytes,0)>e.effective_limit)::bigint
  FROM eligible e LEFT JOIN individual_usage u ON u.organization_id=e.organization_id AND u.owner_user_id=e.user_id
  GROUP BY e.organization_id ORDER BY e.organization_id;
END; $$;

REVOKE ALL ON FUNCTION app.subscription_at(uuid,date),app.apply_due_organization_subscription_changes() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION app.subscription_at(uuid,date) TO service_role;
REVOKE ALL ON FUNCTION api.get_admin_plan_configuration(),api.save_admin_plan_configuration(text,integer,integer,boolean,bigint,boolean,boolean),api.save_admin_addon_configuration(bigint,boolean,boolean),api.configure_organization_subscription(uuid,text,text,integer,bigint,date),api.cancel_organization_subscription_schedule(uuid),api.get_admin_organization_subscription_history(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION api.get_admin_plan_configuration(),api.save_admin_plan_configuration(text,integer,integer,boolean,bigint,boolean,boolean),api.save_admin_addon_configuration(bigint,boolean,boolean),api.configure_organization_subscription(uuid,text,text,integer,bigint,date),api.cancel_organization_subscription_schedule(uuid),api.get_admin_organization_subscription_history(uuid),api.get_admin_organization_subscriptions() TO authenticated;
REVOKE ALL ON FUNCTION security.current_subscription(uuid),security.organization_has_plan_feature(uuid,text),security.can_add_professional(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION security.current_subscription(uuid),security.organization_has_plan_feature(uuid,text),security.can_add_professional(uuid) TO authenticated,service_role;

DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM cron.job WHERE jobname='apply-due-subscription-changes') THEN PERFORM cron.unschedule('apply-due-subscription-changes'); END IF;
  PERFORM cron.schedule('apply-due-subscription-changes','*/15 * * * *','SELECT app.apply_due_organization_subscription_changes()');
END; $$;

NOTIFY pgrst,'reload schema';
