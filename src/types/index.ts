export type UserRole = 'admin' | 'nutritionist' | 'patient';

export type OrganizationStatus = 'active' | 'suspended' | 'pending';

export interface Organization {
  id: string;
  name: string;
  location: string;
  status: OrganizationStatus;
  nutritionistsCount: number;
  patientsCount: number;
  plan: 'Básico' | 'Pro' | 'Enterprise';
  createdAt: string;
}

export interface Nutritionist {
  id: string;
  organizationId: string;
  organizationName: string;
  name: string;
  email: string;
  phone: string;
  assignedPatientsCount: number;
  status: 'active' | 'suspended';
  joinedAt: string;
  lastActiveAt: string;
}

export interface Patient {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  birthDate?: string;
  age?: number;
  city?: string;
  status: 'active' | 'archived';
  assignedNutritionistId: string;
  objective: string;
  currentPlan?: string | null;
  createdAt: string;
  lastActiveAt: string;
  portalAccessStatus: 'active' | 'pending' | 'revoked';
}

export interface CheckInAssignment {
  id: string;
  organizationId: string;
  patientId: string;
  createdBy: string;
  dueDate: string;
  status: 'pending' | 'completed' | 'expired';
  createdAt: string;
}

export interface CheckInResponse {
  id: string;
  assignmentId: string;
  organizationId: string;
  patientId: string;
  energyScore: number; // 1-5
  adherenceScore: number; // 1-5
  helpRequested: boolean;
  notes?: string;
  submittedAt: string;
}

export type AlertRuleCode = 'HELP_REQUESTED' | 'LOW_ENERGY' | 'LOW_ADHERENCE' | 'DELAYED_CHECKIN';
export type AlertPriority = 'high' | 'medium';
export type AlertStatus = 'unresolved' | 'acknowledged' | 'resolved';

export interface Alert {
  id: string;
  organizationId: string;
  patientId: string;
  responseId?: string;
  ruleCode: AlertRuleCode;
  priority: AlertPriority;
  patientName: string;
  reasonText: string;
  recommendedAction: string;
  status: AlertStatus;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string; // ISO date string
}

export interface Recommendation {
  id: string;
  organizationId: string;
  patientId: string;
  responseId?: string;
  createdBy: string;
  recommendationText: string;
  createdAt: string;
}
