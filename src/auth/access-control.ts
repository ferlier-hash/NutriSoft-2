import { z } from 'zod';

const membershipSchema = z.object({
  organization_id: z.string().uuid(),
  organization_name: z.string().min(1),
  organization_status: z.enum(['active', 'suspended']),
  role: z.enum(['organization_owner', 'nutritionist', 'assistant']),
  membership_status: z.enum(['active', 'inactive']),
});

const patientAccessSchema = z.object({
  organization_id: z.string().uuid(),
  organization_status: z.enum(['active', 'suspended']),
  patient_id: z.string().uuid(),
  patient_status: z.enum(['active', 'archived']),
  access_status: z.enum(['active', 'revoked']),
});

export const accessContextSchema = z.object({
  user_id: z.string().uuid(),
  platform_role: z.literal('platform_admin').nullable(),
  memberships: z.array(membershipSchema),
  patient_accesses: z.array(patientAccessSchema),
});

export type AccessContext = z.infer<typeof accessContextSchema>;
export type Portal = 'admin' | 'professional' | 'patient';

export function getAuthorizedPortals(context: AccessContext): Portal[] {
  if (context.platform_role === 'platform_admin') return ['admin'];

  const portals = new Set<Portal>();
  const hasProfessionalAccess = context.memberships.some(
    membership =>
      membership.membership_status === 'active' &&
      membership.organization_status === 'active' &&
      ['organization_owner', 'nutritionist'].includes(membership.role),
  );
  const hasPatientAccess = context.patient_accesses.some(
    access =>
      access.access_status === 'active' &&
      access.patient_status === 'active' &&
      access.organization_status === 'active',
  );

  if (hasProfessionalAccess) portals.add('professional');
  if (hasPatientAccess) portals.add('patient');
  return [...portals];
}

export function getDefaultPortal(context: AccessContext): Portal | null {
  return getAuthorizedPortals(context)[0] ?? null;
}

export function hasSuspendedAccess(context: AccessContext): boolean {
  if (context.platform_role === 'platform_admin') return false;

  return (
    context.memberships.some(
      membership =>
        membership.membership_status === 'active' &&
        membership.organization_status === 'suspended',
    ) ||
    context.patient_accesses.some(
      access =>
        access.access_status === 'active' && access.organization_status === 'suspended',
    )
  );
}
