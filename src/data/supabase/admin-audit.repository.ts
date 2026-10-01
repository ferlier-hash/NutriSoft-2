import { z } from 'zod';
import type { AdminAuditEventType, RealAdminAuditPage } from '../admin-audit.types';

const eventSchema = z.object({
  event_id: z.string().uuid(),
  occurred_at: z.string().datetime({ offset: true }),
  event_type: z.enum(['organization_created', 'organization_status_changed', 'subscription_changed', 'professional_membership_changed', 'professional_account_suspension_changed', 'professional_invitation_changed']),
  organization_id: z.string().uuid().nullable(),
  organization_name: z.string().min(1),
  organization_slug: z.string().min(1).nullable(),
  previous_value: z.string().nullable(),
  new_value: z.string().min(1),
  extra_professionals: z.number().int().nonnegative().nullable(),
  total_count: z.number().int().nonnegative(),
});

export async function loadRealAdminAuditEvents({
  from,
  to,
  eventType,
  query,
  limit = 25,
  offset = 0,
}: {
  from: string;
  to: string;
  eventType: AdminAuditEventType | null;
  query: string;
  limit?: number;
  offset?: number;
}): Promise<RealAdminAuditPage> {
  const { getSupabaseClient } = await import('../../auth/supabase-client');
  const supabase = getSupabaseClient();
  const result = await supabase.schema('api').rpc('get_admin_audit_events' as never, {
    p_from: from,
    p_to: to,
    p_event_type: eventType,
    p_query: query.trim() || null,
    p_limit: limit,
    p_offset: offset,
  } as never);
  if (result.error) throw new Error('No pudimos cargar la auditoría administrativa.');
  const parsed = z.array(eventSchema).safeParse(result.data);
  if (!parsed.success) throw new Error('El servicio devolvió eventos de auditoría inválidos.');
  return {
    rows: parsed.data.map(row => ({
      eventId: row.event_id,
      occurredAt: row.occurred_at,
      eventType: row.event_type,
      organizationId: row.organization_id,
      organizationName: row.organization_name,
      organizationSlug: row.organization_slug,
      previousValue: row.previous_value,
      newValue: row.new_value,
      extraProfessionals: row.extra_professionals,
      totalCount: row.total_count,
    })),
    totalCount: parsed.data[0]?.total_count ?? 0,
  };
}
