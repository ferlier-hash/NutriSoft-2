-- Migration: 20260804000001_create_schemas_and_security.sql
-- Description: Creación de esquemas app, security, api y asignación de permisos controlados para RLS

-- 1. Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pgtap";

-- 2. Esquemas diferenciados (SCHEMA-01)
CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS security;
CREATE SCHEMA IF NOT EXISTS api;

-- 3. Revocar privilegios inseguros por defecto en public (SCHEMA-02, SCHEMA-03)
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA app FROM PUBLIC;
REVOKE ALL ON SCHEMA security FROM PUBLIC;
REVOKE ALL ON SCHEMA api FROM PUBLIC;

-- 4. Otorgar permisos de uso sobre los esquemas a authenticated y service_role (SCHEMA-04)
GRANT USAGE ON SCHEMA app TO authenticated, service_role;
GRANT USAGE ON SCHEMA security TO authenticated, service_role;
GRANT USAGE ON SCHEMA api TO authenticated, service_role;

-- Permisos sobre las entidades de los esquemas (para evaluar RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO authenticated, service_role;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA security TO authenticated, service_role;

GRANT SELECT ON ALL TABLES IN SCHEMA api TO authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA api TO authenticated, service_role;

-- Privilegios por defecto para futuras entidades
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA security GRANT EXECUTE ON FUNCTIONS TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA api GRANT SELECT ON TABLES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA api GRANT EXECUTE ON FUNCTIONS TO authenticated, service_role;
