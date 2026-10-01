export type AdminAuditEventType = 'organization_created' | 'organization_status_changed' | 'subscription_changed' | 'professional_membership_changed' | 'professional_account_suspension_changed' | 'professional_invitation_changed';

export interface RealAdminAuditEvent {
  eventId: string;
  occurredAt: string;
  eventType: AdminAuditEventType;
  organizationId: string | null;
  organizationName: string;
  organizationSlug: string | null;
  previousValue: string | null;
  newValue: string;
  extraProfessionals: number | null;
  totalCount: number;
}

export interface RealAdminAuditPage {
  rows: RealAdminAuditEvent[];
  totalCount: number;
}
