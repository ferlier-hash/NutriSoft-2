import { z } from 'zod';
import type { RealAdminOrganizationDetail } from '../admin-organization-detail.types';
import { parseRealAdminOrganizations } from './admin-overview.repository';
import { loadAdminPlatformBilling, loadAdminPlatformReceipts, loadAdminPlatformRevenue } from './admin-platform-revenue.repository';
import { loadRealAdminProfessionals } from './admin-professionals.repository';
import { loadRealAdminOrganizationUsage } from './admin-usage.repository';
import { loadRealOrganizationSubscriptions } from './commercial-plan.repository';
import { loadRealAdminAuditEvents } from './admin-audit.repository';

const adminOrganizationSchema = z.object({ id: z.string().uuid(), name: z.string().min(1), slug: z.string().min(1), status: z.enum(['active', 'suspended']), created_at: z.string().datetime({ offset: true }), updated_at: z.string().datetime({ offset: true }) });

export async function loadRealAdminOrganizationDetail(organizationId: string): Promise<RealAdminOrganizationDetail | null> {
  if (!z.string().uuid().safeParse(organizationId).success) return null;
  const { getSupabaseClient } = await import('../../auth/supabase-client');
  const organizationResult = await getSupabaseClient().schema('api').from('admin_organizations').select('id,name,slug,status,created_at,updated_at').eq('id', organizationId).maybeSingle();
  if (organizationResult.error) throw new Error('No pudimos cargar el consultorio.');
  if (organizationResult.data === null) return null;
  const parsedOrganization = adminOrganizationSchema.safeParse(organizationResult.data);
  if (!parsedOrganization.success) throw new Error('El servicio devolvió información inválida del consultorio.');
  const organization = parseRealAdminOrganizations([parsedOrganization.data])[0];
  if (!organization) throw new Error('El servicio no devolvió el consultorio solicitado.');

  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth() - 11, 1);
  const to = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const fromDate = localDate(from);
  const toExclusive = localDate(to);
  const toInclusive = localDate(new Date(to.getTime() - 24 * 60 * 60 * 1000));
  const [usageRows, subscriptionRows, professionals, revenueRows, billingRows, receipts, auditPage] = await Promise.all([
    loadRealAdminOrganizationUsage(`${fromDate}T00:00:00.000Z`, `${toExclusive}T00:00:00.000Z`),
    loadRealOrganizationSubscriptions(),
    loadOrganizationProfessionals(organization.id, organization.name),
    loadAdminPlatformRevenue(fromDate, toExclusive),
    loadAdminPlatformBilling(fromDate, toInclusive),
    loadOrganizationReceipts(organization.id, fromDate, toExclusive),
    loadRealAdminAuditEvents({ from: `${fromDate}T00:00:00.000Z`, to: `${toExclusive}T00:00:00.000Z`, eventType: null, query: organization.slug, limit: 100, offset: 0 }),
  ]);

  const usage = usageRows.find(row => row.organizationId === organizationId);
  const subscription = subscriptionRows.find(row => row.organizationId === organizationId);
  const revenue = revenueRows.find(row => row.organizationId === organizationId);
  if (!usage || !revenue) return null;
  return {
    organization,
    usage,
    professionals,
    subscription,
    revenue,
    billingCycles: billingRows.filter(row => row.organizationId === organizationId),
    receipts,
    recentAudit: auditPage.rows.filter(event => event.organizationId === organizationId).slice(0, 10),
  };
}

async function loadOrganizationProfessionals(organizationId: string, organizationName: string) {
  const rows = [] as Awaited<ReturnType<typeof loadRealAdminProfessionals>>['rows'];
  let offset = 0;
  let totalCount = 0;
  do {
    const page = await loadRealAdminProfessionals(organizationName, 'all', 100, offset);
    rows.push(...page.rows.filter(row => row.organizationId === organizationId));
    totalCount = page.totalCount;
    offset += page.rows.length;
    if (page.rows.length === 0) break;
  } while (offset < totalCount);
  return rows;
}

async function loadOrganizationReceipts(organizationId: string, from: string, toExclusive: string) {
  const rows = [] as Awaited<ReturnType<typeof loadAdminPlatformReceipts>>['rows'];
  let offset = 0;
  let totalCount = 0;
  do {
    const page = await loadAdminPlatformReceipts(from, toExclusive, 100, offset);
    rows.push(...page.rows.filter(row => row.organizationId === organizationId));
    totalCount = page.totalCount;
    offset += page.rows.length;
    if (page.rows.length === 0) break;
  } while (offset < totalCount);
  return rows;
}

export async function updateRealAdminOrganizationStatus(organizationId: string, status: 'active' | 'suspended'): Promise<void> {
  if (!z.string().uuid().safeParse(organizationId).success) throw new Error('El consultorio seleccionado no es válido.');
  const { getSupabaseClient } = await import('../../auth/supabase-client');
  const result = await getSupabaseClient().schema('api').rpc('set_organization_status' as never, { p_org_id: organizationId, p_status: status } as never);
  if (result.error) throw new Error('No pudimos actualizar el estado operativo del consultorio.');
}

function localDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}
