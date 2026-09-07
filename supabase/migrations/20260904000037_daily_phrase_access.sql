-- Revocation of a professional's active membership also revokes patient publications.
CREATE OR REPLACE FUNCTION security.daily_phrase_visible(p_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT NOT security.is_current_platform_admin() AND EXISTS (
 SELECT 1 FROM app.daily_phrases p WHERE p.id=p_id AND NOT p.deleted AND
 ((p.owner_user_id=auth.uid() AND security.has_current_org_role(p.organization_id,ARRAY['nutritionist'])) OR
 EXISTS(SELECT 1 FROM app.daily_phrase_assignments a WHERE a.phrase_id=p.id
 AND security.daily_patient_author(a.patient_id,p.owner_user_id))))
$$;
