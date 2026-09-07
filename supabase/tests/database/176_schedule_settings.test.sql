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
SELECT set_config('request.jwt.claims','{"sub":"d1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
SELECT throws_ok($$SELECT api.get_my_schedule_settings(org) FROM schedule_fixture$$,NULL,NULL,'Patient cannot read professional settings');
SELECT is((SELECT (api.get_patient_appointment_policy(id)->>'cancellationNoticeHours')::int FROM late_appointment),72,'Patient sees only authorized policy');
SELECT lives_ok($$SELECT api.request_patient_appointment_change(id,'cancel') FROM late_appointment$$,'Late cancellation remains permitted as request');
SELECT is((SELECT status FROM api.patient_appointments WHERE id=(SELECT id FROM late_appointment)),'confirmed','Request does not cancel appointment');
SELECT set_config('request.jwt.claims','{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
SELECT is((SELECT is_late FROM api.professional_pending_appointment_changes WHERE appointment_id=(SELECT id FROM late_appointment)),true,'Professional sees late badge flag');
SELECT set_config('request.jwt.claims','{"sub":"a0000000-0000-4000-8000-000000000000","role":"authenticated"}',true);
SELECT throws_ok($$SELECT api.get_my_schedule_settings(org) FROM schedule_fixture$$,NULL,NULL,'Platform Admin denied');
SELECT throws_ok($$SELECT api.get_patient_appointment_policy(id) FROM late_appointment$$,NULL,NULL,'Platform Admin cannot read patient policy');
SELECT * FROM finish();
ROLLBACK;
