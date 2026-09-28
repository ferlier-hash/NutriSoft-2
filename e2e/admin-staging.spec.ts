import { expect, test } from '@playwright/test';
import { authenticateStagingRole } from './support/auth';

test.describe('Platform Admin en Supabase staging (sólo lectura)', () => {
  test('abre resumen, consultorios y reporte real sin exponer detalle clínico', async ({ page }) => {
    const reportPayloads: unknown[] = [];
    page.on('response', async response => {
      if (!response.url().includes('/rest/v1/rpc/get_admin_')) return;
      try {
        reportPayloads.push({ endpoint: response.url(), body: await response.json() });
      } catch {
        // El fallo de formato lo reportan las aserciones de contrato de abajo.
      }
    });

    await authenticateStagingRole(page, 'admin');
    await page.goto('/#/admin');
    await expect(page.getByRole('heading', { name: 'Resumen real de plataforma' })).toBeVisible();
    await expect(page.getByText('Privacidad por diseño')).toBeVisible();

    await page.goto('/#/admin/organizations');
    await expect(page.getByRole('heading', { name: 'Consultorios registrados' })).toBeVisible();
    await expect(page.getByLabel('Estado')).toBeVisible();

    await page.goto('/#/admin/usage');
    await expect(page.getByRole('heading', { name: 'Reporte por consultorio' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Datos agregados, sin detalle clínico' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Detalle numérico por consultorio' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Retención y evolución mensual' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Ingresos de NutriSoft' })).toBeVisible();
    await expect(page.getByLabel('Filtros del reporte')).toBeVisible();

    await expect.poll(() => reportPayloads.filter(item => isAdminReport(item)).length).toBeGreaterThanOrEqual(2);
    for (const payload of reportPayloads.filter(item => isAdminReport(item))) assertAggregatePayload(payload);
    await expect.poll(() => reportPayloads.some(item => isAdminRetention(item))).toBe(true);
    await expect.poll(() => reportPayloads.some(item => isPlatformRevenue(item))).toBe(true);
    await expect.poll(() => reportPayloads.some(item => isPlatformReceipts(item))).toBe(true);
    for (const payload of reportPayloads.filter(item => isAdminRetention(item) || isPlatformRevenue(item) || isPlatformReceipts(item))) assertAggregatePayload(payload);

    await page.goto('/#/admin/audit');
    await expect(page.getByRole('heading', { name: 'Auditoría administrativa' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sólo actividad administrativa de la plataforma' })).toBeVisible();
    await expect(page.getByText(/actor: Platform Admin/)).toBeVisible();
    await expect.poll(() => reportPayloads.some(item => isAdminAudit(item))).toBe(true);
    for (const payload of reportPayloads.filter(item => isAdminAudit(item))) assertAggregatePayload(payload);
  });

  test('un usuario sin rol de plataforma no abre el portal Admin', async ({ page }) => {
    await authenticateStagingRole(page, 'nonadmin');
    await page.goto('/#/admin/usage');
    await expect(page).not.toHaveURL(/#\/admin(?:\/|$)/);
    await expect(page.getByRole('heading', { name: 'Reporte por consultorio' })).toHaveCount(0);
  });
});

function isAdminReport(value: unknown): value is { endpoint: string; body: unknown } {
  return typeof value === 'object' && value !== null && 'endpoint' in value
    && typeof value.endpoint === 'string'
    && (value.endpoint.includes('get_admin_organization_usage_report') || value.endpoint.includes('get_admin_library_quota_report'));
}

function isAdminAudit(value: unknown): value is { endpoint: string; body: unknown } {
  return typeof value === 'object' && value !== null && 'endpoint' in value
    && typeof value.endpoint === 'string' && value.endpoint.includes('get_admin_audit_events');
}

function isAdminRetention(value: unknown): value is { endpoint: string; body: unknown } {
  return typeof value === 'object' && value !== null && 'endpoint' in value
    && typeof value.endpoint === 'string' && value.endpoint.includes('get_admin_organization_retention_report');
}

function isPlatformRevenue(value: unknown): value is { endpoint: string; body: unknown } {
  return typeof value === 'object' && value !== null && 'endpoint' in value
    && typeof value.endpoint === 'string' && value.endpoint.includes('get_admin_platform_revenue_report');
}

function isPlatformReceipts(value: unknown): value is { endpoint: string; body: unknown } {
  return typeof value === 'object' && value !== null && 'endpoint' in value
    && typeof value.endpoint === 'string' && value.endpoint.includes('get_admin_platform_receipts');
}

function assertAggregatePayload(value: { endpoint: string; body: unknown }) {
  const allowed = value.endpoint.includes('get_admin_audit_events')
    ? new Set(['event_id', 'occurred_at', 'event_type', 'organization_id', 'organization_name', 'organization_slug', 'previous_value', 'new_value', 'extra_professionals', 'total_count'])
    : value.endpoint.includes('get_admin_organization_retention_report')
    ? new Set(['snapshot_month','captured_at','activity_from','activity_to','active_customers','previous_active_customers','retained_customers','churned_customers','retention_rate','active_patients','active_professionals','stored_pdf_bytes','appointments','completed_appointments','checkin_responses','published_meal_plan_versions'])
    : value.endpoint.includes('get_admin_platform_revenue_report')
    ? new Set(['organization_id','organization_name','organization_slug','current_plan','term_id','term_plan','billing_frequency','term_amount','term_currency','effective_from','term_history','received_by_currency','plan','amount','currency','effective_to','effective_from','term_id','billing_frequency','receipt_count'])
    : value.endpoint.includes('get_admin_platform_receipts')
    ? new Set(['receipt_id','organization_id','organization_name','received_on','period_start','period_end','amount','currency','status','billing_frequency','voided_at','total_count'])
    : value.endpoint.includes('get_admin_library_quota_report')
    ? new Set(['organization_id', 'upload_enabled_professionals', 'effective_library_quota_bytes', 'professionals_near_library_quota', 'professionals_over_library_quota'])
    : new Set(['organization_id', 'organization_name', 'organization_slug', 'organization_status', 'plan_slug', 'subscription_status', 'active_patients', 'max_active_patients', 'active_professionals', 'professional_capacity', 'stored_pdf_bytes', 'plan_storage_limit_bytes', 'active_meal_plan_assignments', 'branding_assets_count', 'branding_settings_fields_count', 'connected_google_calendars', 'appointments_in_period', 'completed_appointments_in_period', 'checkin_responses_in_period', 'published_meal_plan_versions_in_period', 'income_by_currency', 'currency', 'payments', 'refunds', 'net', 'payment_count', 'refund_count']);
  const unexpected = collectKeys(value.body).filter(key => !allowed.has(key));
  expect(unexpected, `El RPC ${value.endpoint} sólo debe devolver campos agregados permitidos`).toEqual([]);
}

function collectKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectKeys);
  if (typeof value !== 'object' || value === null) return [];
  return Object.entries(value).flatMap(([key, child]) => [key, ...collectKeys(child)]);
}
