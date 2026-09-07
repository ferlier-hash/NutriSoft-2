-- pgTAP Test: 101_audit_identity_lifecycle.test.sql
BEGIN;
SELECT plan(4);

SELECT is(
  (
    SELECT COUNT(*)::integer
    FROM pg_constraint
    WHERE conrelid = 'app.audit_logs'::regclass
      AND contype = 'f'
      AND conname = 'audit_logs_actor_id_fkey'
  ),
  0,
  'La auditoría no bloquea la baja de una cuenta por actor_id'
);

SELECT is(
  (
    SELECT COUNT(*)::integer
    FROM pg_constraint
    WHERE conrelid = 'app.audit_logs'::regclass
      AND contype = 'f'
      AND conname = 'audit_logs_organization_id_fkey'
  ),
  0,
  'La auditoría no bloquea la baja de una organización'
);

SELECT col_is_null(
  'app',
  'audit_logs',
  'actor_id',
  'actor_id admite eventos de sistema y conserva identificadores históricos'
);

SELECT col_is_null(
  'app',
  'audit_logs',
  'organization_id',
  'organization_id admite eventos globales y conserva identificadores históricos'
);

SELECT * FROM finish();
ROLLBACK;
