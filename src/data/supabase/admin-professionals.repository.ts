import { z } from 'zod';
import type { RealAdminProfessionalsPage } from '../admin-professionals.types';

const rowSchema = z.object({
  user_id: z.string().uuid(), full_name: z.string(), email: z.string().email(),
  organization_id: z.string().uuid(), organization_name: z.string(),
  membership_status: z.enum(['active', 'inactive']), account_suspended: z.boolean(),
  assigned_patient_count: z.number().int().nonnegative(), created_at: z.string().datetime({ offset: true }),
  total_count: z.number().int().nonnegative(),
});

export async function loadRealAdminProfessionals(query: string, status: string, limit = 100, offset = 0): Promise<RealAdminProfessionalsPage> {
  const { getSupabaseClient } = await import('../../auth/supabase-client');
  const result = await getSupabaseClient().schema('api').rpc('get_admin_professionals' as never, {
    p_query: query.trim() || null, p_status: status, p_limit: limit, p_offset: offset,
  } as never);
  if (result.error) throw new Error('No pudimos cargar el directorio de profesionales.');
  const parsed = z.array(rowSchema).safeParse(result.data);
  if (!parsed.success) throw new Error('El servicio devolvió datos de profesionales inválidos.');
  return {
    rows: parsed.data.map(row => ({ userId: row.user_id, fullName: row.full_name, email: row.email,
      organizationId: row.organization_id, organizationName: row.organization_name,
      membershipStatus: row.membership_status, accountSuspended: row.account_suspended,
      assignedPatientCount: row.assigned_patient_count, createdAt: row.created_at })),
    totalCount: parsed.data[0]?.total_count ?? 0,
  };
}

export async function setRealAdminProfessionalMembership(organizationId: string, userId: string, status: 'active' | 'inactive') {
  const { getSupabaseClient } = await import('../../auth/supabase-client');
  const result = await getSupabaseClient().schema('api').rpc('set_admin_professional_membership_status' as never,
    { p_organization_id: organizationId, p_user_id: userId, p_status: status } as never);
  if (result.error) throw new Error(result.error.message.includes('asignaciones clínicas activas')
    ? 'Primero transferí los pacientes asignados desde el flujo clínico formal; después podrás suspender esta membresía.'
    : result.error.message.includes('transferencias con acceso de sólo lectura vigente')
      ? 'La política acordada conserva lectura por 14 días tras una transferencia. Esperá a que venza ese plazo para suspender esta membresía.'
    : 'No pudimos cambiar el estado de la membresía.');
}

export async function setRealAdminProfessionalAccountSuspension(userId: string, suspended: boolean) {
  const { getSupabaseClient } = await import('../../auth/supabase-client');
  const result = await getSupabaseClient().schema('api').rpc('set_admin_professional_account_suspension' as never,
    { p_user_id: userId, p_is_suspended: suspended } as never);
  if (result.error) throw new Error('No pudimos cambiar el estado global de la cuenta.');
}
