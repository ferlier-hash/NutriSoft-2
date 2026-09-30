BEGIN;
SELECT plan(33);

INSERT INTO app.organizations(id,name,slug,status)
VALUES('89000000-0000-4000-8000-000000000001','Ingresos E2E temporal','admin-revenue-e2e','active');
INSERT INTO app.organization_subscriptions(organization_id,plan_slug,status,extra_professionals)
VALUES('89000000-0000-4000-8000-000000000001','pro','active',0);
INSERT INTO app.organizations(id,name,slug,status)
VALUES('89000000-0000-4000-8000-000000000002','Tarifa Programada E2E','admin-scheduled-term-e2e','active');
INSERT INTO app.organization_subscriptions(organization_id,plan_slug,status,extra_professionals)
VALUES('89000000-0000-4000-8000-000000000002','pro','active',0);
INSERT INTO app.organizations(id,name,slug,status)
VALUES('89000000-0000-4000-8000-000000000003','Ciclo Flexible E2E','admin-flexible-cycle-e2e','active');
INSERT INTO app.organization_subscriptions(organization_id,plan_slug,status,extra_professionals)
VALUES('89000000-0000-4000-8000-000000000003','pro','active',0);
INSERT INTO app.organizations(id,name,slug,status)
VALUES('89000000-0000-4000-8000-000000000004','Prórroga Manual E2E','admin-due-date-e2e','active');
INSERT INTO app.organization_subscriptions(organization_id,plan_slug,status,extra_professionals)
VALUES('89000000-0000-4000-8000-000000000004','pro','active',0);
INSERT INTO app.organizations(id,name,slug,status)
VALUES('89000000-0000-4000-8000-000000000005','Sin suscripción E2E','admin-unsubscribed-e2e','active');

SELECT is((SELECT count(*)::integer FROM cron.job WHERE jobname='admin-organization-monthly-snapshot'),1,'monthly snapshot job is scheduled exactly once');
SELECT ok(app.capture_admin_organization_monthly_snapshot(date '2026-06-01')>0,'snapshot captures aggregate platform state for a month');
SELECT is((SELECT customer_active FROM app.admin_organization_monthly_snapshots WHERE snapshot_month=date '2026-06-01' AND organization_id='89000000-0000-4000-8000-000000000005'),false,'organization without subscription is recorded as inactive');
SELECT is(app.capture_admin_organization_monthly_snapshot(date '2026-06-01'),0,'re-running the same month is idempotent and leaves the historical cut unchanged');
UPDATE app.organizations SET status='suspended' WHERE id='89000000-0000-4000-8000-000000000001';
SELECT ok(app.capture_admin_organization_monthly_snapshot(date '2026-07-01')>0,'next monthly snapshot captures current aggregate state');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"a0000000-0000-4000-8000-000000000000","role":"authenticated"}',true);

SELECT is((SELECT retention_rate FROM api.get_admin_organization_retention_report(24) WHERE snapshot_month=date '2026-06-01'),NULL::numeric,'baseline month has no invented retention comparison');
SELECT ok((SELECT churned_customers>=1 AND previous_active_customers IS NOT NULL FROM api.get_admin_organization_retention_report(24) WHERE snapshot_month=date '2026-07-01'),'retention compares the previous active cohort and counts a suspended customer as churned');
SELECT ok((SELECT retained_customers+churned_customers=previous_active_customers AND retention_rate=round(retained_customers::numeric/previous_active_customers*100,2) FROM api.get_admin_organization_retention_report(24) WHERE snapshot_month=date '2026-07-01'),'retention percentage is derived from retained customers over the previous month cohort');
SELECT ok(NOT has_table_privilege('authenticated','app.admin_organization_monthly_snapshots','SELECT'),'Platform Admin cannot directly read monthly organization snapshot rows');
SELECT ok(NOT has_table_privilege('authenticated','app.organization_commercial_terms','SELECT'),'Platform Admin cannot directly read commercial tariff rows');
SELECT ok(NOT has_table_privilege('authenticated','app.organization_commercial_receipts','SELECT'),'Platform Admin cannot directly read commercial receipt rows');

