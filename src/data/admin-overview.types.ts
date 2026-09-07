export interface RealAdminMetrics {
  organizationsTotal: number;
  organizationsActive: number;
  organizationsSuspended: number;
  nutritionistsTotal: number;
  patientsTotal: number;
}

export interface RealAdminOrganization {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface RealAdminOverview {
  metrics: RealAdminMetrics;
  organizations: RealAdminOrganization[];
}
