-- pgTAP Test: 100_auth_access_context.test.sql
BEGIN;
SELECT plan(12);

SELECT has_function('api', 'get_current_access_context', ARRAY[]::text[], 'Existe la RPC de contexto de acceso');

SET LOCAL ROLE authenticated;

-- Platform Admin: se identifica sin recibir membresías o pacientes ajenos.
SELECT set_config('request.jwt.claims', '{"sub": "a0000000-0000-4000-8000-000000000000", "role": "authenticated"}', true);
SELECT is(api.get_current_access_context()->>'platform_role', 'platform_admin', 'Reconoce al Platform Admin');
SELECT is(jsonb_array_length(api.get_current_access_context()->'memberships'), 0, 'Platform Admin no recibe membresías ajenas');
SELECT is(jsonb_array_length(api.get_current_access_context()->'patient_accesses'), 0, 'Platform Admin no recibe accesos de pacientes');

-- Owner activo: únicamente su propia membresía.
SELECT set_config('request.jwt.claims', '{"sub": "b1111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);
SELECT is(jsonb_array_length(api.get_current_access_context()->'memberships'), 1, 'Owner recibe una sola membresía propia');
SELECT is(api.get_current_access_context()->'memberships'->0->>'role', 'organization_owner', 'La membresía conserva el rol de owner');
SELECT is(api.get_current_access_context()->'memberships'->0->>'organization_status', 'active', 'El contexto informa organización activa');

-- Paciente: recibe únicamente su acceso de portal.
SELECT set_config('request.jwt.claims', '{"sub": "d1111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);
SELECT is(jsonb_array_length(api.get_current_access_context()->'memberships'), 0, 'Paciente no recibe membresías profesionales');
SELECT is(api.get_current_access_context()->'patient_accesses'->0->>'patient_id', 'f1111111-1111-4111-8111-111111111111', 'Paciente recibe sólo su identificador de acceso');

-- Suspensión debe estar disponible para bloquear el frontend sin exponer clínica.
SELECT set_config('request.jwt.claims', '{"sub": "c2222222-2222-4222-8222-222222222222", "role": "authenticated"}', true);
SELECT is(api.get_current_access_context()->'memberships'->0->>'organization_status', 'suspended', 'El contexto conserva el estado suspendido');

-- Un usuario autenticado sin asignación no hereda permisos.
SELECT set_config('request.jwt.claims', '{"sub": "99999999-9999-4999-8999-999999999999", "role": "authenticated"}', true);
SELECT is(jsonb_array_length(api.get_current_access_context()->'memberships'), 0, 'Usuario sin rol no recibe membresías');
SELECT is(jsonb_array_length(api.get_current_access_context()->'patient_accesses'), 0, 'Usuario sin rol no recibe accesos de paciente');

SELECT * FROM finish();
ROLLBACK;
