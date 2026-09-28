export type RealAdminProfessionalRow = {
  userId: string;
  fullName: string;
  email: string;
  organizationId: string;
  organizationName: string;
  membershipStatus: 'active' | 'inactive';
  accountSuspended: boolean;
  assignedPatientCount: number;
  createdAt: string;
};

export type RealAdminProfessionalsPage = { rows: RealAdminProfessionalRow[]; totalCount: number };
