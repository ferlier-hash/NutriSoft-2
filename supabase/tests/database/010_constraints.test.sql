-- pgTAP Test: 010_constraints.test.sql
BEGIN;
SELECT plan(6);

SET search_path = app, public;

SELECT col_is_pk('organizations', 'id', 'PK id en organizations');
SELECT col_is_pk('profiles', 'id', 'PK id en profiles');
SELECT col_is_pk('patients', 'id', 'PK id en patients');

SELECT fk_ok('app', 'organization_members', 'organization_id', 'app', 'organizations', 'id', 'FK organization_members.organization_id');
SELECT fk_ok('app', 'patients', 'organization_id', 'app', 'organizations', 'id', 'FK patients.organization_id');
SELECT fk_ok('app', 'patient_portal_access', 'user_id', 'auth', 'users', 'id', 'FK patient_portal_access.user_id');

SELECT * FROM finish();
ROLLBACK;
