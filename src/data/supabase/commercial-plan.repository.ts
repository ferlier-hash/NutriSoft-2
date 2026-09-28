import { z } from 'zod';
import type { AdminPlanConfiguration, CommercialPlanSlug, ProfessionalNewsletterContact, RealOrganizationSubscription } from '../commercial-plan.types';

const subscriptionSchema = z.object({ organization_id: z.string().uuid(), plan_slug: z.enum(['pro','ultra','custom']), status: z.enum(['trialing','active','grace','suspended','cancelled']), extra_professionals: z.number().int().nonnegative(), included_professionals: z.number().int().positive(), max_active_patients: z.number().int().positive().nullable(), storage_limit_bytes: z.number().int().positive().nullable(), custom_branding_enabled: z.boolean(), plan_version: z.number().int().positive(), library_extra_bytes_per_professional: z.number().int().nonnegative(), scheduled_change_id: z.string().uuid().nullable(), scheduled_plan_slug: z.enum(['pro','ultra','custom']).nullable(), scheduled_effective_on: z.string().nullable(), scheduled_extra_professionals: z.number().int().nonnegative().nullable(), scheduled_library_extra_bytes_per_professional: z.number().int().nonnegative().nullable() });
const contactSchema = z.object({ full_name: z.string().min(1), email: z.string().email() });

export function parseOrganizationSubscriptions(value: unknown): RealOrganizationSubscription[] {
  const result = z.array(subscriptionSchema).safeParse(value); if (!result.success) throw new Error('El servicio devolvió suscripciones inválidas.');
  return result.data.map(row => ({ organizationId: row.organization_id, plan: row.plan_slug, status: row.status, extraProfessionals: row.extra_professionals, includedProfessionals: row.included_professionals, maxActivePatients: row.max_active_patients ?? undefined, storageLimitBytes: row.storage_limit_bytes ?? undefined, customBrandingEnabled: row.custom_branding_enabled, planVersion: row.plan_version, libraryExtraBytesPerProfessional: row.library_extra_bytes_per_professional, ...(row.scheduled_change_id && row.scheduled_plan_slug && row.scheduled_effective_on ? { scheduledChange: { id: row.scheduled_change_id, plan: row.scheduled_plan_slug, effectiveOn: row.scheduled_effective_on, extraProfessionals: row.scheduled_extra_professionals ?? 0, libraryExtraBytesPerProfessional: row.scheduled_library_extra_bytes_per_professional ?? 0 } } : {}) }));
}

export function parseNewsletterContacts(value: unknown): ProfessionalNewsletterContact[] {
  const result = z.array(contactSchema).safeParse(value); if (!result.success) throw new Error('El servicio devolvió contactos inválidos.');
  return result.data.map(row => ({ fullName: row.full_name, email: row.email }));
}

async function api() { const { getSupabaseClient } = await import('../../auth/supabase-client'); return getSupabaseClient().schema('api'); }

export async function loadRealOrganizationSubscriptions(): Promise<RealOrganizationSubscription[]> {
  const result = await (await api()).rpc('get_admin_organization_subscriptions' as never);
  if (result.error) throw new Error('No pudimos cargar las suscripciones.'); return parseOrganizationSubscriptions(result.data);
}

export async function loadProfessionalNewsletterContacts(): Promise<ProfessionalNewsletterContact[]> {
  const result = await (await api()).rpc('get_professional_newsletter_contacts' as never);
  if (result.error) throw new Error('No pudimos cargar los contactos de boletines.'); return parseNewsletterContacts(result.data);
}

const planConfigurationSchema = z.object({
  plans: z.array(z.object({ slug: z.enum(['pro','ultra','custom']), displayName: z.string(), version: z.number().int(), maxActivePatients: z.number().int().positive().nullable(), includedProfessionals: z.number().int().positive(), extraProfessionalEnabled: z.boolean(), storageLimitBytes: z.number().int().positive().nullable(), customBrandingEnabled: z.boolean(), active: z.boolean() })),
  addons: z.array(z.object({ code: z.enum(['extra_professional','extra_pdf_space']), displayName: z.string(), unitKind: z.string(), unitBytes: z.number().int().positive().nullable(), active: z.boolean() })),
});

