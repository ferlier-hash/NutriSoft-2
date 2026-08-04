-- pgTAP Test: 000_schema.test.sql
BEGIN;
SELECT plan(10);

-- Existencia de esquemas requeridos
SELECT has_schema('app');
SELECT has_schema('security');
SELECT has_schema('api');

-- Existencia de tablas principales
SELECT has_table('app', 'organizations');
SELECT has_table('app', 'profiles');
SELECT has_table('app', 'user_platform_roles');
SELECT has_table('app', 'organization_members');
SELECT has_table('app', 'patients');
SELECT has_table('app', 'check_in_responses');
SELECT has_table('app', 'audit_logs');

SELECT * FROM finish();
ROLLBACK;
