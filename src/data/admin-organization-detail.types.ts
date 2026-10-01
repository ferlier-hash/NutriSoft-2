import type { AdminPlatformBillingCycle, AdminPlatformReceipt, AdminPlatformRevenueRow } from './admin-platform-revenue.types';
import type { RealAdminProfessionalRow } from './admin-professionals.types';
import type { RealAdminOrganizationUsage } from './admin-usage.types';
import type { RealAdminOrganization } from './admin-overview.types';
import type { RealOrganizationSubscription } from './commercial-plan.types';
import type { RealAdminAuditEvent } from './admin-audit.types';

export interface RealAdminOrganizationDetail {
  organization: RealAdminOrganization;
  usage: RealAdminOrganizationUsage;
  professionals: RealAdminProfessionalRow[];
  professionalInvitations: RealAdminProfessionalInvitation[];
  subscription: RealOrganizationSubscription | undefined;
  revenue: AdminPlatformRevenueRow;
  billingCycles: AdminPlatformBillingCycle[];
  receipts: AdminPlatformReceipt[];
  recentAudit: RealAdminAuditEvent[];
}

export interface RealAdminProfessionalInvitation {
  invitationId: string;
  organizationId: string;
  fullName: string;
  email: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  deliveryStatus: 'pending' | 'sent' | 'failed' | 'existing_account';
  createdAt: string;
  expiresAt: string;
}
