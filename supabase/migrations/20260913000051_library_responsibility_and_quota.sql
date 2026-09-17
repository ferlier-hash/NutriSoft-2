-- Versioned responsibility acceptance and per-professional storage quota.
CREATE TABLE app.professional_library_settings (
 organization_id uuid NOT NULL REFERENCES app.organizations(id),
 owner_user_id uuid NOT NULL REFERENCES auth.users(id),
 policy_version text,
 accepted_at timestamptz,
 storage_limit_bytes bigint NOT NULL DEFAULT 262144000 CHECK (storage_limit_bytes BETWEEN 10485760 AND 10737418240),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (organization_id, owner_user_id),
 CHECK ((policy_version IS NULL) = (accepted_at IS NULL))
);
ALTER TABLE app.professional_library_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app.professional_library_settings FROM PUBLIC, anon, authenticated;

CREATE FUNCTION api.get_my_library_settings(p_organization_id uuid)
RETURNS TABLE(policy_version text, accepted boolean, accepted_at timestamptz, used_bytes bigint, limit_bytes bigint, available_bytes bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_limit bigint; v_used bigint; v_version text; v_accepted_at timestamptz;
BEGIN
 IF security.is_current_platform_admin() OR NOT security.has_current_org_role(p_organization_id,ARRAY['nutritionist']) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
 SELECT s.policy_version,s.accepted_at,s.storage_limit_bytes INTO v_version,v_accepted_at,v_limit
 FROM app.professional_library_settings s WHERE s.organization_id=p_organization_id AND s.owner_user_id=auth.uid();
 v_limit:=coalesce(v_limit,262144000);
 SELECT coalesce(sum(CASE WHEN o.metadata->>'size' ~ '^[0-9]+$' THEN (o.metadata->>'size')::bigint ELSE 0 END),0)::bigint INTO v_used
 FROM storage.objects o WHERE o.bucket_id='educational-documents' AND split_part(o.name,'/',1)=auth.uid()::text AND split_part(o.name,'/',2)=p_organization_id::text;
 RETURN QUERY SELECT coalesce(v_version,'2026-09-13-v1'),(v_version='2026-09-13-v1' AND v_accepted_at IS NOT NULL),v_accepted_at,v_used,v_limit,greatest(v_limit-v_used,0::bigint);
END; $$;
REVOKE ALL ON FUNCTION api.get_my_library_settings(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION api.get_my_library_settings(uuid) TO authenticated;

CREATE FUNCTION api.set_my_library_responsibility(p_organization_id uuid,p_accepted boolean,p_policy_version text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF security.is_current_platform_admin() OR NOT security.has_current_org_role(p_organization_id,ARRAY['nutritionist']) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
 IF p_accepted AND p_policy_version<>'2026-09-13-v1' THEN RAISE EXCEPTION 'La declaración cambió. Volvé a leerla antes de aceptar.'; END IF;
 INSERT INTO app.professional_library_settings(organization_id,owner_user_id,policy_version,accepted_at,updated_at)
 VALUES(p_organization_id,auth.uid(),CASE WHEN p_accepted THEN '2026-09-13-v1' END,CASE WHEN p_accepted THEN now() END,now())
 ON CONFLICT(organization_id,owner_user_id) DO UPDATE SET policy_version=excluded.policy_version,accepted_at=excluded.accepted_at,updated_at=now();
 INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details)
 VALUES(auth.uid(),p_organization_id,CASE WHEN p_accepted THEN 'ACCEPT_LIBRARY_RESPONSIBILITY' ELSE 'REVOKE_LIBRARY_RESPONSIBILITY' END,'professional_library_settings',auth.uid(),jsonb_build_object('policyVersion',CASE WHEN p_accepted THEN '2026-09-13-v1' ELSE NULL END));
END; $$;
REVOKE ALL ON FUNCTION api.set_my_library_responsibility(uuid,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION api.set_my_library_responsibility(uuid,boolean,text) TO authenticated;

CREATE FUNCTION security.can_upload_educational_document(p_name text,p_size bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT p_size>0 AND split_part(p_name,'/',1)=auth.uid()::text
 AND EXISTS (
   SELECT 1 FROM app.organization_members m JOIN app.professional_library_settings s ON s.organization_id=m.organization_id AND s.owner_user_id=m.user_id
   WHERE m.organization_id::text=split_part(p_name,'/',2) AND m.user_id=auth.uid() AND m.role='nutritionist' AND m.status='active'
   AND s.policy_version='2026-09-13-v1' AND s.accepted_at IS NOT NULL AND security.has_current_org_role(m.organization_id,ARRAY['nutritionist'])
   AND p_size + coalesce((SELECT sum(CASE WHEN o.metadata->>'size' ~ '^[0-9]+$' THEN (o.metadata->>'size')::bigint ELSE 0 END) FROM storage.objects o WHERE o.bucket_id='educational-documents' AND split_part(o.name,'/',1)=auth.uid()::text AND split_part(o.name,'/',2)=m.organization_id::text),0) <= s.storage_limit_bytes
 );
$$;
REVOKE ALL ON FUNCTION security.can_upload_educational_document(text,bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION security.can_upload_educational_document(text,bigint) TO authenticated;

DROP POLICY educational_upload ON storage.objects;
CREATE POLICY educational_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK (
 bucket_id='educational-documents' AND NOT security.is_current_platform_admin()
 AND security.can_upload_educational_document(name,CASE WHEN metadata->>'size' ~ '^[0-9]+$' THEN (metadata->>'size')::bigint ELSE 0 END)
);

CREATE OR REPLACE FUNCTION api.save_library_content(p_id uuid,p_org_id uuid,p_kind text,p_title text,p_category text,p_status text,p_body jsonb,p_expected_updated_at timestamptz DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid; v_old app.content_library; v_key text; v_value jsonb; v_requires_acceptance boolean;
BEGIN
 IF security.is_current_platform_admin() OR NOT security.has_current_org_role(p_org_id,ARRAY['nutritionist']) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
 IF p_id IS NOT NULL THEN
   SELECT * INTO v_old FROM app.content_library WHERE id=p_id AND organization_id=p_org_id AND owner_user_id=auth.uid() FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Contenido no disponible.'; END IF;
   IF p_expected_updated_at IS DISTINCT FROM v_old.updated_at THEN RAISE EXCEPTION 'El contenido cambió. Volvé a abrirlo antes de guardar.'; END IF;
 END IF;
 v_requires_acceptance:=p_kind IN ('document','video') AND (p_id IS NULL OR p_kind IS DISTINCT FROM v_old.kind OR p_body IS DISTINCT FROM v_old.body);
 IF v_requires_acceptance AND NOT EXISTS(SELECT 1 FROM app.professional_library_settings s WHERE s.organization_id=p_org_id AND s.owner_user_id=auth.uid() AND s.policy_version='2026-09-13-v1' AND s.accepted_at IS NOT NULL) THEN RAISE EXCEPTION 'Aceptá la declaración de responsabilidad en Configuración para agregar o reemplazar recursos.'; END IF;
 IF p_body IS NULL OR jsonb_typeof(p_body)<>'object' THEN RAISE EXCEPTION 'Contenido inválido.'; END IF;
 IF p_kind='recipe' THEN
   IF length(trim(coalesce(p_body->>'ingredients','')))=0 OR length(trim(coalesce(p_body->>'steps','')))=0 THEN RAISE EXCEPTION 'Completá ingredientes y preparación.'; END IF;
   FOREACH v_key IN ARRAY ARRAY['minutes','servings','calories','protein','carbs','fat'] LOOP v_value:=p_body->v_key; IF v_value IS NOT NULL AND v_value<>'null'::jsonb AND (jsonb_typeof(v_value)<>'number' OR (v_value#>>'{}')::numeric<0 OR (v_value#>>'{}')::numeric>100000) THEN RAISE EXCEPTION 'Valor nutricional inválido.'; END IF; END LOOP;
   IF coalesce((p_body->>'servings')::numeric,0)<=0 OR coalesce((p_body->>'minutes')::numeric,0)<=0 THEN RAISE EXCEPTION 'Indicá porciones y minutos positivos.'; END IF;
   IF coalesce(p_body->>'image','')<>'' AND p_body->>'image' !~ '^https://[^[:space:]]+$' THEN RAISE EXCEPTION 'La imagen debe usar HTTPS.'; END IF;
 ELSIF p_kind='video' THEN IF coalesce(p_body->>'url','') !~ '^https://[^[:space:]]+$' THEN RAISE EXCEPTION 'Indicá un enlace HTTPS.'; END IF;
 ELSIF p_kind='document' THEN IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='educational-documents' AND name=p_body->>'path' AND split_part(name,'/',1)=auth.uid()::text AND split_part(name,'/',2)=p_org_id::text) THEN RAISE EXCEPTION 'Seleccioná un PDF propio.'; END IF;
 END IF;
 IF p_id IS NULL THEN INSERT INTO app.content_library(organization_id,owner_user_id,kind,title,category,status,body) VALUES(p_org_id,auth.uid(),p_kind,trim(p_title),trim(p_category),p_status,p_body) RETURNING id INTO v_id;
 ELSE UPDATE app.content_library SET kind=p_kind,title=trim(p_title),category=trim(p_category),status=p_status,body=p_body,updated_at=clock_timestamp() WHERE id=p_id RETURNING id INTO v_id; END IF;
 INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details) VALUES(auth.uid(),p_org_id,'SAVE_LIBRARY_CONTENT','content_library',v_id,jsonb_build_object('status',p_status));
 RETURN v_id;
END; $$;
