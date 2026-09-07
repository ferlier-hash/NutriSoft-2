-- Keep internal entitlement tables inaccessible to clients while checking Storage.
CREATE FUNCTION security.brand_asset_access(p_name text,p_write boolean) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM app.organizations o JOIN app.custom_branding_entitlements e ON e.organization_id=o.id AND e.enabled
 WHERE o.id::text=split_part(p_name,'/',1) AND
 CASE WHEN p_write THEN security.brand_editor(o.id) ELSE security.brand_reader(o.id) AND
 (security.brand_editor(o.id) OR EXISTS(SELECT 1 FROM app.organization_branding b WHERE b.organization_id=o.id AND p_name IN(b.settings->>'logoPath',b.settings->>'patientHeaderPath',b.settings->>'professionalHeaderPath'))) END);
$$;
REVOKE ALL ON FUNCTION security.brand_asset_access(text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION security.brand_asset_access(text,boolean) TO authenticated;
DROP POLICY branding_upload ON storage.objects;
DROP POLICY branding_read ON storage.objects;
CREATE POLICY branding_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='consultorio-branding' AND security.brand_asset_access(name,true));
CREATE POLICY branding_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='consultorio-branding' AND security.brand_asset_access(name,false));
NOTIFY pgrst, 'reload schema';
