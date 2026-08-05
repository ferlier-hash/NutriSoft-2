-- pgTAP Test: 090_immutability_audit.test.sql
BEGIN;
SELECT plan(4);

SELECT throws_ok(
  $$ UPDATE app.check_in_responses SET energy = 5 WHERE id = '00000000-0000-4000-8000-000000000001' $$,
  'Las respuestas de check-in son inmutables y no pueden modificarse ni eliminarse.'
);

SELECT throws_ok(
  $$ DELETE FROM app.check_in_responses WHERE id = '00000000-0000-4000-8000-000000000001' $$,
  'Las respuestas de check-in son inmutables y no pueden modificarse ni eliminarse.'
);

SELECT throws_ok(
  $$ UPDATE app.audit_logs SET action = 'HACKED' $$,
  'Los registros de auditoría son inmutables y no pueden modificarse ni eliminarse.'
);

SELECT throws_ok(
  $$ DELETE FROM app.audit_logs $$,
  'Los registros de auditoría son inmutables y no pueden modificarse ni eliminarse.'
);

SELECT * FROM finish();
ROLLBACK;
