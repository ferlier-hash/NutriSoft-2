-- Migration: 20260805000010_phase_2_1_1_default_privileges.sql
-- Description: Revocación de privilegios por defecto inseguros para authenticated (PRIV-01 a PRIV-04)

ALTER DEFAULT PRIVILEGES IN SCHEMA app
  REVOKE INSERT, UPDATE, DELETE ON TABLES FROM authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA app
  REVOKE USAGE, SELECT ON SEQUENCES FROM authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA security
  REVOKE EXECUTE ON FUNCTIONS FROM authenticated;
