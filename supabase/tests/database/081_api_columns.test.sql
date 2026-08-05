-- pgTAP Test: 081_api_columns.test.sql
BEGIN;
SELECT plan(6);

-- 1. Verificar columnas exactas expuestas en api.patient_directory
SELECT columns_are('api', 'patient_directory', ARRAY['id', 'organization_id', 'first_name', 'last_name', 'email', 'phone', 'status', 'created_at']);

-- 2. Confirmar ausencia de campos clínicos o sensibles en api.patient_directory
SELECT ok(NOT col_exists('api', 'patient_directory', 'birth_date'), 'api.patient_directory no expone birth_date');
SELECT ok(NOT col_exists('api', 'patient_directory', 'city'), 'api.patient_directory no expone city');
SELECT ok(NOT col_exists('api', 'patient_directory', 'nutrition_goal'), 'api.patient_directory no expone nutrition_goal');
SELECT ok(NOT col_exists('api', 'patient_directory', 'current_plan_name'), 'api.patient_directory no expone current_plan_name');

-- 3. Confirmar columnas de api.attention_inbox
SELECT columns_are('api', 'attention_inbox', ARRAY['id', 'organization_id', 'patient_id', 'response_id', 'rule_code', 'priority', 'recommended_action', 'status', 'created_at', 'patient_first_name', 'patient_last_name']);

SELECT * FROM finish();
ROLLBACK;
