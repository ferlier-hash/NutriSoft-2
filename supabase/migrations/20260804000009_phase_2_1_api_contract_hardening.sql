-- Migration: 20260804000009_phase_2_1_api_contract_hardening.sql
-- Description: Reducción de superficie expuesta en api.patient_directory (ASSIST-01..06, API-03, API-04)

-- PostgreSQL no permite retirar columnas mediante CREATE OR REPLACE VIEW.
-- La vista no tiene objetos dependientes en las migraciones anteriores, por lo
-- que se recrea explícitamente y sin CASCADE para fallar de forma segura si una
-- dependencia futura llegara a incorporarse.
DROP VIEW api.patient_directory;

CREATE VIEW api.patient_directory
WITH (security_invoker = true) AS
SELECT p.id, p.organization_id, p.first_name, p.last_name, p.email, p.phone, p.status, p.created_at
FROM app.patients p;

GRANT SELECT ON api.patient_directory TO authenticated;
