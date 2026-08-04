-- pgTAP Test: 010_constraints.test.sql
BEGIN;
SELECT plan(6);

-- Primary Keys
SELECT col_is_pk('app', 'organizations', 'id');
SELECT col_is_pk('app', 'profiles', 'id');
SELECT col_is_pk('app', 'patients', 'id');

-- Foreign Keys
SELECT fk_ok('app', 'organization_members', 'organization_id', 'app', 'organizations', 'id');
SELECT fk_ok('app', 'patients', 'organization_id', 'app', 'organizations', 'id');
SELECT fk_ok('app', 'patient_portal_access', 'user_id', 'auth', 'users', 'id');

SELECT * FROM finish();
ROLLBACK;
