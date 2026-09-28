-- Preserve already-purchased byte amounts if the catalog's unit size changes.
DROP FUNCTION IF EXISTS api.configure_organization_subscription(uuid,text,text,integer,integer,date);
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

CREATE OR REPLACE FUNCTION api.set_organization_subscription(p_org uuid,p_plan_slug text,p_status text DEFAULT 'active',p_extra_professionals integer DEFAULT 0,p_reason text DEFAULT 'commercial configuration')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
  IF NOT security.is_current_platform_admin() THEN RAISE EXCEPTION 'Sólo Platform Admin puede configurar suscripciones.'; END IF;
  PERFORM api.configure_organization_subscription(p_org,p_plan_slug,p_status,p_extra_professionals,0::bigint,CURRENT_DATE);
END; $$;

REVOKE ALL ON FUNCTION api.configure_organization_subscription(uuid,text,text,integer,bigint,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION api.configure_organization_subscription(uuid,text,text,integer,bigint,date) TO authenticated;
