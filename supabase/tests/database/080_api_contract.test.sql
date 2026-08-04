-- pgTAP Test: 080_api_contract.test.sql
BEGIN;
SELECT plan(4);

-- Verificar que el esquema api contenga las vistas requeridas (3 argumentos: schema, view, description)
SELECT has_view('api', 'current_profile', 'Vista api.current_profile existe');
SELECT has_view('api', 'current_organizations', 'Vista api.current_organizations existe');
SELECT has_view('api', 'patient_directory', 'Vista api.patient_directory existe');
SELECT has_view('api', 'attention_inbox', 'Vista api.attention_inbox existe');

SELECT * FROM finish();
ROLLBACK;
