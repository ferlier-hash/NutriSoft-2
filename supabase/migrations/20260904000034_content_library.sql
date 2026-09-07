-- Private educational content; no patient data or global/admin library.
CREATE TABLE app.content_library (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES app.organizations(id),
 owner_user_id uuid NOT NULL REFERENCES auth.users(id),
 kind text NOT NULL CHECK (kind IN ('recipe','document','video')),
 title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 160),
 category text NOT NULL CHECK (length(trim(category)) BETWEEN 1 AND 80),
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','retired')),
 body jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(body)='object' AND octet_length(body::text)<100000),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX content_library_owner ON app.content_library(organization_id,owner_user_id);
ALTER TABLE app.content_library ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION security.can_read_library(p_org uuid,p_owner uuid,p_status text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT NOT security.is_current_platform_admin() AND EXISTS(SELECT 1 FROM app.organizations WHERE id=p_org AND status='active')
 AND EXISTS(SELECT 1 FROM app.organization_members WHERE organization_id=p_org AND user_id=p_owner AND role='nutritionist' AND status='active')
 AND (p_owner=auth.uid() OR (p_status='published' AND EXISTS(
 SELECT 1 FROM app.patient_assignments a JOIN app.patient_portal_access p ON p.patient_id=a.patient_id AND p.organization_id=a.organization_id
 WHERE a.organization_id=p_org AND a.nutritionist_user_id=p_owner AND a.status='active' AND p.user_id=auth.uid() AND p.status='active')));
$$;
REVOKE ALL ON FUNCTION security.can_read_library(uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION security.can_read_library(uuid,uuid,text) TO authenticated;
CREATE POLICY library_read ON app.content_library FOR SELECT TO authenticated USING (security.can_read_library(organization_id,owner_user_id,status));
REVOKE ALL ON app.content_library FROM anon,authenticated;
GRANT SELECT ON app.content_library TO authenticated;
CREATE VIEW api.content_library WITH(security_invoker=true) AS SELECT * FROM app.content_library;
GRANT SELECT ON api.content_library TO authenticated;

CREATE FUNCTION api.save_library_content(p_id uuid,p_org_id uuid,p_kind text,p_title text,p_category text,p_status text,p_body jsonb,p_expected_updated_at timestamptz DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid; v_old app.content_library; v_key text; v_value jsonb;
BEGIN
 IF security.is_current_platform_admin() OR NOT security.has_current_org_role(p_org_id,ARRAY['nutritionist']) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
 IF p_id IS NOT NULL THEN
   SELECT * INTO v_old FROM app.content_library WHERE id=p_id AND organization_id=p_org_id AND owner_user_id=auth.uid() FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Contenido no disponible.'; END IF;
   IF p_expected_updated_at IS DISTINCT FROM v_old.updated_at THEN RAISE EXCEPTION 'El contenido cambió. Volvé a abrirlo antes de guardar.'; END IF;
 END IF;
 IF p_body IS NULL OR jsonb_typeof(p_body)<>'object' THEN RAISE EXCEPTION 'Contenido inválido.'; END IF;
 IF p_kind='recipe' THEN
   IF length(trim(coalesce(p_body->>'ingredients','')))=0 OR length(trim(coalesce(p_body->>'steps','')))=0 THEN RAISE EXCEPTION 'Completá ingredientes y preparación.'; END IF;
   FOREACH v_key IN ARRAY ARRAY['minutes','servings','calories','protein','carbs','fat'] LOOP
     v_value:=p_body->v_key;
     IF v_value IS NOT NULL AND v_value<>'null'::jsonb AND (jsonb_typeof(v_value)<>'number' OR (v_value#>>'{}')::numeric<0 OR (v_value#>>'{}')::numeric>100000) THEN RAISE EXCEPTION 'Valor nutricional inválido.'; END IF;
   END LOOP;
   IF coalesce((p_body->>'servings')::numeric,0)<=0 OR coalesce((p_body->>'minutes')::numeric,0)<=0 THEN RAISE EXCEPTION 'Indicá porciones y minutos positivos.'; END IF;
   IF coalesce(p_body->>'image','')<>'' AND p_body->>'image' !~ '^https://[^[:space:]]+$' THEN RAISE EXCEPTION 'La imagen debe usar HTTPS.'; END IF;
 ELSIF p_kind='video' THEN
   IF coalesce(p_body->>'url','') !~ '^https://[^[:space:]]+$' THEN RAISE EXCEPTION 'Indicá un enlace HTTPS.'; END IF;
 ELSIF p_kind='document' THEN
   IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='educational-documents' AND name=p_body->>'path' AND split_part(name,'/',1)=auth.uid()::text AND split_part(name,'/',2)=p_org_id::text) THEN RAISE EXCEPTION 'Seleccioná un PDF propio.'; END IF;
 END IF;
 IF p_id IS NULL THEN
   INSERT INTO app.content_library(organization_id,owner_user_id,kind,title,category,status,body) VALUES(p_org_id,auth.uid(),p_kind,trim(p_title),trim(p_category),p_status,p_body) RETURNING id INTO v_id;
 ELSE
   UPDATE app.content_library SET kind=p_kind,title=trim(p_title),category=trim(p_category),status=p_status,body=p_body,updated_at=clock_timestamp() WHERE id=p_id RETURNING id INTO v_id;
 END IF;
 INSERT INTO app.audit_logs(actor_id,organization_id,action,resource_type,resource_id,details) VALUES(auth.uid(),p_org_id,'SAVE_LIBRARY_CONTENT','content_library',v_id,jsonb_build_object('status',p_status));
 RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION api.save_library_content(uuid,uuid,text,text,text,text,jsonb,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION api.save_library_content(uuid,uuid,text,text,text,text,jsonb,timestamptz) TO authenticated;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('educational-documents','educational-documents',false,10485760,ARRAY['application/pdf']);
CREATE POLICY educational_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK (
 bucket_id='educational-documents' AND NOT security.is_current_platform_admin() AND split_part(name,'/',1)=auth.uid()::text
 AND EXISTS(SELECT 1 FROM app.organization_members m WHERE m.organization_id::text=split_part(name,'/',2) AND m.user_id=auth.uid() AND m.role='nutritionist' AND m.status='active' AND security.has_current_org_role(m.organization_id,ARRAY['nutritionist']))
);
CREATE POLICY educational_download ON storage.objects FOR SELECT TO authenticated USING (
 bucket_id='educational-documents' AND EXISTS(SELECT 1 FROM app.content_library c WHERE c.kind='document' AND c.body->>'path'=name AND security.can_read_library(c.organization_id,c.owner_user_id,c.status))
);
-- No public URLs, overwrites or client deletion of existing files.
