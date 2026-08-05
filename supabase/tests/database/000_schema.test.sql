-- pgTAP Test: 000_schema.test.sql
BEGIN;
SELECT plan(10);

SELECT has_schema('app', 'Esquema app existe');
SELECT has_schema('security', 'Esquema security existe');
SELECT has_schema('api', 'Esquema api existe');

SELECT has_table('app', 'organizations', 'Tabla app.organizations existe');
SELECT has_table('app', 'profiles', 'Tabla app.profiles existe');
SELECT has_table('app', 'user_platform_roles', 'Tabla app.user_platform_roles existe');
SELECT has_table('app', 'organization_members', 'Tabla app.organization_members existe');
SELECT has_table('app', 'patients', 'Tabla app.patients existe');
SELECT has_table('app', 'check_in_responses', 'Tabla app.check_in_responses existe');
SELECT has_table('app', 'audit_logs', 'Tabla app.audit_logs existe');

SELECT * FROM finish();
ROLLBACK;
