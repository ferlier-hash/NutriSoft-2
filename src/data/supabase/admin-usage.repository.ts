import { z } from 'zod';
import type { RealAdminOrganizationUsage } from '../admin-usage.types';

const usageRow = z.object({
  organization_id: z.string().uuid(),
  organization_name: z.string().min(1),
  organization_slug: z.string().min(1),
  organization_status: z.enum(['active', 'suspended']),
  plan_slug: z.enum(['pro', 'ultra', 'custom']).nullable(),
  subscription_status: z.enum(['trialing', 'active', 'grace', 'suspended', 'cancelled']).nullable(),
  active_patients: z.number().int().nonnegative(),
  max_active_patients: z.number().int().positive().nullable(),
  active_professionals: z.number().int().nonnegative(),
  professional_capacity: z.number().int().positive().nullable(),
  stored_pdf_bytes: z.number().int().nonnegative(),
  plan_storage_limit_bytes: z.number().int().positive().nullable(),
  active_meal_plan_assignments: z.number().int().nonnegative(),
  branding_assets_count: z.number().int().min(0).max(3),
  branding_settings_fields_count: z.number().int().min(0).max(6),
  connected_google_calendars: z.number().int().nonnegative(),
  appointments_in_period: z.number().int().nonnegative(),
  completed_appointments_in_period: z.number().int().nonnegative(),
  checkin_responses_in_period: z.number().int().nonnegative(),
  published_meal_plan_versions_in_period: z.number().int().nonnegative(),
  income_by_currency: z.array(z.object({
    currency: z.string().regex(/^[A-Z]{3}$/),
    payments: z.number(), refunds: z.number(), net: z.number(),
    payment_count: z.number().int().nonnegative(), refund_count: z.number().int().nonnegative(),
  })),
});
const quotaRow = z.object({
  organization_id: z.string().uuid(),
  upload_enabled_professionals: z.number().int().nonnegative(),
  effective_library_quota_bytes: z.number().int().nonnegative(),
  professionals_near_library_quota: z.number().int().nonnegative(),
  professionals_over_library_quota: z.number().int().nonnegative(),
});

export async function loadRealAdminOrganizationUsage(from: string, to: string): Promise<RealAdminOrganizationUsage[]> {
  const { getSupabaseClient } = await import('../../auth/supabase-client');
  const supabase = getSupabaseClient();
  const [result, quotaResult] = await Promise.all([
    supabase.schema('api').rpc('get_admin_organization_usage_report' as never, { p_from: from, p_to: to } as never),
    supabase.schema('api').rpc('get_admin_library_quota_report' as never),
  ]);
  if (result.error || quotaResult.error) throw new Error('No pudimos cargar el reporte de consumo.');
  const parsed = z.array(usageRow).safeParse(result.data);
  const parsedQuotas = z.array(quotaRow).safeParse(quotaResult.data);
  if (!parsed.success || !parsedQuotas.success) throw new Error('El servicio devolvió un reporte de consumo inválido.');
  const quotas = new Map(parsedQuotas.data.map(row => [row.organization_id, row]));

  return parsed.data.map(row => ({
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    organizationSlug: row.organization_slug,
    organizationStatus: row.organization_status,
    plan: row.plan_slug,
    subscriptionStatus: row.subscription_status,
    activePatients: row.active_patients,
    maxActivePatients: row.max_active_patients,
    activeProfessionals: row.active_professionals,
    professionalCapacity: row.professional_capacity,
    storedPdfBytes: row.stored_pdf_bytes,
    planStorageLimitBytes: row.plan_storage_limit_bytes,
    uploadEnabledProfessionals: quotas.get(row.organization_id)?.upload_enabled_professionals ?? 0,
    effectiveLibraryQuotaBytes: quotas.get(row.organization_id)?.effective_library_quota_bytes ?? 0,
    professionalsNearLibraryQuota: quotas.get(row.organization_id)?.professionals_near_library_quota ?? 0,
    professionalsOverLibraryQuota: quotas.get(row.organization_id)?.professionals_over_library_quota ?? 0,
    activeMealPlanAssignments: row.active_meal_plan_assignments,
    brandingAssetsCount: row.branding_assets_count,
    brandingSettingsFieldsCount: row.branding_settings_fields_count,
    connectedGoogleCalendars: row.connected_google_calendars,
    appointmentsInPeriod: row.appointments_in_period,
    completedAppointmentsInPeriod: row.completed_appointments_in_period,
    checkinResponsesInPeriod: row.checkin_responses_in_period,
    publishedMealPlanVersionsInPeriod: row.published_meal_plan_versions_in_period,
    incomeByCurrency: row.income_by_currency.map(income => ({ currency: income.currency, payments: income.payments, refunds: income.refunds, net: income.net, paymentCount: income.payment_count, refundCount: income.refund_count })),
  }));
}