SELECT is(api.set_admin_organization_commercial_term('89000000-0000-4000-8000-000000000001','pro','monthly',1200,'ARS',date '2026-06-01') IS NOT NULL,true,'Platform Admin can record a manual monthly tariff');
SELECT is(api.set_admin_organization_commercial_term('89000000-0000-4000-8000-000000000001','ultra','yearly',15000,'ARS',date '2026-08-01') IS NOT NULL,true,'a negotiated annual tariff creates a new version');
SELECT ok(api.set_admin_organization_commercial_term('89000000-0000-4000-8000-000000000002','custom','monthly',2200,'USD',CURRENT_DATE+30) IS NOT NULL,'Platform Admin can schedule a future tariff on a flexible date');
SELECT ok((SELECT term_amount=2200 AND effective_from=CURRENT_DATE+30 FROM api.get_admin_platform_revenue_report(CURRENT_DATE,CURRENT_DATE+1) WHERE organization_id='89000000-0000-4000-8000-000000000002'),'scheduled tariff remains visible in the report before it becomes effective');
SELECT ok(api.set_admin_organization_commercial_term('89000000-0000-4000-8000-000000000002','pro','monthly',2300,'USD',CURRENT_DATE+2) IS NOT NULL,'a future tariff schedule can be moved and replaced');
SELECT ok((SELECT count(*)=2 AND count(*) FILTER(WHERE cancelled_at IS NOT NULL)=1 AND count(*) FILTER(WHERE effective_from=CURRENT_DATE+2 AND cancelled_at IS NULL)=1 FROM jsonb_to_recordset((SELECT term_history FROM api.get_admin_platform_revenue_report(CURRENT_DATE,CURRENT_DATE+1) WHERE organization_id='89000000-0000-4000-8000-000000000002')) AS t(effective_from date,cancelled_at timestamptz)),'a replaced schedule remains visible as cancelled history and the new date is active');

SELECT ok(api.set_admin_organization_commercial_term('89000000-0000-4000-8000-000000000003','pro','monthly',3200,'ARS',CURRENT_DATE) IS NOT NULL,'tariffs support a flexible start date such as the 15th or 28th');
SELECT ok(api.record_admin_organization_commercial_receipt(
  '89000000-0000-4000-8000-000000000003',
  (SELECT term_id FROM api.get_admin_platform_revenue_report(CURRENT_DATE,CURRENT_DATE+1) WHERE organization_id='89000000-0000-4000-8000-000000000003'),
  '99000000-0000-4000-8000-000000000003',3200,'ARS',CURRENT_DATE,CURRENT_DATE,
  ((date_trunc('month',CURRENT_DATE::timestamp)+interval '1 month')::date
   +least(extract(day FROM CURRENT_DATE)::integer,extract(day FROM ((date_trunc('month',CURRENT_DATE::timestamp)+interval '2 month - 1 day')::date))::integer)-1)-1
) IS NOT NULL,'manual receipt records a full cycle from the chosen start day');
SELECT throws_ok($$SELECT api.set_admin_organization_commercial_term('89000000-0000-4000-8000-000000000003','ultra','monthly',4500,'ARS',CURRENT_DATE+5)$$,
  NULL,NULL,'changing a tariff cannot overlap a full cycle already received');
SELECT ok((SELECT term_history @> '[{"plan":"pro","billing_frequency":"monthly","amount":1200,"currency":"ARS","effective_from":"2026-06-01","effective_to":"2026-07-31"}]'::jsonb FROM api.get_admin_platform_revenue_report(date '2026-09-01',date '2026-10-01') WHERE organization_id='89000000-0000-4000-8000-000000000001'),'previous tariff history ends the day before the new effective date');

