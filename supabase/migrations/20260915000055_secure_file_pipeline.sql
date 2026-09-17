-- Secure upload pipeline: reserve -> quarantine -> scan/sanitize -> final storage.
CREATE TYPE app.file_asset_kind AS ENUM ('library_pdf','branding_logo','branding_patient_header','branding_professional_header');
CREATE TYPE app.file_scan_status AS ENUM ('reserved','uploaded','scanning','clean','rejected','failed','abandoned','deleted');

CREATE TABLE app.file_uploads (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES app.organizations(id),
 owner_user_id uuid NOT NULL REFERENCES auth.users(id),
 kind app.file_asset_kind NOT NULL,
 original_filename text NOT NULL CHECK (length(original_filename) BETWEEN 1 AND 240),
 declared_mime text NOT NULL,
 declared_size bigint NOT NULL CHECK (declared_size > 0 AND declared_size <= 10485760),
 quarantine_path text NOT NULL UNIQUE,
 final_bucket text,
 final_path text UNIQUE,
 status app.file_scan_status NOT NULL DEFAULT 'reserved',
 failure_code text,
 scanner_name text,
 scanner_version text,
 reserved_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 uploaded_at timestamptz,
 scan_started_at timestamptz,
 scanned_at timestamptz,
 expires_at timestamptz NOT NULL DEFAULT (clock_timestamp() + interval '24 hours'),
 deleted_at timestamptz,
 CHECK ((status='clean') = (final_bucket IS NOT NULL AND final_path IS NOT NULL)),
 CHECK (failure_code IS NULL OR failure_code IN ('malware','invalid_type','invalid_content','decode_failed','scanner_unavailable','size_mismatch','processing_failed'))
);
CREATE INDEX file_uploads_owner_status_idx ON app.file_uploads(owner_user_id,organization_id,status);
CREATE INDEX file_uploads_cleanup_idx ON app.file_uploads(status,expires_at);
ALTER TABLE app.file_uploads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app.file_uploads FROM PUBLIC,anon,authenticated;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('upload-quarantine','upload-quarantine',false,10485760,ARRAY['application/pdf','image/jpeg','image/png','image/webp'])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

