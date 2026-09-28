-- Remove replaced branding assets without risking a currently referenced image.
CREATE OR REPLACE FUNCTION security.brand_asset_delete(p_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(
  SELECT 1 FROM app.file_uploads f
  WHERE f.final_bucket='consultorio-branding' AND f.final_path=p_name AND f.status='clean'
    AND security.brand_editor(f.organization_id)
    AND NOT EXISTS(
      SELECT 1 FROM app.organization_branding b
      WHERE p_name IN(b.settings->>'logoPath',b.settings->>'patientHeaderPath',b.settings->>'professionalHeaderPath')
    )
 );
$$;
REVOKE ALL ON FUNCTION security.brand_asset_delete(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION security.brand_asset_delete(text) TO authenticated;

CREATE POLICY branding_delete_unreferenced ON storage.objects FOR DELETE TO authenticated
USING(bucket_id='consultorio-branding' AND security.brand_asset_delete(name));

CREATE OR REPLACE FUNCTION api.mark_brand_asset_deleted(p_org uuid,p_path text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT security.brand_editor(p_org) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
 IF EXISTS(
  SELECT 1 FROM app.organization_branding b
  WHERE p_path IN(b.settings->>'logoPath',b.settings->>'patientHeaderPath',b.settings->>'professionalHeaderPath')
 ) THEN RAISE EXCEPTION 'La imagen continúa en uso.'; END IF;
 IF EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='consultorio-branding' AND o.name=p_path) THEN
  RAISE EXCEPTION 'La imagen todavía existe en Storage.';
 END IF;
 UPDATE app.file_uploads SET status='deleted',final_bucket=NULL,final_path=NULL,deleted_at=clock_timestamp()
 WHERE organization_id=p_org AND final_bucket='consultorio-branding' AND final_path=p_path AND status='clean';
END;
$$;
REVOKE ALL ON FUNCTION api.mark_brand_asset_deleted(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION api.mark_brand_asset_deleted(uuid,text) TO authenticated;

-- The cleanup job is the recovery path when the immediate client request is interrupted.
CREATE OR REPLACE FUNCTION security.expire_replaced_brand_assets()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE k text; old_path text; new_path text;
BEGIN
 FOREACH k IN ARRAY ARRAY['logoPath','patientHeaderPath','professionalHeaderPath'] LOOP
  old_path:=coalesce(OLD.settings->>k,'');
  new_path:=coalesce(NEW.settings->>k,'');
  IF old_path<>'' AND old_path IS DISTINCT FROM new_path THEN
   UPDATE app.file_uploads SET expires_at=clock_timestamp()
   WHERE organization_id=NEW.organization_id AND final_bucket='consultorio-branding' AND final_path=old_path AND status='clean';
  END IF;
 END LOOP;
 RETURN NEW;
END;
$$;
CREATE TRIGGER organization_branding_expire_replaced_assets
AFTER UPDATE ON app.organization_branding FOR EACH ROW EXECUTE FUNCTION security.expire_replaced_brand_assets();

NOTIFY pgrst, 'reload schema';
