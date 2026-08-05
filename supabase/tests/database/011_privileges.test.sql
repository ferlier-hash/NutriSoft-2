-- pgTAP Test: 011_privileges.test.sql
BEGIN;
SELECT plan(6);

-- 1. authenticated no tiene INSERT directo en app.check_in_responses
SELECT ok(NOT has_table_privilege('authenticated', 'app.check_in_responses', 'INSERT'), 'authenticated no puede hacer INSERT directo en check_in_responses');

-- 2. authenticated no tiene UPDATE directo en app.alerts
SELECT ok(NOT has_table_privilege('authenticated', 'app.alerts', 'UPDATE'), 'authenticated no puede hacer UPDATE directo en alerts');

-- 3. authenticated no tiene INSERT en app.patients
SELECT ok(NOT has_table_privilege('authenticated', 'app.patients', 'INSERT'), 'authenticated no puede hacer INSERT directo en patients');

-- 4. authenticated no tiene DELETE en app.patients
SELECT ok(NOT has_table_privilege('authenticated', 'app.patients', 'DELETE'), 'authenticated no puede hacer DELETE directo en patients');

-- 5. authenticated no tiene INSERT en app.audit_logs
SELECT ok(NOT has_table_privilege('authenticated', 'app.audit_logs', 'INSERT'), 'authenticated no puede hacer INSERT directo en audit_logs');

-- 6. authenticated no tiene UPDATE en app.organizations
SELECT ok(NOT has_table_privilege('authenticated', 'app.organizations', 'UPDATE'), 'authenticated no puede hacer UPDATE directo en organizations');

SELECT * FROM finish();
ROLLBACK;
