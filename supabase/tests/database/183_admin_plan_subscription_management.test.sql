BEGIN;
SELECT plan(17);

INSERT INTO app.organizations(id,name,slug,status)
VALUES('89000000-0000-4000-8000-000000000183','Planes versionados E2E','admin-plan-version-e2e','active');
INSERT INTO app.organization_subscriptions(organization_id,plan_slug,status,extra_professionals)
VALUES('89000000-0000-4000-8000-000000000183','pro','active',0);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"a0000000-0000-4000-8000-000000000000","role":"authenticated"}',true);

SELECT ok(NOT has_table_privilege('authenticated','app.plan_catalog_versions','SELECT'),'Platform Admin cannot directly read versioned plan configuration');
SELECT is(api.save_admin_plan_configuration('pro',75,2,true,1073741824,false,true),2,'editing plan limits creates a new immutable version');
SELECT is((SELECT plan_version FROM api.get_admin_organization_subscriptions() WHERE organization_id='89000000-0000-4000-8000-000000000183'),1,'editing catalog leaves existing subscriptions on their assigned version');
SELECT is((api.get_admin_plan_configuration()->'plans'->0->>'maxActivePatients')::integer,75,'new version stores the revised patient limit');
SELECT is(api.save_admin_addon_configuration(524288000,true,true),true,'Platform Admin can configure per-professional PDF add-on unit');
SELECT throws_ok($$SELECT api.configure_organization_subscription('89000000-0000-4000-8000-000000000183','pro','active',0,11010048000,CURRENT_DATE+5)$$,NULL,NULL,'PDF add-on cannot exceed the 10 GB technical cap per professional');

SELECT ok(api.configure_organization_subscription('89000000-0000-4000-8000-000000000183','pro','active',0,1048576000,CURRENT_DATE+5) IS NOT NULL,'subscription change can be scheduled on a chosen future date');
RESET ROLE;
SELECT is((SELECT (app.subscription_at('89000000-0000-4000-8000-000000000183',CURRENT_DATE+4)).plan_version),1,'scheduled plan is not effective before its date');
SELECT is((SELECT (app.subscription_at('89000000-0000-4000-8000-000000000183',CURRENT_DATE+5)).plan_version),2,'scheduled plan becomes effective on the selected date independent of cron timing');
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT api.configure_organization_subscription('89000000-0000-4000-8000-000000000183','ultra','active',0,0,CURRENT_DATE+10)$$,NULL,NULL,'only one pending scheduled change is allowed per organization');
SELECT is(api.cancel_organization_subscription_schedule((SELECT scheduled_change_id FROM api.get_admin_organization_subscriptions() WHERE organization_id='89000000-0000-4000-8000-000000000183')),true,'Platform Admin can cancel a future change');
SELECT is((SELECT entry_state FROM api.get_admin_organization_subscription_history('89000000-0000-4000-8000-000000000183') WHERE event_kind='scheduled' LIMIT 1),'cancelled','cancelled schedule remains visible in subscription history');
SELECT ok(api.configure_organization_subscription('89000000-0000-4000-8000-000000000183','pro','active',0,1048576000,CURRENT_DATE) IS NOT NULL,'subscription can receive a current add-on amount in exact bytes');
SELECT is(api.save_admin_addon_configuration(629145600,true,true),true,'PDF add-on unit can later change without editing existing subscriptions');
SELECT is(api.configure_organization_subscription('89000000-0000-4000-8000-000000000183','pro','active',0,1048576000,CURRENT_DATE),NULL::uuid,'unchanged byte amount remains valid even when no longer a multiple of the new unit');
SELECT is((SELECT library_extra_bytes_per_professional FROM api.get_admin_organization_subscriptions() WHERE organization_id='89000000-0000-4000-8000-000000000183'),1048576000::bigint,'catalog unit change does not inflate existing professional storage extras');

SELECT set_config('request.jwt.claims','{"sub":"b1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
SELECT throws_ok($$SELECT api.save_admin_plan_configuration('ultra',NULL,10,false,2147483648,false,true)$$,NULL,NULL,'non-admin cannot change plan limits');

SELECT * FROM finish();
ROLLBACK;