CREATE FUNCTION security.can_write_quarantine(p_name text,p_size bigint,p_mime text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT NOT security.is_current_platform_admin() AND EXISTS(
  SELECT 1 FROM app.file_uploads f
  WHERE f.owner_user_id=auth.uid() AND f.quarantine_path=p_name AND f.status='reserved' AND f.expires_at>clock_timestamp()
    AND f.declared_size=p_size AND f.declared_mime=p_mime
 );
$$;
REVOKE ALL ON FUNCTION security.can_write_quarantine(text,bigint,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION security.can_write_quarantine(text,bigint,text) TO authenticated;

CREATE POLICY quarantine_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(
 bucket_id='upload-quarantine' AND security.can_write_quarantine(
  name,
  CASE WHEN metadata->>'size' ~ '^[0-9]+$' THEN (metadata->>'size')::bigint ELSE 0 END,
  coalesce(metadata->>'mimetype','')
 )
);

CREATE FUNCTION api.reserve_secure_upload(p_organization_id uuid,p_kind text,p_filename text,p_mime text,p_size bigint)
RETURNS TABLE(upload_id uuid,bucket_id text,object_path text,status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid:=gen_random_uuid(); v_ext text; v_reserved bigint; v_limit bigint;
BEGIN
 IF security.is_current_platform_admin() THEN RAISE EXCEPTION 'No autorizado.'; END IF;
 IF p_kind NOT IN ('library_pdf','branding_logo','branding_patient_header','branding_professional_header') THEN RAISE EXCEPTION 'Tipo de archivo no válido.'; END IF;
 IF p_filename IS NULL OR length(trim(p_filename)) NOT BETWEEN 1 AND 240 OR p_filename ~ '[[:cntrl:]]' THEN RAISE EXCEPTION 'Nombre de archivo no válido.'; END IF;
 IF p_kind='library_pdf' THEN
  IF p_mime<>'application/pdf' OR p_size NOT BETWEEN 1 AND 10485760 THEN RAISE EXCEPTION 'Seleccioná un PDF de hasta 10 MB.'; END IF;
  IF NOT security.has_current_org_role(p_organization_id,ARRAY['nutritionist']) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
  SELECT storage_limit_bytes INTO v_limit FROM app.professional_library_settings WHERE organization_id=p_organization_id AND owner_user_id=auth.uid() AND policy_version='2026-09-13-v1' AND accepted_at IS NOT NULL;
  IF v_limit IS NULL THEN RAISE EXCEPTION 'Aceptá la declaración de responsabilidad antes de subir recursos.'; END IF;
  SELECT coalesce(sum(f.declared_size),0) INTO v_reserved FROM app.file_uploads f WHERE f.organization_id=p_organization_id AND f.owner_user_id=auth.uid() AND f.kind='library_pdf' AND f.status IN('reserved','uploaded','scanning') AND f.expires_at>clock_timestamp();
  IF p_size + v_reserved + coalesce((SELECT sum(CASE WHEN o.metadata->>'size' ~ '^[0-9]+$' THEN (o.metadata->>'size')::bigint ELSE 0 END) FROM storage.objects o WHERE o.bucket_id='educational-documents' AND split_part(o.name,'/',1)=auth.uid()::text AND split_part(o.name,'/',2)=p_organization_id::text),0)>v_limit THEN RAISE EXCEPTION 'No queda espacio suficiente para este PDF.'; END IF;
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
REVOKE ALL ON FUNCTION api.reserve_secure_upload(uuid,text,text,text,bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION api.reserve_secure_upload(uuid,text,text,text,bigint) TO authenticated;

CREATE FUNCTION api.confirm_secure_upload(p_upload_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE f app.file_uploads; actual_size bigint; actual_mime text;
BEGIN
 SELECT * INTO f FROM app.file_uploads WHERE id=p_upload_id AND owner_user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND OR f.status<>'reserved' OR f.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'La reserva de carga ya no está disponible.'; END IF;
 SELECT CASE WHEN metadata->>'size' ~ '^[0-9]+$' THEN (metadata->>'size')::bigint ELSE 0 END,coalesce(metadata->>'mimetype','') INTO actual_size,actual_mime FROM storage.objects WHERE bucket_id='upload-quarantine' AND name=f.quarantine_path;
 IF NOT FOUND OR actual_size<>f.declared_size OR actual_mime<>f.declared_mime THEN RAISE EXCEPTION 'El archivo recibido no coincide con la reserva.'; END IF;
 UPDATE app.file_uploads SET status='uploaded',uploaded_at=clock_timestamp() WHERE id=f.id;
 RETURN 'uploaded';
END; $$;
REVOKE ALL ON FUNCTION api.confirm_secure_upload(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION api.confirm_secure_upload(uuid) TO authenticated;

CREATE FUNCTION api.get_secure_upload_status(p_upload_id uuid)
RETURNS TABLE(status text,final_path text,failure_code text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT f.status::text,f.final_path,f.failure_code FROM app.file_uploads f WHERE f.id=p_upload_id AND f.owner_user_id=auth.uid() AND NOT security.is_current_platform_admin();
$$;
REVOKE ALL ON FUNCTION api.get_secure_upload_status(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION api.get_secure_upload_status(uuid) TO authenticated;

-- Worker-only transitions. The service moves/re-encodes the object first and then attests the final path.
CREATE FUNCTION api.claim_secure_upload_for_service(p_upload_id uuid)
RETURNS TABLE(kind text,quarantine_path text,declared_mime text,declared_size bigint,organization_id uuid,owner_user_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'No autorizado.'; END IF;
 RETURN QUERY UPDATE app.file_uploads f SET status='scanning',scan_started_at=clock_timestamp()
 WHERE f.id=p_upload_id AND f.status='uploaded' AND f.expires_at>clock_timestamp()
 RETURNING f.kind::text,f.quarantine_path,f.declared_mime,f.declared_size,f.organization_id,f.owner_user_id;
END; $$;
CREATE FUNCTION api.finish_secure_upload_for_service(p_upload_id uuid,p_clean boolean,p_final_path text,p_failure_code text,p_scanner text,p_scanner_version text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE f app.file_uploads; expected_bucket text; expected_prefix text;
BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'No autorizado.'; END IF;
 SELECT * INTO f FROM app.file_uploads WHERE id=p_upload_id AND status='scanning' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Carga no disponible para finalizar.'; END IF;
 IF p_clean THEN
  expected_bucket:=CASE WHEN f.kind='library_pdf' THEN 'educational-documents' ELSE 'consultorio-branding' END;
  expected_prefix:=CASE WHEN f.kind='library_pdf' THEN f.owner_user_id::text||'/'||f.organization_id::text||'/' ELSE f.organization_id::text||'/' END;
  IF p_final_path IS NULL OR p_final_path NOT LIKE expected_prefix||'%' OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id=expected_bucket AND name=p_final_path) THEN RAISE EXCEPTION 'El archivo final saneado no está disponible.'; END IF;
  UPDATE app.file_uploads SET status='clean',final_bucket=expected_bucket,final_path=p_final_path,failure_code=NULL,scanner_name=left(p_scanner,80),scanner_version=left(p_scanner_version,80),scanned_at=clock_timestamp(),expires_at=clock_timestamp()+interval '7 days' WHERE id=f.id;
 ELSE
  IF p_failure_code NOT IN('malware','invalid_type','invalid_content','decode_failed','scanner_unavailable','size_mismatch','processing_failed') THEN RAISE EXCEPTION 'Resultado de escaneo no válido.'; END IF;
  UPDATE app.file_uploads SET status=CASE WHEN p_failure_code='malware' THEN 'rejected'::app.file_scan_status ELSE 'failed'::app.file_scan_status END,failure_code=p_failure_code,scanner_name=left(p_scanner,80),scanner_version=left(p_scanner_version,80),scanned_at=clock_timestamp(),expires_at=clock_timestamp()+interval '24 hours' WHERE id=f.id;
 END IF;
 INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details) VALUES(NULL,f.organization_id,CASE WHEN p_clean THEN 'FILE_SCAN_CLEAN' ELSE 'FILE_SCAN_REJECTED' END,'file_upload',f.id,jsonb_build_object('kind',f.kind,'result',CASE WHEN p_clean THEN 'clean' ELSE p_failure_code END));
END; $$;
REVOKE ALL ON FUNCTION api.claim_secure_upload_for_service(uuid),api.finish_secure_upload_for_service(uuid,boolean,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION api.claim_secure_upload_for_service(uuid),api.finish_secure_upload_for_service(uuid,boolean,text,text,text,text) TO service_role;

-- New clients cannot bypass quarantine. Existing final objects remain readable and editable in place.
DROP POLICY IF EXISTS educational_upload ON storage.objects;
DROP POLICY IF EXISTS branding_upload ON storage.objects;

CREATE OR REPLACE FUNCTION security.file_is_clean(p_bucket text,p_path text,p_org uuid,p_owner uuid DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM app.file_uploads f WHERE f.final_bucket=p_bucket AND f.final_path=p_path AND f.organization_id=p_org AND (p_owner IS NULL OR f.owner_user_id=p_owner) AND f.status='clean');
$$;
REVOKE ALL ON FUNCTION security.file_is_clean(text,text,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION security.file_is_clean(text,text,uuid,uuid) TO authenticated,service_role;

CREATE FUNCTION security.enforce_clean_library_file() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.kind='document' AND (TG_OP='INSERT' OR OLD.kind IS DISTINCT FROM NEW.kind OR OLD.body->>'path' IS DISTINCT FROM NEW.body->>'path')
    AND NOT security.file_is_clean('educational-documents',NEW.body->>'path',NEW.organization_id,NEW.owner_user_id) THEN
  RAISE EXCEPTION 'El PDF todavía no superó el control de seguridad.';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER content_library_clean_file BEFORE INSERT OR UPDATE ON app.content_library FOR EACH ROW EXECUTE FUNCTION security.enforce_clean_library_file();

CREATE FUNCTION security.enforce_clean_brand_assets() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE k text; new_path text; old_path text;
BEGIN
 FOREACH k IN ARRAY ARRAY['logoPath','patientHeaderPath','professionalHeaderPath'] LOOP
  new_path:=coalesce(NEW.settings->>k,''); old_path:=CASE WHEN TG_OP='UPDATE' THEN coalesce(OLD.settings->>k,'') ELSE '' END;
  IF new_path<>'' AND new_path IS DISTINCT FROM old_path AND NOT security.file_is_clean('consultorio-branding',new_path,NEW.organization_id,NULL) THEN
   RAISE EXCEPTION 'La imagen todavía no superó el control de seguridad.';
  END IF;
 END LOOP;
 RETURN NEW;
END; $$;
CREATE TRIGGER organization_branding_clean_files BEFORE INSERT OR UPDATE ON app.organization_branding FOR EACH ROW EXECUTE FUNCTION security.enforce_clean_brand_assets();

CREATE FUNCTION api.list_secure_upload_cleanup_for_service(p_limit integer DEFAULT 100)
RETURNS TABLE(upload_id uuid,bucket_id text,object_path text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'No autorizado.'; END IF;
 RETURN QUERY
  SELECT f.id,
   CASE WHEN f.status='clean' THEN f.final_bucket ELSE 'upload-quarantine' END,
   CASE WHEN f.status='clean' THEN f.final_path ELSE f.quarantine_path END
  FROM app.file_uploads f
  WHERE f.expires_at<clock_timestamp() AND (
   f.status IN('reserved','uploaded','scanning','failed','rejected') OR
   (f.status='clean' AND NOT EXISTS(SELECT 1 FROM app.content_library c WHERE c.kind='document' AND c.body->>'path'=f.final_path)
    AND NOT EXISTS(SELECT 1 FROM app.organization_branding b WHERE f.final_path IN(b.settings->>'logoPath',b.settings->>'patientHeaderPath',b.settings->>'professionalHeaderPath')))
  )
  ORDER BY f.expires_at LIMIT least(greatest(p_limit,1),500);
END; $$;
CREATE FUNCTION api.mark_secure_upload_deleted_for_service(p_upload_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'No autorizado.'; END IF;
 UPDATE app.file_uploads SET status=CASE WHEN status IN('reserved','uploaded','scanning') THEN 'abandoned'::app.file_scan_status ELSE 'deleted'::app.file_scan_status END,final_bucket=NULL,final_path=NULL,deleted_at=clock_timestamp() WHERE id=p_upload_id AND status IN('reserved','uploaded','scanning','failed','rejected','clean');
END; $$;
REVOKE ALL ON FUNCTION api.list_secure_upload_cleanup_for_service(integer),api.mark_secure_upload_deleted_for_service(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION api.list_secure_upload_cleanup_for_service(integer),api.mark_secure_upload_deleted_for_service(uuid) TO service_role;

NOTIFY pgrst, 'reload schema';
