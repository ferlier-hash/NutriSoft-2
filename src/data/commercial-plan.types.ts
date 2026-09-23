export type CommercialPlanSlug = 'pro' | 'ultra' | 'custom';

export interface RealOrganizationSubscription {
  organizationId: string;
  plan: CommercialPlanSlug;
  status: 'trialing' | 'active' | 'grace' | 'suspended' | 'cancelled';
  extraProfessionals: number;
  includedProfessionals: number;
  maxActivePatients?: number;
  storageLimitBytes?: number;
  customBrandingEnabled: boolean;
}

export interface ProfessionalNewsletterContact { fullName: string; email: string; }
