BEGIN;
SELECT plan(8);

-- Synthetic audit actions plus one clinical event that must never enter the Admin feed.
INSERT INTO app.audit_logs(id,actor_id,organization_id,action,resource_type,resource_id,details,created_at)
VALUES
 ('88000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000000','88000000-0000-4000-8000-000000000099','CREATE_ORGANIZATION','organization','88000000-0000-4000-8000-000000000099','{"slug":"admin-audit-e2e"}',now()-interval '3 hours'),
 ('88000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000000','88000000-0000-4000-8000-000000000099','SET_ORGANIZATION_STATUS','organization','88000000-0000-4000-8000-000000000099','{"previous_status":"active","status":"suspended","organization_name":"Auditoría E2E temporal","organization_slug":"admin-audit-e2e"}',now()-interval '2 hours'),
 ('88000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000000','88000000-0000-4000-8000-000000000099','SET_ORGANIZATION_SUBSCRIPTION','organization_subscription_event','77000000-0000-4000-8000-000000000001','{"previous_plan_slug":"pro","next_plan_slug":"ultra","previous_status":"active","next_status":"active","extra_professionals":0,"organization_name":"Auditoría E2E temporal","organization_slug":"admin-audit-e2e"}',now()-interval '1 hour'),
 ('88000000-0000-4000-8000-000000000004','b2222222-2222-4222-8222-222222222222','88000000-0000-4000-8000-000000000099','SUBMIT_CHECKIN','check_in_response','00000000-0000-4000-8000-000000000001','{}',now()-interval '30 minutes');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"a0000000-0000-4000-8000-000000000000","role":"authenticated"}',true);

SELECT is((SELECT count(*)::integer FROM api.get_admin_audit_events(now()-interval '1 day',now()+interval '1 day',NULL,'admin-audit-e2e',50,0)),3,'Platform Admin sees only the three whitelisted platform events for this fixture');
SELECT is((SELECT event_type FROM api.get_admin_audit_events(now()-interval '1 day',now()+interval '1 day',NULL,'admin-audit-e2e',50,0) ORDER BY occurred_at DESC LIMIT 1),'subscription_changed','subscription updates appear in the unified audit feed');
SELECT is((SELECT previous_value FROM api.get_admin_audit_events(now()-interval '1 day',now()+interval '1 day','organization_status_changed','admin-audit-e2e',50,0) LIMIT 1),'active','status history includes the previous value when available');
SELECT is((SELECT total_count::integer FROM api.get_admin_audit_events(now()-interval '1 day',now()+interval '1 day','subscription_changed','admin-audit-e2e',1,0) LIMIT 1),1,'event, organization search and pagination filters work together');
SELECT is((SELECT count(*)::integer FROM api.get_admin_audit_events(now()-interval '1 day',now()+interval '1 day','organization_created','admin-audit-absent',50,0)),0,'search returns no non-matching events');
SELECT ok((SELECT bool_and(event_type IN ('organization_created','organization_status_changed','subscription_changed') AND organization_name IS NOT NULL AND organization_id='88000000-0000-4000-8000-000000000099') FROM api.get_admin_audit_events(now()-interval '1 day',now()+interval '1 day',NULL,'admin-audit-e2e',50,0)),'RPC returns only whitelisted administrative fields');
SELECT is((SELECT count(*)::integer FROM app.audit_logs),0,'Platform Admin still cannot directly read immutable audit_logs');

SELECT set_config('request.jwt.claims','{"sub":"b1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
SELECT throws_ok($$SELECT * FROM api.get_admin_audit_events(now()-interval '1 day',now()+interval '1 day',NULL,NULL,50,0)$$,'Acceso no autorizado: requiere rol platform_admin','non-admin cannot call the audit RPC');

SELECT * FROM finish();
ROLLBACK;
