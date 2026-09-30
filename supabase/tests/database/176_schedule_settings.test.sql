BEGIN;
SELECT no_plan();
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
CREATE TEMP TABLE schedule_fixture AS SELECT
 '11111111-1111-4111-8111-111111111111'::uuid org,
 'f1111111-1111-4111-8111-111111111111'::uuid patient,
 (date_trunc('week',now()+interval '200 days')::date+time '10:00') AT TIME ZONE 'America/Argentina/Cordoba' start_at,
 '{"timeZone":"America/Argentina/Cordoba","enforceHours":true,"intervals":[{"day":1,"start":"09:00","end":"13:00"},{"day":1,"start":"14:00","end":"18:00"}],"blocks":[],"gapMinutes":10,"cancellationNoticeHours":72,"rescheduleNoticeHours":24}'::jsonb config;
SELECT lives_ok($$SELECT api.save_my_schedule_settings(org,config) FROM schedule_fixture$$,'Professional saves own split schedule');
SELECT throws_ok($$SELECT api.save_my_schedule_settings(org,config) FROM schedule_fixture$$,NULL,NULL,'Stale version rejected');
SELECT throws_ok($$SELECT * FROM app.professional_schedule_settings$$,NULL,NULL,'No direct table access');
SELECT throws_ok($$SELECT api.get_my_schedule_settings('22222222-2222-4222-8222-222222222222')$$,NULL,NULL,'Cross tenant denied');
CREATE TEMP TABLE scheduled_appointment AS SELECT api.create_professional_appointment(org,patient,start_at,45::smallint,'America/Argentina/Cordoba','in_person',0,'ARS') id FROM schedule_fixture;
SELECT throws_ok($$SELECT api.create_professional_appointment(org,patient,start_at+interval '3 hours',45::smallint,'America/Argentina/Cordoba','in_person',0,'ARS') FROM schedule_fixture$$,NULL,NULL,'Lunch break rejected');
SELECT throws_ok($$SELECT api.create_professional_appointment(org,patient,start_at+interval '2 hours 45 minutes',45::smallint,'America/Argentina/Cordoba','in_person',0,'ARS') FROM schedule_fixture$$,NULL,NULL,'Full appointment must fit inside interval');
SELECT throws_ok($$SELECT api.create_professional_appointment(org,patient,start_at+interval '50 minutes',45::smallint,'America/Argentina/Cordoba','in_person',0,'ARS') FROM schedule_fixture$$,NULL,NULL,'Insufficient gap rejected');
SELECT lives_ok($$SELECT api.create_professional_appointment(org,patient,start_at+interval '55 minutes',45::smallint,'America/Argentina/Cordoba','in_person',0,'ARS') FROM schedule_fixture$$,'Exact gap accepted');
SELECT throws_ok($$SELECT api.save_my_schedule_settings(org,jsonb_set(config,'{blocks}',jsonb_build_array(jsonb_build_object('kind','vacation','startsAt',start_at,'endsAt',start_at+interval '1 day','note','test'))),(api.get_my_schedule_settings(org)->>'updated_at')::timestamptz) FROM schedule_fixture$$,NULL,NULL,'Block cannot overlap active appointment');
SELECT throws_ok($$SELECT api.save_my_schedule_settings(org,jsonb_set(config,'{intervals}',config->'intervals'||'[{"day":1,"start":"12:00","end":"14:00"}]'::jsonb),(api.get_my_schedule_settings(org)->>'updated_at')::timestamptz) FROM schedule_fixture$$,NULL,NULL,'Overlapping intervals rejected');
SELECT throws_ok($$SELECT api.save_my_schedule_settings(org,jsonb_set(config,'{timeZone}','"Not/AZone"'),(api.get_my_schedule_settings(org)->>'updated_at')::timestamptz) FROM schedule_fixture$$,NULL,NULL,'Invalid time zone rejected');
SELECT lives_ok($$SELECT api.save_my_schedule_settings(org,jsonb_set(config,'{blocks}',jsonb_build_array(jsonb_build_object('kind','vacation','startsAt',start_at+interval '4 hours','endsAt',start_at+interval '5 hours','note','test'))),(api.get_my_schedule_settings(org)->>'updated_at')::timestamptz) FROM schedule_fixture$$,'Save non-conflicting vacation');
SELECT throws_ok($$SELECT api.create_professional_appointment(org,patient,start_at+interval '4 hours',45::smallint,'America/Argentina/Cordoba','in_person',0,'ARS') FROM schedule_fixture$$,NULL,NULL,'Vacation rejects new appointment');
SELECT throws_ok($$SELECT api.reschedule_professional_appointment(id,start_at+interval '4 hours',45::smallint,'in_person',0) FROM scheduled_appointment,schedule_fixture$$,NULL,NULL,'Reschedule validates same rules');
SELECT is((SELECT status FROM api.appointments WHERE id=(SELECT id FROM scheduled_appointment)),'confirmed','Failed reschedule preserves original');
-- Tightening hours does not rewrite old appointments; non-scheduling edits still work.
SELECT lives_ok($$SELECT api.save_my_schedule_settings(org,jsonb_set(config,'{intervals}','[{"day":1,"start":"14:00","end":"18:00"}]'),(api.get_my_schedule_settings(org)->>'updated_at')::timestamptz) FROM schedule_fixture$$,'Changing hours preserves existing appointments');
SELECT lives_ok($$SELECT api.update_income_appointment_price(id,updated_at,123) FROM api.appointments WHERE id=(SELECT id FROM scheduled_appointment)$$,'Price correction remains possible outside new hours');
SELECT lives_ok($$SELECT api.save_my_schedule_settings(org,jsonb_set(config,'{enforceHours}','false'),(api.get_my_schedule_settings(org)->>'updated_at')::timestamptz) FROM schedule_fixture$$,'Explicitly disable hours while preserving policy');
CREATE TEMP TABLE late_appointment AS SELECT api.create_professional_appointment(org,patient,now()+interval '2 days',45::smallint,'America/Argentina/Cordoba','virtual',0,'ARS') id FROM schedule_fixture;
CREATE TEMP TABLE outcome_appointments AS
  SELECT api.create_professional_appointment(org,patient,now()+interval '10 days',45::smallint,'America/Argentina/Cordoba','virtual',900,'ARS') completed_id,
         api.create_professional_appointment(org,patient,now()+interval '11 days',45::smallint,'America/Argentina/Cordoba','virtual',900,'ARS') no_show_id
  FROM schedule_fixture;
