-- Audit resource_id is UUID-only; global plan/add-on events therefore identify
-- their target in the allowlisted details payload instead of storing text IDs.
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
