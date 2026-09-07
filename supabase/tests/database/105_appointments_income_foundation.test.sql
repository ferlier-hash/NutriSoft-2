-- pgTAP Test: Citas, notas privadas y cobros manuales sin exposición clínica.
BEGIN;
SELECT plan(15);

SELECT has_table('app', 'appointments', 'Existe la tabla interna de citas');
SELECT has_table('app', 'appointment_private_notes', 'Las notas clínicas viven en una tabla separada');
SELECT has_table('app', 'appointment_payment_movements', 'Existe el registro de movimientos manuales');
SELECT ok(
  NOT has_table_privilege('authenticated', 'app.appointment_payment_movements', 'INSERT, UPDATE, DELETE'),
  'authenticated no recibe DML directo sobre movimientos de cobro'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "b2222222-2222-4222-8222-222222222222", "role": "authenticated"}', true);

CREATE TEMP TABLE appointment_test_context AS
SELECT api.create_appointment(
  '11111111-1111-4111-8111-111111111111',
  'f1111111-1111-4111-8111-111111111111',
  'b2222222-2222-4222-8222-222222222222',
  now() + interval '2 days', 45::smallint, 'America/Argentina/Cordoba', 'in_person', 10000::numeric, 'ARS',
  'Nota privada de la consulta'
) AS appointment_id;

SELECT results_eq(
  'SELECT count(*)::integer FROM api.appointments WHERE id = (SELECT appointment_id FROM appointment_test_context)',
  ARRAY[1],
  'La profesional asignada ve su cita'
);
SELECT is(
  (SELECT payment_status FROM api.appointments WHERE id = (SELECT appointment_id FROM appointment_test_context)),
  'pending',
  'Una cita nueva comienza pendiente de pago'
);
SELECT lives_ok(
  $$ SELECT api.record_appointment_payment((SELECT appointment_id FROM appointment_test_context), 4000::numeric, 'transfer', now(), 'Primer cobro') $$,
  'Se puede registrar el primer movimiento manual'
);
SELECT is(
  (SELECT payment_status FROM api.appointments WHERE id = (SELECT appointment_id FROM appointment_test_context)),
  'partial',
  'Un cobro menor al importe deja estado parcial'
);
SELECT lives_ok(
  $$ SELECT api.record_appointment_payment((SELECT appointment_id FROM appointment_test_context), 6000::numeric, 'cash', now(), NULL::text) $$,
  'Se puede completar el cobro con un segundo movimiento'
);
SELECT is(
  (SELECT payment_status FROM api.appointments WHERE id = (SELECT appointment_id FROM appointment_test_context)),
  'paid',
  'Los movimientos acumulados marcan la cita como pagada'
);

SELECT throws_ok(
  $$ SELECT api.create_appointment('11111111-1111-4111-8111-111111111111', 'f1111111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222', now() + interval '2 days', 45::smallint, 'America/Argentina/Cordoba', 'in_person', 10000::numeric, 'ARS', NULL::text) $$,
  '23P01', NULL,
  'La base impide horarios superpuestos para una profesional'
);

SELECT set_config('request.jwt.claims', '{"sub": "b1111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);
SELECT results_eq(
  'SELECT count(*)::integer FROM api.professional_appointment_notes', ARRAY[0],
  'El responsable no clínico no ve notas privadas'
);
SELECT results_eq(
  'SELECT count(*)::integer FROM api.appointments WHERE id = (SELECT appointment_id FROM appointment_test_context)', ARRAY[1],
  'El responsable puede ver la cita operativa sin depender de datos clínicos'
);

SELECT set_config('request.jwt.claims', '{"sub": "a0000000-0000-4000-8000-000000000000", "role": "authenticated"}', true);
SELECT results_eq(
  'SELECT count(*)::integer FROM api.appointments WHERE id = (SELECT appointment_id FROM appointment_test_context)', ARRAY[0],
  'Platform Admin no ve citas de consultorios'
);
SELECT results_eq(
  'SELECT count(*)::integer FROM api.professional_appointment_notes', ARRAY[0],
  'Platform Admin no ve notas privadas'
);

SELECT * FROM finish();
ROLLBACK;
