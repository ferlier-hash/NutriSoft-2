-- pgTAP Test: 080_api_contract.test.sql
BEGIN;
SELECT plan(4);

-- Verificar que el esquema api contenga las vistas requeridas
SELECT has_table('api', 'current_profile');
SELECT has_table('api', 'current_organizations');
SELECT has_table('api', 'patient_directory');
SELECT has_table('api', 'attention_inbox');

SELECT * FROM finish();
ROLLBACK;