SELECT throws_ok($$SELECT api.set_professional_appointment_outcome(completed_id,'completed') FROM outcome_appointments$$,NULL,NULL,'Future appointment cannot be closed early');
SELECT set_config('request.jwt.claims','{"sub":"d1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
CREATE TEMP TABLE available_patient_slot AS SELECT starts_at FROM api.get_patient_appointment_slots('11111111-1111-4111-8111-111111111111',45::smallint) LIMIT 1;
SELECT throws_ok($$SELECT api.request_patient_appointment('11111111-1111-4111-8111-111111111111',(SELECT starts_at+interval '1 day' FROM available_patient_slot),45::smallint,'virtual')$$,NULL,NULL,'Patient cannot request a time outside published availability');
CREATE TEMP TABLE requested_appointment AS SELECT api.request_patient_appointment('11111111-1111-4111-8111-111111111111',starts_at,45::smallint,'virtual') id FROM available_patient_slot;
SELECT is((SELECT status FROM api.patient_appointments WHERE id=(SELECT id FROM requested_appointment)),'requested','Patient booking is an explicit pending request');
SELECT throws_ok($$SELECT api.request_patient_appointment('22222222-2222-4222-8222-222222222222',now()+interval '8 days',45::smallint,'virtual')$$,NULL,NULL,'Patient cannot book for an unlinked clinic');
SELECT throws_ok($$SELECT api.get_my_schedule_settings(org) FROM schedule_fixture$$,NULL,NULL,'Patient cannot read professional settings');
SELECT is((SELECT (api.get_patient_appointment_policy(id)->>'cancellationNoticeHours')::int FROM late_appointment),72,'Patient sees only authorized policy');
SELECT lives_ok($$SELECT api.request_patient_appointment_change(id,'cancel') FROM late_appointment$$,'Late cancellation remains permitted as request');
SELECT is((SELECT status FROM api.patient_appointments WHERE id=(SELECT id FROM late_appointment)),'confirmed','Request does not cancel appointment');
SELECT set_config('request.jwt.claims','{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
SELECT lives_ok($$SELECT api.confirm_patient_requested_appointment(id,1250) FROM requested_appointment$$,'Assigned professional confirms a patient request');
SELECT is((SELECT status FROM api.appointments WHERE id=(SELECT id FROM requested_appointment)),'confirmed','Confirmation changes the appointment state');
SELECT lives_ok($$SELECT api.save_appointment_private_note(id,'Nota privada de prueba',NULL) FROM requested_appointment$$,'Assigned professional can save a private note');
SELECT is((SELECT note FROM api.professional_appointment_notes WHERE appointment_id=(SELECT id FROM requested_appointment)),'Nota privada de prueba','Professional can read own private note');
SELECT throws_ok($$SELECT api.save_appointment_private_note(id,'   ',(SELECT updated_at FROM api.professional_appointment_notes WHERE appointment_id=id)) FROM requested_appointment$$,NULL,NULL,'Blank private note rejected');
SELECT is((SELECT is_late FROM api.professional_pending_appointment_changes WHERE appointment_id=(SELECT id FROM late_appointment)),true,'Professional sees late badge flag');
SELECT set_config('request.jwt.claims','{"sub":"d1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
SELECT is((SELECT count(*)::int FROM app.appointment_notifications WHERE appointment_id=(SELECT id FROM requested_appointment) AND recipient_user_id='d1111111-1111-4111-8111-111111111111' AND kind='appointment_confirmed'),1,'Patient receives confirmation notification');
SELECT is((SELECT count(*)::int FROM api.professional_appointment_notes WHERE appointment_id=(SELECT id FROM requested_appointment)),0,'Patient cannot read private clinical note');
SELECT throws_ok($$SELECT api.save_appointment_private_note(id,'Unauthorized note',NULL) FROM requested_appointment$$,NULL,NULL,'Patient cannot write private note');
SELECT set_config('request.jwt.claims','{"sub":"a0000000-0000-4000-8000-000000000000","role":"authenticated"}',true);
SELECT is((SELECT count(*)::int FROM api.get_patient_appointment_slots('11111111-1111-4111-8111-111111111111',45::smallint)),0,'Platform Admin receives no patient booking availability');
SELECT throws_ok($$SELECT api.request_patient_appointment('11111111-1111-4111-8111-111111111111',now()+interval '9 days',45::smallint,'virtual')$$,NULL,NULL,'Platform Admin cannot create clinical appointment requests');
SELECT is((SELECT count(*)::int FROM api.professional_appointment_notes WHERE appointment_id=(SELECT id FROM requested_appointment)),0,'Platform Admin cannot read private clinical note');
SELECT throws_ok($$SELECT api.get_my_schedule_settings(org) FROM schedule_fixture$$,NULL,NULL,'Platform Admin denied');
SELECT throws_ok($$SELECT api.get_patient_appointment_policy(id) FROM late_appointment$$,NULL,NULL,'Platform Admin cannot read patient policy');
SELECT throws_ok($$SELECT api.set_professional_appointment_outcome(completed_id,'completed') FROM outcome_appointments$$,NULL,NULL,'Platform Admin cannot close a clinical appointment');
GRANT SELECT ON outcome_appointments TO service_role;
SET LOCAL ROLE service_role;
WITH target AS (
  SELECT id, clock_timestamp() - CASE WHEN id=(SELECT completed_id FROM outcome_appointments) THEN interval '2 hours' ELSE interval '1 hour' END starts_at
  FROM app.appointments
  WHERE id IN (SELECT completed_id FROM outcome_appointments UNION ALL SELECT no_show_id FROM outcome_appointments)
)
UPDATE app.appointments a SET starts_at=target.starts_at,ends_at=target.starts_at+interval '45 minutes'
FROM target WHERE a.id=target.id;
RESET ROLE;
SELECT set_config('request.jwt.claims','{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
SELECT lives_ok($$SELECT api.set_professional_appointment_outcome(completed_id,'completed') FROM outcome_appointments$$,'Assigned professional closes a started appointment as completed');
SELECT throws_ok($$SELECT api.set_professional_appointment_outcome(no_show_id,'no_show','pending') FROM outcome_appointments$$,NULL,NULL,'No-show with pending billing requires an amount');
SELECT lives_ok($$SELECT api.set_professional_appointment_outcome(no_show_id,'no_show','pending',750) FROM outcome_appointments$$,'Assigned professional marks no-show with a manual pending amount');
SELECT is((SELECT status FROM api.appointments WHERE id=(SELECT completed_id FROM outcome_appointments)),'completed','Completed state is persisted');
SELECT is((SELECT status FROM api.appointments WHERE id=(SELECT no_show_id FROM outcome_appointments)),'no_show','No-show state is persisted');
SELECT is((SELECT quoted_amount FROM api.appointments WHERE id=(SELECT no_show_id FROM outcome_appointments)),750::numeric,'No-show pending amount is recorded without processing payment');
SELECT is((SELECT count(*)::int FROM app.audit_logs WHERE resource_id=(SELECT no_show_id FROM outcome_appointments) AND action='MARK_PROFESSIONAL_APPOINTMENT_NO_SHOW'),1,'No-show transition is audited without clinical details');
SELECT * FROM finish();
ROLLBACK;
