-- Commercial capability only: no billing or clinical permissions are granted.
CREATE TABLE app.custom_branding_entitlements (
 organization_id uuid PRIMARY KEY REFERENCES app.organizations(id),
 enabled boolean NOT NULL DEFAULT false
);
CREATE TABLE app.organization_branding (
 organization_id uuid PRIMARY KEY REFERENCES app.organizations(id),
 settings jsonb NOT NULL DEFAULT '{}',
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE app.custom_branding_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.organization_branding ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app.custom_branding_entitlements,app.organization_branding FROM authenticated,anon;

CREATE FUNCTION security.brand_reader(p_org uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT NOT security.is_current_platform_admin() AND EXISTS(SELECT 1 FROM app.organizations o WHERE o.id=p_org AND o.status='active') AND (
 EXISTS(SELECT 1 FROM app.organization_members m WHERE m.organization_id=p_org AND m.user_id=auth.uid() AND m.status='active') OR
 EXISTS(SELECT 1 FROM app.patient_portal_access a WHERE a.organization_id=p_org AND a.user_id=auth.uid() AND a.status='active'));
$$;
CREATE FUNCTION security.brand_editor(p_org uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT security.brand_reader(p_org) AND security.has_current_org_role(p_org,ARRAY['organization_owner']) AND EXISTS(SELECT 1 FROM app.custom_branding_entitlements e WHERE e.organization_id=p_org AND e.enabled);
$$;
REVOKE ALL ON FUNCTION security.brand_reader(uuid),security.brand_editor(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION security.brand_reader(uuid),security.brand_editor(uuid) TO authenticated;

CREATE FUNCTION api.get_my_branding() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('organization_id',o.id,'name',o.name,'enabled',coalesce(e.enabled,false),'can_edit',security.brand_editor(o.id),'settings',CASE WHEN e.enabled THEN coalesce(b.settings,'{}') ELSE '{}'::jsonb END,'updated_at',b.updated_at) ORDER BY o.name),'[]'::jsonb)
 FROM app.organizations o LEFT JOIN app.custom_branding_entitlements e ON e.organization_id=o.id LEFT JOIN app.organization_branding b ON b.organization_id=o.id WHERE security.brand_reader(o.id);
$$;
CREATE FUNCTION api.save_organization_branding(p_org uuid,p_settings jsonb,p_expected timestamptz DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE prior app.organization_branding; k text; v jsonb;
BEGIN
 IF NOT security.brand_editor(p_org) THEN RAISE EXCEPTION 'Sólo el responsable de un consultorio Custom puede editar su marca.'; END IF;
 IF p_settings IS NULL OR jsonb_typeof(p_settings)<>'object' OR length(trim(coalesce(p_settings->>'displayName','')))=0 OR length(p_settings->>'displayName')>80 OR coalesce(p_settings->>'colorPreset','') NOT IN('aqua','ocean','forest','violet','coral','teal','indigo','rose','olive','slate') THEN RAISE EXCEPTION 'Marca no válida.'; END IF;
 FOR k,v IN SELECT * FROM jsonb_each(p_settings) LOOP
   IF k NOT IN('displayName','tagline','colorPreset','contactPhone','contactEmail','contactAddress','logoPath','patientHeaderPath','professionalHeaderPath') OR jsonb_typeof(v)<>'string' OR length(v#>>'{}')>300 THEN RAISE EXCEPTION 'Campo no válido.'; END IF;
   IF k IN('logoPath','patientHeaderPath','professionalHeaderPath') AND v#>>'{}'<>'' AND NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='consultorio-branding' AND name=v#>>'{}' AND split_part(name,'/',1)=p_org::text) THEN RAISE EXCEPTION 'Imagen no disponible en este consultorio.'; END IF;
 END LOOP;
 PERFORM pg_advisory_xact_lock(hashtextextended('brand:'||p_org::text,0));
 SELECT * INTO prior FROM app.organization_branding WHERE organization_id=p_org;
 IF prior.updated_at IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'La marca cambió. Recargá antes de guardar.'; END IF;
 INSERT INTO app.organization_branding(organization_id,settings) VALUES(p_org,p_settings) ON CONFLICT(organization_id) DO UPDATE SET settings=excluded.settings,updated_at=clock_timestamp();
 INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details) VALUES(auth.uid(),p_org,'UPDATE_BRANDING','organization',p_org,'{}');
END; $$;
REVOKE ALL ON FUNCTION api.get_my_branding(),api.save_organization_branding(uuid,jsonb,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.get_my_branding(),api.save_organization_branding(uuid,jsonb,timestamptz) TO authenticated;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('consultorio-branding','consultorio-branding',false,2097152,ARRAY['image/jpeg','image/png','image/webp']);
CREATE POLICY branding_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='consultorio-branding' AND EXISTS(SELECT 1 FROM app.organizations o WHERE o.id::text=split_part(name,'/',1) AND security.brand_editor(o.id)));
CREATE POLICY branding_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='consultorio-branding' AND EXISTS(SELECT 1 FROM app.organizations o JOIN app.custom_branding_entitlements e ON e.organization_id=o.id AND e.enabled WHERE o.id::text=split_part(name,'/',1) AND security.brand_reader(o.id) AND (security.brand_editor(o.id) OR EXISTS(SELECT 1 FROM app.organization_branding b WHERE b.organization_id=o.id AND name IN(b.settings->>'logoPath',b.settings->>'patientHeaderPath',b.settings->>'professionalHeaderPath')))));
