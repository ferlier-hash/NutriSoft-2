import { z } from 'zod';
import type { RealAdminMetrics, RealAdminOrganization, RealAdminOverview } from '../admin-overview.types';

const metricsSchema = z.object({
  organizations_total: z.number().int().nonnegative(),
  organizations_active: z.number().int().nonnegative(),
  organizations_suspended: z.number().int().nonnegative(),
  nutritionists_total: z.number().int().nonnegative(),
  patients_total: z.number().int().nonnegative(),
});

const organizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  status: z.enum(['active', 'suspended']),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});

export async function loadRealAdminOverview(): Promise<RealAdminOverview> {
  const [metrics, organizations] = await Promise.all([
    loadRealAdminMetrics(),
    loadRealAdminOrganizations(),
  ]);
  return { metrics, organizations };
}

export async function loadRealAdminMetrics(): Promise<RealAdminMetrics> {
  const { getSupabaseClient } = await import('../../auth/supabase-client');
  const supabase = getSupabaseClient();
  const result = await supabase.schema('api').rpc('get_admin_metrics');
  if (result.error) throw new Error('No pudimos consultar las métricas administrativas.');
  return parseRealAdminMetrics(result.data);
}

export async function loadRealAdminOrganizations(): Promise<RealAdminOrganization[]> {
  const { getSupabaseClient } = await import('../../auth/supabase-client');
  const supabase = getSupabaseClient();
  const result = await supabase
    .schema('api')
    .from('admin_organizations')
    .select('id,name,slug,status,created_at,updated_at')
    .order('name', { ascending: true });
  if (result.error) throw new Error('No pudimos consultar los consultorios.');
  return parseRealAdminOrganizations(result.data);
}

export function parseRealAdminMetrics(metricsData: unknown): RealAdminMetrics {
  const metrics = metricsSchema.safeParse(metricsData);
  if (!metrics.success) throw new Error('El servicio devolvió métricas administrativas inválidas.');
  return {
    organizationsTotal: metrics.data.organizations_total,
    organizationsActive: metrics.data.organizations_active,
    organizationsSuspended: metrics.data.organizations_suspended,
    nutritionistsTotal: metrics.data.nutritionists_total,
    patientsTotal: metrics.data.patients_total,
  };
}

export function parseRealAdminOrganizations(organizationsData: unknown): RealAdminOrganization[] {
  const organizations = z.array(organizationSchema).safeParse(organizationsData);
  if (!organizations.success) throw new Error('El servicio devolvió consultorios inválidos.');
  return organizations.data.map(organization => ({
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    status: organization.status,
    createdAt: organization.created_at,
    updatedAt: organization.updated_at,
  }));
}

export function parseRealAdminOverview(metricsData: unknown, organizationsData: unknown): RealAdminOverview {
  return {
    metrics: parseRealAdminMetrics(metricsData),
    organizations: parseRealAdminOrganizations(organizationsData),
  };
}
