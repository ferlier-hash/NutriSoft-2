BEGIN;
SELECT plan(13);

INSERT INTO app.organizations(id,name,slug,status)
VALUES ('89000000-0000-4000-8000-000000000184','Invitaciones profesionales','professional-invite-test','active');
INSERT INTO app.organization_subscriptions(organization_id,plan_slug,status,extra_professionals)
VALUES ('89000000-0000-4000-8000-000000000184','pro','active',0);
INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
VALUES ('89000000-0000-4000-8000-000000000184','00000000-0000-0000-0000-000000000000','authenticated','authenticated','invitee@example.test','',NULL,'{}','{}',clock_timestamp(),clock_timestamp());

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"a0000000-0000-4000-8000-000000000000","role":"authenticated"}',true);
SELECT ok(NOT has_table_privilege('authenticated','app.professional_invitations','SELECT'),'invite table cannot be read directly by authenticated users');
SELECT is((SELECT status FROM api.create_professional_invitation('89000000-0000-4000-8000-000000000184','Lic. Invitada','Invitee@example.test')),'pending','Platform Admin creates a pending invitation');
SELECT is((SELECT count(*)::integer FROM api.create_professional_invitation('89000000-0000-4000-8000-000000000184','Lic. Invitada','invitee@example.test')),1,'retry is idempotent for the same pending invitation');
SELECT throws_ok($$SELECT * FROM api.create_professional_invitation('89000000-0000-4000-8000-000000000184','Segunda invitada','second@example.test')$$,'El consultorio alcanzó el límite de profesionales de su plan.','pending invitation reserves one seat in the plan');
SELECT is((SELECT count(*)::integer FROM api.get_admin_professional_invitations('89000000-0000-4000-8000-000000000184')),1,'Platform Admin can list the clinic invitations');

SELECT set_config('request.jwt.claims','{"sub":"89000000-0000-4000-8000-000000000184","role":"authenticated"}',true);
SELECT is(api.accept_professional_invitations(),0,'unverified account cannot accept a professional invitation');
SELECT is((SELECT count(*)::integer FROM app.organization_members WHERE user_id='89000000-0000-4000-8000-000000000184'),0,'unverified account receives no membership');
RESET ROLE;
UPDATE auth.users SET email_confirmed_at=clock_timestamp() WHERE id='89000000-0000-4000-8000-000000000184';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"89000000-0000-4000-8000-000000000184","role":"authenticated"}',true);
SELECT is(api.accept_professional_invitations(),1,'verified matching email accepts the invitation');
SELECT is((SELECT role FROM app.organization_members WHERE user_id='89000000-0000-4000-8000-000000000184' AND organization_id='89000000-0000-4000-8000-000000000184'),'nutritionist','acceptance creates only the nutritionist membership in the invited clinic');
SELECT is(api.accept_professional_invitations(),0,'acceptance is idempotent on the next login');
SELECT throws_ok($$SELECT * FROM api.get_admin_professional_invitations('89000000-0000-4000-8000-000000000184')$$,'Acceso no autorizado.','a professional cannot inspect admin invitation records');

SELECT set_config('request.jwt.claims','{"sub":"a0000000-0000-4000-8000-000000000000","role":"authenticated"}',true);
SELECT is((SELECT status FROM api.get_admin_professional_invitations('89000000-0000-4000-8000-000000000184') WHERE email='invitee@example.test'),'accepted','Platform Admin can see invitation status without direct table access');
SELECT is((SELECT event_type FROM api.get_admin_audit_events(now()-interval '1 day',now()+interval '1 day','professional_invitation_changed',NULL,20,0) LIMIT 1),'professional_invitation_changed','invitation activity appears in the allowlisted admin audit');
SELECT * FROM finish();
ROLLBACK;
