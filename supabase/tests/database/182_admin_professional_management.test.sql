BEGIN;
SELECT plan(13);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"a0000000-0000-4000-8000-000000000000","role":"authenticated"}',true);

SELECT is((SELECT count(*)::integer FROM api.get_admin_professionals(NULL,'all',100,0) WHERE user_id='b2222222-2222-4222-8222-222222222222'),1,'admin directory contains one row per professional membership');
SELECT is((SELECT assigned_patient_count::integer FROM api.get_admin_professionals('Andrea','all',100,0) LIMIT 1),2,'directory exposes aggregate assignment count only');
SELECT is((SELECT count(*)::integer FROM app.profiles WHERE id<>auth.uid()),0,'Platform Admin still cannot read profiles other than their own');
SELECT throws_ok($$SELECT api.set_admin_professional_membership_status('11111111-1111-4111-8111-111111111111','b2222222-2222-4222-8222-222222222222','inactive')$$,
 'No se puede desactivar o cambiar el rol de un miembro con asignaciones clínicas activas','membership suspension is blocked until patient transfers are completed');
RESET ROLE;
INSERT INTO app.patient_professional_transfers(id,organization_id,patient_id,previous_professional_user_id,new_professional_user_id,read_only_until)
VALUES('18200000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','f1111111-1111-4111-8111-111111111111','b2222222-2222-4222-8222-222222222222','b3333333-3333-4333-8333-333333333333',clock_timestamp()+interval '14 days');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"a0000000-0000-4000-8000-000000000000","role":"authenticated"}',true);
SELECT throws_ok($$SELECT api.set_admin_professional_membership_status('11111111-1111-4111-8111-111111111111','b2222222-2222-4222-8222-222222222222','inactive')$$,
 'Hay transferencias con acceso de sólo lectura vigente. Esperá a que termine el plazo de 14 días antes de suspender esta membresía.','clinic suspension preserves the agreed 14-day read-only transfer window');

SELECT is(api.set_admin_professional_account_suspension('b2222222-2222-4222-8222-222222222222',true),true,'admin can suspend a professional account globally');
SELECT set_config('request.jwt.claims','{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
SELECT ok(NOT security.is_current_assigned_nutritionist('f1111111-1111-4111-8111-111111111111'),'global suspension blocks professional clinical access server-side');
SELECT ok(NOT security.is_transfer_readonly_professional('f1111111-1111-4111-8111-111111111111'),'global suspension also blocks the 14-day read-only exception');
SELECT is(api.get_current_access_context()->'memberships'->0->>'membership_status','inactive','global suspension is reflected in the authorization context');

SELECT set_config('request.jwt.claims','{"sub":"a0000000-0000-4000-8000-000000000000","role":"authenticated"}',true);
SELECT is(api.set_admin_professional_account_suspension('b2222222-2222-4222-8222-222222222222',false),true,'admin can restore a globally suspended account');
SELECT is((SELECT event_type FROM api.get_admin_audit_events(now()-interval '1 day',now()+interval '1 day','professional_account_suspension_changed',NULL,20,0) LIMIT 1),'professional_account_suspension_changed','professional access changes appear in the safe Admin audit feed');
SELECT set_config('request.jwt.claims','{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
SELECT ok(security.is_current_assigned_nutritionist('f1111111-1111-4111-8111-111111111111'),'account restoration preserves existing active membership and clinical assignment');
SELECT ok(security.is_transfer_readonly_professional('f1111111-1111-4111-8111-111111111111'),'without a global block, the transfer read-only window remains available');

SELECT * FROM finish();
ROLLBACK;
