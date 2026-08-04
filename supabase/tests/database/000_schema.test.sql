-- pgTAP Test: 000_schema.test.sql
BEGIN;
SELECT plan(12);

-- 1. Existencia de esquemas (SCHEMA-01)
SELECT schemas_are(ARRAY['public', 'app', 'security', 'api', 'extensions', 'graphql_public', 'pgtap', 'vault', 'auth', 'storage', 'realtime', '_analytics']);

-- 2. Verificar que esquemas no estén expuestos incorrectamente
SELECT has_schema('app');
SELECT has_schema('security');
SELECT has_schema('api');

-- 3. Existencia de tablas principales
SELECT has_table('app', 'organizations');
SELECT has_table('app', 'profiles');
SELECT has_table('app', 'user_platform_roles');
SELECT has_table('app', 'organization_members');
SELECT has_table('app', 'patients');
SELECT has_table('app', 'patient_assignments');
SELECT has_table('app', 'check_in_responses');
SELECT has_table('app', 'audit_logs');

SELECT * FROM finish();
ROLLBACK;
