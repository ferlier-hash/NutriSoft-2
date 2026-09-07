export type UserRole = 'admin' | 'nutritionist' | 'patient';

export type OrganizationStatus = 'active' | 'payment_due' | 'suspended' | 'closed';
export type OrganizationPlan = 'BASIC' | 'PRO' | 'ULTRA' | 'CUSTOM';
export type OnboardingStatus = 'complete' | 'invited';
export type InvitationStatus = 'pending' | 'accepted' | 'revoked';

export interface ResponsibleMember {
  id: string;
  name: string;
  email: string;
  isPrimary: boolean;
  invitationStatus: InvitationStatus;
}

export interface ProfessionalInvitation {
  id: string;
  name: string;
  email: string;
  invitationStatus: InvitationStatus;
  invitedAt: string;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  currency: 'ARS';
  paidAt: string;
  method: string;
  note?: string;
  plan: OrganizationPlan;
}

export interface OrganizationStatusEvent {
  id: string;
  status: OrganizationStatus;
  occurredAt: string;
  note: string;
}

export interface Organization {
  id: string;
  name: string;
  location: string;
  status: OrganizationStatus;
  onboardingStatus: OnboardingStatus;
  nutritionistsCount: number;
  patientsCount: number;
  plan: OrganizationPlan;
  monthlyPrice: number;
  storageUsedMb: number;
  storageLimitMb: number | null;
  serviceStartedAt: string;
  nextBillingDate: string;
  suspensionDate?: string;
  primaryContact: {
    name: string;
    email: string;
    phone?: string;
  };
  responsibleMembers: ResponsibleMember[];
  professionalInvitations: ProfessionalInvitation[];
  additionalManagers: number;
  invitedNutritionists: number;
  payments: PaymentRecord[];
  branding?: OrganizationBranding;
  statusHistory: OrganizationStatusEvent[];
  createdAt: string;
}

export interface OrganizationBranding {
  displayName: string;
  tagline?: string;
  logoDataUrl?: string;
  patientHeaderImageDataUrl?: string;
  professionalHeaderImageDataUrl?: string;
  colorPreset: 'aqua' | 'ocean' | 'forest' | 'violet' | 'coral' | 'teal' | 'indigo' | 'rose' | 'olive' | 'slate';
  contactPhone?: string;
  contactEmail?: string;
  contactAddress?: string;
}

export interface PlatformMonthlySnapshot {
  month: string;
  label: string;
  activeOrganizations: number;
  activePatients: number;
  collectedRevenue: number;
}

export interface Nutritionist {
  id: string;
  organizationId: string;
  organizationName: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  assignedPatientsCount: number;
  status: 'active' | 'suspended';
  joinedAt: string;
  lastActiveAt: string;
  specialty?: ProfessionalSpecialty;
  registrationNumber?: string;
  registrationProvince?: string;
  registrationCountry?: string;
  timeZone: string;
}

export type ProfessionalSpecialty =
  | 'Nutrición general'
  | 'Nutrición clínica'
  | 'Nutrición pediátrica'
  | 'Nutrición deportiva'
  | 'Nutrición materno-infantil'
  | 'Nutrición en personas mayores'
  | 'Diabetes y metabolismo'
  | 'Salud digestiva'
  | 'Conducta alimentaria'
  | 'Nutrición vegetariana y vegana'
  | 'Nutrición oncológica'
  | 'Nutrición comunitaria y salud pública';

export type ProfessionalResourceKind = 'document' | 'video';
export type PublicationStatus = 'draft' | 'published' | 'retired';

export interface ProfessionalResource {
  id: string;
  organizationId: string;
  ownerNutritionistId: string;
  title: string;
  kind: ProfessionalResourceKind;
  category: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  status: PublicationStatus;
}

export type RecipeCategory = 'Desayunos' | 'Almuerzos' | 'Cenas' | 'Snacks';

