import { z } from 'zod';
import type { CommercialPlanSlug, ProfessionalNewsletterContact, RealOrganizationSubscription } from '../commercial-plan.types';

const subscriptionSchema = z.object({ organization_id: z.string().uuid(), plan_slug: z.enum(['pro','ultra','custom']), status: z.enum(['trialing','active','grace','suspended','cancelled']), extra_professionals: z.number().int().nonnegative(), included_professionals: z.number().int().positive(), max_active_patients: z.number().int().positive().nullable(), storage_limit_bytes: z.number().int().positive().nullable(), custom_branding_enabled: z.boolean() });
const contactSchema = z.object({ full_name: z.string().min(1), email: z.string().email() });

export function parseOrganizationSubscriptions(value: unknown): RealOrganizationSubscription[] {
  const result = z.array(subscriptionSchema).safeParse(value); if (!result.success) throw new Error('El servicio devolvió suscripciones inválidas.');
  return result.data.map(row => ({ organizationId: row.organization_id, plan: row.plan_slug, status: row.status, extraProfessionals: row.extra_professionals, includedProfessionals: row.included_professionals, maxActivePatients: row.max_active_patients ?? undefined, storageLimitBytes: row.storage_limit_bytes ?? undefined, customBrandingEnabled: row.custom_branding_enabled }));
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

export async function saveRealOrganizationSubscription(organizationId: string, plan: CommercialPlanSlug, extraProfessionals = 0): Promise<void> {
  const result = await (await api()).rpc('set_organization_subscription' as never, { p_org: organizationId, p_plan_slug: plan, p_status: 'active', p_extra_professionals: extraProfessionals, p_reason: 'admin configuration' } as never);
  if (result.error) throw new Error('No pudimos actualizar el plan del consultorio.');
}

export async function loadProfessionalNewsletterContacts(): Promise<ProfessionalNewsletterContact[]> {
  const result = await (await api()).rpc('get_professional_newsletter_contacts' as never);
  if (result.error) throw new Error('No pudimos cargar los contactos de boletines.'); return parseNewsletterContacts(result.data);
}