export async function loadAdminPlanConfiguration(): Promise<AdminPlanConfiguration> {
  const result = await (await api()).rpc('get_admin_plan_configuration' as never);
  if (result.error) throw new Error('No pudimos cargar los planes y adicionales.');
  const parsed = planConfigurationSchema.safeParse(result.data);
  if (!parsed.success) throw new Error('La configuración comercial recibida no es válida.');
  return parsed.data;
}

export async function saveAdminPlanConfiguration(plan: AdminPlanConfiguration['plans'][number]): Promise<void> {
  const result = await (await api()).rpc('save_admin_plan_configuration' as never, {
    p_plan_slug: plan.slug, p_max_active_patients: plan.maxActivePatients, p_included_professionals: plan.includedProfessionals,
    p_extra_professional_enabled: plan.extraProfessionalEnabled, p_storage_limit_bytes: plan.storageLimitBytes,
    p_custom_branding_enabled: plan.customBrandingEnabled, p_active: plan.active,
  } as never);
  if (result.error) throw new Error('No pudimos guardar la versión del plan.');
}

export async function saveAdminAddonConfiguration(storageUnitBytes: number, storageActive: boolean, professionalAddonActive: boolean): Promise<void> {
  const result = await (await api()).rpc('save_admin_addon_configuration' as never, { p_storage_unit_bytes: storageUnitBytes, p_storage_active: storageActive, p_professional_addon_active: professionalAddonActive } as never);
  if (result.error) throw new Error('No pudimos guardar los adicionales.');
}

export interface SubscriptionHistoryEntry { eventId: string; occurredAt: string; effectiveOn: string; eventKind: string; previousPlanSlug: CommercialPlanSlug | null; nextPlanSlug: CommercialPlanSlug; previousStatus: string | null; nextStatus: string; extraProfessionals: number; libraryExtraBytesPerProfessional: number; entryState: string; }

export async function configureRealOrganizationSubscription(input: { organizationId: string; plan: CommercialPlanSlug; status: RealOrganizationSubscription['status']; extraProfessionals: number; extraPdfBytes: number; effectiveOn: string }): Promise<void> {
  const result = await (await api()).rpc('configure_organization_subscription' as never, { p_organization_id: input.organizationId, p_plan_slug: input.plan, p_status: input.status, p_extra_professionals: input.extraProfessionals, p_extra_pdf_bytes: input.extraPdfBytes, p_effective_on: input.effectiveOn } as never);
  if (result.error) throw new Error('No pudimos guardar el cambio de suscripción.');
}

export async function cancelRealSubscriptionSchedule(scheduleId: string): Promise<void> {
  const result = await (await api()).rpc('cancel_organization_subscription_schedule' as never, { p_schedule_id: scheduleId } as never);
  if (result.error) throw new Error('No pudimos cancelar el cambio programado.');
}

export async function loadRealSubscriptionHistory(organizationId: string): Promise<SubscriptionHistoryEntry[]> {
  const result = await (await api()).rpc('get_admin_organization_subscription_history' as never, { p_organization_id: organizationId } as never);
  if (result.error) throw new Error('No pudimos cargar el historial de suscripción.');
  const schema = z.array(z.object({ event_id: z.string().uuid(), occurred_at: z.string(), effective_on: z.string(), event_kind: z.string(), previous_plan_slug: z.enum(['pro','ultra','custom']).nullable(), next_plan_slug: z.enum(['pro','ultra','custom']), previous_status: z.string().nullable(), next_status: z.string(), extra_professionals: z.number().int(), library_extra_bytes_per_professional: z.number().int(), entry_state: z.string() }));
  const parsed = schema.safeParse(result.data);
  if (!parsed.success) throw new Error('El historial de suscripción recibido no es válido.');
  return parsed.data.map(row => ({ eventId: row.event_id, occurredAt: row.occurred_at, effectiveOn: row.effective_on, eventKind: row.event_kind, previousPlanSlug: row.previous_plan_slug, nextPlanSlug: row.next_plan_slug, previousStatus: row.previous_status, nextStatus: row.next_status, extraProfessionals: row.extra_professionals, libraryExtraBytesPerProfessional: row.library_extra_bytes_per_professional, entryState: row.entry_state }));
}
