export interface RealAdminOrganizationUsage {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  organizationStatus: 'active' | 'suspended';
  plan: 'pro' | 'ultra' | 'custom' | null;
  subscriptionStatus: 'trialing' | 'active' | 'grace' | 'suspended' | 'cancelled' | null;
  activePatients: number;
  maxActivePatients: number | null;
  activeProfessionals: number;
  professionalCapacity: number | null;
  storedPdfBytes: number;
  planStorageLimitBytes: number | null;
  uploadEnabledProfessionals: number;
  effectiveLibraryQuotaBytes: number;
  professionalsNearLibraryQuota: number;
  professionalsOverLibraryQuota: number;
  activeMealPlanAssignments: number;
  brandingAssetsCount: number;
  brandingSettingsFieldsCount: number;
  connectedGoogleCalendars: number;
  appointmentsInPeriod: number;
  completedAppointmentsInPeriod: number;
  checkinResponsesInPeriod: number;
  publishedMealPlanVersionsInPeriod: number;
  incomeByCurrency: Array<{ currency: string; payments: number; refunds: number; net: number; paymentCount: number; refundCount: number }>;
}

export interface RealAdminRetentionSnapshot {
  snapshotMonth: string;
  capturedAt: string;
  activityFrom: string;
  activityTo: string;
  activeCustomers: number;
  previousActiveCustomers: number | null;
  retainedCustomers: number | null;
  churnedCustomers: number | null;
  retentionRate: number | null;
  activePatients: number;
  activeProfessionals: number;
  storedPdfBytes: number;
  appointments: number;
  completedAppointments: number;
  checkinResponses: number;
  publishedMealPlanVersions: number;
}
