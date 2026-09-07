-- Migration: 20260814000012_phase_3_1_access_context.sql
-- Description: Contexto mínimo de acceso del usuario autenticado para guards de Fase 3.1.

CREATE OR REPLACE FUNCTION api.get_current_access_context()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Autenticación requerida';
  END IF;

  SELECT jsonb_build_object(
    'user_id', v_user_id,
    'platform_role', CASE
      WHEN EXISTS (
        SELECT 1
        FROM app.user_platform_roles upr
        WHERE upr.user_id = v_user_id
          AND upr.role = 'platform_admin'
      ) THEN 'platform_admin'
      ELSE NULL
    END,
    'memberships', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'organization_id', om.organization_id,
          'organization_name', o.name,
          'organization_status', o.status,
          'role', om.role,
          'membership_status', om.status
        )
        ORDER BY om.created_at, om.organization_id
      )
      FROM app.organization_members om
      JOIN app.organizations o ON o.id = om.organization_id
      WHERE om.user_id = v_user_id
    ), '[]'::jsonb),
    'patient_accesses', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'organization_id', ppa.organization_id,
          'organization_status', o.status,
          'patient_id', ppa.patient_id,
          'patient_status', p.status,
          'access_status', ppa.status
        )
        ORDER BY ppa.granted_at, ppa.patient_id
      )
      FROM app.patient_portal_access ppa
      JOIN app.patients p
        ON p.id = ppa.patient_id
       AND p.organization_id = ppa.organization_id
      JOIN app.organizations o ON o.id = ppa.organization_id
      WHERE ppa.user_id = v_user_id
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION api.get_current_access_context() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.get_current_access_context() TO authenticated, service_role;
