import { z } from 'zod';
import type { RealAdminRetentionSnapshot } from '../admin-usage.types';

const snapshotRow = z.object({
  snapshot_month: z.string(),
  captured_at: z.string(),
  activity_from: z.string(),
  activity_to: z.string(),
  active_customers: z.number().int().nonnegative(),
  previous_active_customers: z.number().int().nonnegative().nullable(),
  retained_customers: z.number().int().nonnegative().nullable(),
  churned_customers: z.number().int().nonnegative().nullable(),
  retention_rate: z.number().min(0).max(100).nullable(),
  active_patients: z.number().int().nonnegative(),
  active_professionals: z.number().int().nonnegative(),
  stored_pdf_bytes: z.number().int().nonnegative(),
  appointments: z.number().int().nonnegative(),
  completed_appointments: z.number().int().nonnegative(),
  checkin_responses: z.number().int().nonnegative(),
  published_meal_plan_versions: z.number().int().nonnegative(),
});

export async function loadRealAdminRetentionSnapshots(months = 24): Promise<RealAdminRetentionSnapshot[]> {
  const { getSupabaseClient } = await import('../../auth/supabase-client');
  const result = await getSupabaseClient().schema('api').rpc('get_admin_organization_retention_report', { p_months: months });
  if (result.error) throw new Error('No pudimos cargar la retención y evolución mensual.');
  const parsed = z.array(snapshotRow).safeParse(result.data);
  if (!parsed.success) throw new Error('El servicio devolvió una serie mensual inválida.');
  return parsed.data.map(row => ({
    snapshotMonth: row.snapshot_month,
    capturedAt: row.captured_at,
    activityFrom: row.activity_from,
    activityTo: row.activity_to,
    activeCustomers: row.active_customers,
    previousActiveCustomers: row.previous_active_customers,
    retainedCustomers: row.retained_customers,
    churnedCustomers: row.churned_customers,
    retentionRate: row.retention_rate,
    activePatients: row.active_patients,
    activeProfessionals: row.active_professionals,
    storedPdfBytes: row.stored_pdf_bytes,
    appointments: row.appointments,
    completedAppointments: row.completed_appointments,
    checkinResponses: row.checkin_responses,
    publishedMealPlanVersions: row.published_meal_plan_versions,
  }));
}
