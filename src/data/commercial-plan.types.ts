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
  planVersion?: number;
  libraryExtraBytesPerProfessional?: number;
  scheduledChange?: { id: string; plan: CommercialPlanSlug; effectiveOn: string; extraProfessionals: number; libraryExtraBytesPerProfessional: number };
}

export interface AdminPlanConfiguration {
  plans: Array<{ slug: CommercialPlanSlug; displayName: string; version: number; maxActivePatients: number | null; includedProfessionals: number; extraProfessionalEnabled: boolean; storageLimitBytes: number | null; customBrandingEnabled: boolean; active: boolean }>;
  addons: Array<{ code: 'extra_professional' | 'extra_pdf_space'; displayName: string; unitKind: string; unitBytes: number | null; active: boolean }>;
}

export interface ProfessionalNewsletterContact { fullName: string; email: string; }
