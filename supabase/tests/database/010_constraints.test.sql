-- pgTAP Test: 010_constraints.test.sql
BEGIN;
SELECT plan(8);

-- Primary Keys
SELECT col_is_pk('app', 'organizations', 'id');
SELECT col_is_pk('app', 'profiles', 'id');
SELECT col_is_pk('app', 'patients', 'id');

-- Foreign Keys & Constraints
SELECT fk_ok('app', 'organization_members', 'organization_id', 'app', 'organizations', 'id');
SELECT fk_ok('app', 'patients', 'organization_id', 'app', 'organizations', 'id');
SELECT fk_ok('app', 'patient_portal_access', 'user_id', 'auth', 'users', 'id');

-- RLS activado en todas las tablas
SELECT all_tables_are_rls_enabled('app');

-- RLS deshabilitado en anon
SELECT cant_connect('anon');

SELECT * FROM finish();
ROLLBACK;
