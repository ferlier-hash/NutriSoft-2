-- Migration: preserve immutable audit identifiers when accounts or organizations are removed.
--
-- audit_logs is append-only. ON DELETE SET NULL attempted to mutate historical rows and
-- therefore conflicted with the immutability trigger. Keeping the UUIDs without foreign
-- keys preserves attribution while allowing lifecycle operations on the source entities.

ALTER TABLE app.audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_actor_id_fkey,
  DROP CONSTRAINT IF EXISTS audit_logs_organization_id_fkey;

COMMENT ON COLUMN app.audit_logs.actor_id IS
  'Historical actor UUID. Intentionally has no foreign key so immutable audit evidence survives account deletion.';

COMMENT ON COLUMN app.audit_logs.organization_id IS
  'Historical organization UUID. Intentionally has no foreign key so immutable audit evidence survives organization deletion.';