SELECT is(
  api.record_admin_organization_commercial_receipt('89000000-0000-4000-8000-000000000001',(SELECT term_id FROM api.get_admin_platform_revenue_report(date '2026-09-01',date '2026-10-01') WHERE organization_id='89000000-0000-4000-8000-000000000001'),'99000000-0000-4000-8000-000000000001',15000,'ARS',date '2026-09-20',date '2026-08-01',date '2027-07-31'),
  api.record_admin_organization_commercial_receipt('89000000-0000-4000-8000-000000000001',(SELECT term_id FROM api.get_admin_platform_revenue_report(date '2026-09-01',date '2026-10-01') WHERE organization_id='89000000-0000-4000-8000-000000000001'),'99000000-0000-4000-8000-000000000001',15000,'ARS',date '2026-09-20',date '2026-08-01',date '2027-07-31'),
  'retries of a recorded receipt are idempotent'
);
SELECT ok((SELECT term_history @> '[{"plan":"ultra","billing_frequency":"yearly","amount":15000,"currency":"ARS","effective_from":"2026-08-01"}]'::jsonb AND received_by_currency @> '[{"currency":"ARS","amount":15000,"receipt_count":1}]'::jsonb FROM api.get_admin_platform_revenue_report(date '2026-09-01',date '2026-10-01') WHERE organization_id='89000000-0000-4000-8000-000000000001'),'commercial report returns tariff history and received totals separately by currency');
SELECT is((SELECT count(*)::integer FROM api.get_admin_platform_receipts(date '2026-09-01',date '2026-10-01',50,0) WHERE organization_id='89000000-0000-4000-8000-000000000001'),1,'receipt movements can be reviewed in the selected period');
SELECT is(api.void_admin_organization_commercial_receipt((SELECT receipt_id FROM api.get_admin_platform_receipts(date '2026-09-01',date '2026-10-01',50,0) WHERE organization_id='89000000-0000-4000-8000-000000000001' LIMIT 1)),true,'an erroneous receipt is voided without deleting its history');
SELECT is((SELECT status FROM api.get_admin_platform_receipts(date '2026-09-01',date '2026-10-01',50,0) WHERE organization_id='89000000-0000-4000-8000-000000000001' LIMIT 1),'voided','voided receipt remains visible and auditable');

SELECT ok(api.set_admin_organization_commercial_term('89000000-0000-4000-8000-000000000004','pro','monthly',1800,'ARS',CURRENT_DATE-5) IS NOT NULL,'a past-due monthly cycle can be reviewed by its original start date');
SELECT is((SELECT due_status FROM api.get_admin_platform_billing_report(CURRENT_DATE-6,CURRENT_DATE+1) WHERE organization_id='89000000-0000-4000-8000-000000000004' LIMIT 1),'overdue','an unpaid cycle is overdue after its base due date');
SELECT ok(api.extend_admin_commercial_billing_due_date(
  (SELECT term_id FROM api.get_admin_platform_revenue_report(CURRENT_DATE-6,CURRENT_DATE+1) WHERE organization_id='89000000-0000-4000-8000-000000000004'),
  CURRENT_DATE-5,CURRENT_DATE+7) IS NOT NULL,'Platform Admin can manually extend one cycle due date');
SELECT ok((SELECT due_status='grace' AND due_date=CURRENT_DATE+7 AND extension_count=1 AND latest_extension_at IS NOT NULL
  FROM api.get_admin_platform_billing_report(CURRENT_DATE-6,CURRENT_DATE+1) WHERE organization_id='89000000-0000-4000-8000-000000000004' LIMIT 1),
  'the report shows manual grace and auditable extension timestamp');

SELECT set_config('request.jwt.claims','{"sub":"b1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
SELECT throws_ok($$SELECT * FROM api.get_admin_organization_retention_report(24)$$,'Acceso no autorizado: requiere rol platform_admin','non-admin cannot read retention reports');
SELECT throws_ok($$SELECT api.set_admin_organization_commercial_term('89000000-0000-4000-8000-000000000001','pro','monthly',100,'ARS',CURRENT_DATE)$$,'Sólo Platform Admin puede configurar tarifas.','non-admin cannot edit commercial terms');
SELECT throws_ok($$SELECT api.extend_admin_commercial_billing_due_date('89000000-0000-4000-8000-000000000004',CURRENT_DATE-5,CURRENT_DATE+14)$$,'Sólo Platform Admin puede otorgar prórrogas comerciales.','non-admin cannot grant commercial grace');

SELECT * FROM finish();
ROLLBACK;