export interface ProfessionalRecipe {
  id: string;
  organizationId: string;
  ownerNutritionistId: string;
  title: string;
  category: RecipeCategory;
  tags: string[];
  prepMinutes: number;
  servings: number;
  calories: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
  ingredients: string[];
  steps: string[];
  imageUrl: string;
  status: PublicationStatus;
  createdAt: string;
  updatedAt: string;
  sourceRecipeId?: string;
  sourceTitle?: string;
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
  invitedAt?: string;
  invitationExpiresAt?: string;
  initialWeightKg?: number;
  targetWeightKg?: number;
  heightCm?: number;
  waistCm?: number;
  hipCm?: number;
}

export interface AnthropometricMeasurement {
  id: string;
  organizationId: string;
  patientId: string;
  recordedBy: 'patient' | 'professional';
  recordedAt: string;
  weightKg?: number;
  heightCm?: number;
  waistCm?: number;
  hipCm?: number;
  sizeCm?: number;
  bodyFatPercentage?: number;
  muscleMassPercentage?: number;
  hydrationPercentage?: number;
  skinfoldMm?: number;
  visceralFatPercentage?: number;
  customValues?: Record<string, number>;
  note?: string;
}

export type MealPlanStatus = 'draft' | 'published' | 'archived';
export type MealPlanAssignmentKind = 'primary' | 'complement';

export interface MealPlanItem {
  id: string;
  description: string;
  amount?: string;
  recipeId?: string;
}

export interface MealPlanMeal {
  id: string;
  name: string;
  items: MealPlanItem[];
  alternatives?: string;
}

export interface MealPlanDay {
  id: string;
  label: string;
  title?: string;
  meals: MealPlanMeal[];
}

export interface MealPlanTemplate {
  id: string;
  organizationId: string;
  ownerNutritionistId: string;
  name: string;
  status: MealPlanStatus;
  days: MealPlanDay[];
  generalNotes?: string;
  shoppingList?: string;
  goals?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MealPlanAssignment {
  id: string;
  organizationId: string;
  patientId: string;
  templateId: string;
  templateName: string;
  kind: MealPlanAssignmentKind;
  status: 'active' | 'ended';
  snapshotDays: MealPlanDay[];
  snapshotGeneralNotes?: string;
  snapshotShoppingList?: string;
  snapshotGoals?: string;
  assignedBy: string;
  assignedAt: string;
  endedAt?: string;
}

export interface MealAdherenceRecord {
  id: string;
  organizationId: string;
  patientId: string;
  assignmentId: string;
  dayId: string;
  mealId: string;
  completed: boolean;
  patientComment?: string;
  commentedAt?: string;
  professionalReviewedAt?: string;
  updatedAt: string;
}

export interface NextStepItem {
  id: string;
  text: string;
  completed: boolean;
  patientComment?: string;
  completedAt?: string;
}

export interface PatientNextStepList {
  id: string;
  organizationId: string;
  ownerNutritionistId: string;
  title: string;
  durationDays: number;
  patientId?: string;
  items: NextStepItem[];
  createdAt: string;
  updatedAt: string;
  assignedAt?: string;
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
  sleepScore?: number;
  digestionScore?: number;
  satietyScore?: number;
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
  acknowledgedBy?: string;
  acknowledgedAt?: string;
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
  phraseId?: string;
  createdAt: string;
}

export interface MotivationalPhrase {
  id: string;
  organizationId: string;
  ownerNutritionistId: string;
  text: string;
  createdAt: string;
}

export type AppointmentStatus = 'requested' | 'confirmed' | 'completed' | 'cancelled_by_patient' | 'cancelled_by_professional' | 'rescheduled' | 'no_show';
export type AppointmentModality = 'in_person' | 'virtual';

export interface Appointment {
  id: string;
  organizationId: string;
  patientId: string;
  nutritionistId: string;
  startsAt: string;
  durationMinutes: 15 | 30 | 45 | 60 | 75 | 90;
  modality: AppointmentModality;
  status: AppointmentStatus;
  quotedAmount: number;
  currency: 'ARS' | 'CLP' | 'BRL' | 'USD' | 'MXN' | 'COP' | 'PEN' | 'EUR' | 'UYU';
  paymentStatus: 'pending' | 'paid' | 'partial' | 'no_charge' | 'refunded';
  /** Required operational decision after a cancellation or absence. */
  billingResolution?: 'no_charge' | 'pending' | 'partial_extra';
  /** Original appointment preserved when this appointment was created by a reschedule. */
  rescheduledFromAppointmentId?: string;
  /** Enlace de Meet generado por Google Calendar; nunca se fabrica en el frontend. */
  meetingUrl?: string;
  privateNote?: string;
  createdAt: string;
}

export interface AppointmentPaymentMovement {
  id: string;
  appointmentId: string;
  organizationId: string;
  amount: number;
  currency: Appointment['currency'];
  method: 'cash' | 'transfer' | 'other';
  kind?: 'payment' | 'refund';
  refundedPaymentMovementId?: string;
  note?: string;
  occurredAt: string;
}

export type AppointmentNotificationKind = 'created' | 'confirmed' | 'cancelled' | 'rescheduled';

export interface AppointmentNotification {
  id: string;
  appointmentId: string;
  organizationId: string;
  patientId: string;
  kind: AppointmentNotificationKind;
  title: string;
  message: string;
  createdAt: string;
  readAt?: string;
}

export interface AppointmentChangeRequest {
  id: string;
  organizationId: string;
  appointmentId: string;
  patientId: string;
  nutritionistId: string;
  kind: 'cancel' | 'reschedule';
  status: 'pending' | 'approved' | 'rejected';
  requestedStartsAt?: string;
  requestedDurationMinutes?: Appointment['durationMinutes'];
  requestedModality?: AppointmentModality;
  createdAt: string;
  resolvedAt?: string;
}

export type AppointmentCurrency = Appointment['currency'];

export interface ConsultationPriceSetting {
  id: string;
  label: string;
  durationMinutes: Appointment['durationMinutes'];
  modality: AppointmentModality;
  amount: number;
}

export type PracticeWeekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface PracticeWorkingDay {
  day: PracticeWeekday;
  enabled: boolean;
  /** Legacy mirror of the first interval; kept while demo data is migrated. */
  startTime: string;
  endTime: string;
  intervals?: PracticeWorkingInterval[];
}

export interface PracticeWorkingInterval {
  id: string;
  startTime: string;
  endTime: string;
}

export interface PracticeScheduleBlock {
  id: string;
  kind: 'block' | 'vacation';
  startsAt: string;
  endsAt: string;
  note?: string;
}

export interface PracticeAppointmentPolicy {
  gapMinutes: 0 | 5 | 10 | 15 | 20 | 30;
  cancellationNoticeHours: number;
  rescheduleNoticeHours: number;
  allowLateChangeRequests: boolean;
}

export interface PracticeNotificationSettings {
  appointmentRequested: boolean;
  appointmentCancelled: boolean;
  appointmentNoShow: boolean;
  mealPlanComment: boolean;
  nextStepComment: boolean;
}

export interface PracticeCheckInSettings {
  includeSleep: boolean;
  includeDigestion: boolean;
  includeSatiety: boolean;
  includeHelpRequested: boolean;
  includeNotes: boolean;
}

export interface AnthropometricCustomField {
  id: string;
  label: string;
  unit: string;
  status?: 'active' | 'archived';
}

export interface ProfessionalPracticeSettings {
  id: string;
  organizationId: string;
  nutritionistId: string;
  currency: AppointmentCurrency;
  defaultDurationMinutes: Appointment['durationMinutes'];
  defaultVirtualPrice: number;
  defaultInPersonPrice: number;
  priceSettings: ConsultationPriceSetting[];
  workingDays: PracticeWorkingDay[];
  scheduleBlocks: PracticeScheduleBlock[];
  appointmentPolicy: PracticeAppointmentPolicy;
  notificationSettings: PracticeNotificationSettings;
  checkInSettings: PracticeCheckInSettings;
  anthropometricCustomFields: AnthropometricCustomField[];
  googleCalendar: {
    status: 'not_connected' | 'connected';
    calendarName?: string;
    syncDirection: 'nutrisoft_to_google';
    blocksExternalEvents: boolean;
    autoGenerateMeet: boolean;
  };
  updatedAt: string;
}
