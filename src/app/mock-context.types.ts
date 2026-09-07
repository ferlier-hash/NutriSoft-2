import type {
  Alert,
  CheckInAssignment,
  CheckInResponse,
  MealPlanAssignment,
  MealPlanAssignmentKind,
  MealPlanDay,
  MealPlanStatus,
  MealPlanTemplate,
  MealAdherenceRecord,
  Nutritionist,
  Organization,
  OrganizationBranding,
  OrganizationPlan,
  OrganizationStatus,
  Patient,
  PaymentRecord,
  ProfessionalInvitation,
  ProfessionalRecipe,
  ProfessionalResource,
  ProfessionalResourceKind,
  PublicationStatus,
  RecipeCategory,
  Recommendation,
  MotivationalPhrase,
  ResponsibleMember,
  ProfessionalSpecialty,
  PatientNextStepList,
  Appointment,
  AppointmentPaymentMovement,
  AppointmentNotification,
  AppointmentChangeRequest,
  AnthropometricMeasurement,
  AnthropometricCustomField,
  ProfessionalPracticeSettings,
} from '../types';

export interface NewAppointmentInput {
  patientId: string;
  startsAt: string;
  durationMinutes: Appointment['durationMinutes'];
  modality: Appointment['modality'];
  quotedAmount: number;
  currency?: Appointment['currency'];
  status?: Extract<Appointment['status'], 'requested' | 'confirmed'>;
}
export interface AnthropometricMeasurementInput {
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
export interface PatientAppointmentRequestInput {
  startsAt: string;
  durationMinutes: Appointment['durationMinutes'];
  modality: Appointment['modality'];
}
export interface PatientAppointmentChangeRequestInput {
  appointmentId: string;
  kind: AppointmentChangeRequest['kind'];
  startsAt?: string;
  durationMinutes?: Appointment['durationMinutes'];
  modality?: Appointment['modality'];
}
export interface UpdateAppointmentInput {
  startsAt: string;
  durationMinutes: Appointment['durationMinutes'];
  modality: Appointment['modality'];
  quotedAmount: number;
}
export interface NewAppointmentPaymentInput { appointmentId: string; amount: number; method: AppointmentPaymentMovement['method']; note?: string; occurredAt: string; }
export interface NewAppointmentRefundInput { paymentMovementId: string; amount: number; occurredAt: string; note?: string; }

export interface UpdatePracticeSettingsInput {
  currency: ProfessionalPracticeSettings['currency'];
  defaultDurationMinutes: ProfessionalPracticeSettings['defaultDurationMinutes'];
  defaultVirtualPrice: number;
  defaultInPersonPrice: number;
  workingDays: ProfessionalPracticeSettings['workingDays'];
  scheduleBlocks: ProfessionalPracticeSettings['scheduleBlocks'];
  appointmentPolicy: ProfessionalPracticeSettings['appointmentPolicy'];
  notificationSettings: ProfessionalPracticeSettings['notificationSettings'];
  checkInSettings: ProfessionalPracticeSettings['checkInSettings'];
  anthropometricCustomFields?: AnthropometricCustomField[];
}
export interface UpdateOrganizationBrandingInput extends OrganizationBranding {}

export interface NewOrganizationInput {
  name: string;
  location: string;
  plan: OrganizationPlan;
  responsibleName: string;
  responsibleEmail: string;
}

export interface RegisterPaymentInput {
  amount: number;
  paidAt: string;
  method: string;
  note?: string;
}

export interface NewProfessionalResourceInput {
  title: string;
  kind: ProfessionalResourceKind;
  category: string;
  source: string;
  status?: PublicationStatus;
}

export interface NewProfessionalRecipeInput {
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
  imageUrl?: string;
  status?: Extract<PublicationStatus, 'draft' | 'published'>;
}

export interface NewPatientInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  age?: number;
  city?: string;
  objective?: string;
}

export interface UpdateProfessionalProfileInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialty?: ProfessionalSpecialty;
  registrationNumber?: string;
  registrationProvince?: string;
  registrationCountry?: string;
  timeZone: string;
}

export interface NewMealPlanInput {
  name: string;
  status?: Extract<MealPlanStatus, 'draft' | 'published'>;
  days: MealPlanDay[];
  generalNotes?: string;
  shoppingList?: string;
  goals?: string;
}

export interface NextStepListInput {
  title: string;
  durationDays: number;
  items: string[];
}

export interface MockContextType {
  currentDemoPatientId: string;
  setCurrentDemoPatientId: (id: string) => void;
  currentDemoPatient: Patient | null;
  currentDemoNutritionistId: string;
  setCurrentDemoNutritionistId: (id: string) => void;
  currentDemoNutritionist: Nutritionist | null;
  updateProfessionalProfile: (input: UpdateProfessionalProfileInput) => Nutritionist;
  organizations: Organization[];
  toggleOrganizationStatus: (id: string) => void;
  setOrganizationStatus: (
    id: string,
    status: OrganizationStatus,
    payment?: Omit<PaymentRecord, 'id' | 'currency' | 'plan'>,
  ) => void;
  addOrganization: (input: NewOrganizationInput) => Organization;
  changeOrganizationPlan: (id: string, plan: OrganizationPlan) => void;
  registerPayment: (id: string, payment: RegisterPaymentInput) => void;
  inviteAdditionalManager: (id: string, name: string, email: string) => ResponsibleMember;
  inviteNutritionist: (id: string, name: string, email: string) => ProfessionalInvitation;
  nutritionists: Nutritionist[];
  patients: Patient[];
  addPatient: (patientData: NewPatientInput) => Patient;
  revokePatientInvitation: (patientId: string) => void;
  resendPatientInvitation: (patientId: string) => void;
  checkInAssignments: CheckInAssignment[];
  createCheckInAssignment: (patientId: string) => CheckInAssignment;
  checkInResponses: CheckInResponse[];
  alerts: Alert[];
  acknowledgeAlert: (alertId: string) => void;
  resolveAlert: (alertId: string) => void;
  recommendations: Recommendation[];
  addRecommendation: (patientId: string, text: string) => Recommendation;
  submitCheckInResponse: (
    assignmentId: string,
    energyScore: number,
    adherenceScore: number,
    helpRequested: boolean,
    notes?: string,
    optionalScores?: Pick<CheckInResponse, 'sleepScore' | 'digestionScore' | 'satietyScore'>,
  ) => { confirmationMessage: string; alertsGenerated: number };
  professionalPatients: Patient[];
  professionalAlerts: Alert[];
  professionalAssignments: CheckInAssignment[];
  professionalRecommendations: Recommendation[];
  professionalMotivationalPhrases: MotivationalPhrase[];
  addMotivationalPhrase: (text: string) => MotivationalPhrase;
  updateMotivationalPhrase: (id: string, text: string) => MotivationalPhrase;
  duplicateMotivationalPhrase: (id: string) => MotivationalPhrase;
  deleteMotivationalPhrase: (id: string) => void;
  setMotivationalPhrasePatients: (id: string, patientIds: string[]) => void;
  professionalResources: ProfessionalResource[];
  professionalRecipes: ProfessionalRecipe[];
  patientResources: ProfessionalResource[];
  patientRecipes: ProfessionalRecipe[];
  addProfessionalResource: (input: NewProfessionalResourceInput) => ProfessionalResource;
  addProfessionalRecipe: (input: NewProfessionalRecipeInput) => ProfessionalRecipe;
  setProfessionalResourceStatus: (id: string, status: PublicationStatus) => void;
  updateProfessionalResource: (id: string, input: NewProfessionalResourceInput) => ProfessionalResource;
  setProfessionalRecipeStatus: (id: string, status: PublicationStatus) => void;
  duplicateProfessionalRecipe: (id: string) => ProfessionalRecipe;
  professionalMealPlans: MealPlanTemplate[];
  professionalMealPlanAssignments: MealPlanAssignment[];
  patientMealPlanAssignments: MealPlanAssignment[];
  createMealPlan: (input: NewMealPlanInput) => MealPlanTemplate;
  duplicateMealPlan: (id: string) => MealPlanTemplate;
  updateMealPlan: (id: string, input: NewMealPlanInput) => MealPlanTemplate;
  setMealPlanStatus: (id: string, status: MealPlanStatus) => void;
  assignMealPlan: (templateId: string, patientId: string, kind: MealPlanAssignmentKind) => MealPlanAssignment;
  endMealPlanAssignment: (patientId: string, kind: MealPlanAssignmentKind) => void;
  mealAdherenceRecords: MealAdherenceRecord[];
  setMealCompleted: (assignmentId: string, dayId: string, mealId: string, completed: boolean) => void;
  setMealComment: (assignmentId: string, dayId: string, mealId: string, comment: string) => void;
  markMealCommentReviewed: (recordId: string) => void;
  professionalNextStepLists: PatientNextStepList[];
  patientNextStepList: PatientNextStepList | null;
  createNextStepList: (input: NextStepListInput) => PatientNextStepList;
  updateNextStepList: (id: string, input: NextStepListInput) => PatientNextStepList;
  assignNextStepList: (id: string, patientId: string) => void;
  unassignNextStepList: (id: string) => void;
  duplicateNextStepList: (id: string) => PatientNextStepList;
  deleteNextStepList: (id: string) => void;
  updateNextStepItemByPatient: (listId: string, itemId: string, completed: boolean, comment: string) => void;
  professionalAnthropometricMeasurements: AnthropometricMeasurement[];
  updateOrganizationBranding: (organizationId: string, input: UpdateOrganizationBrandingInput) => void;
  patientAnthropometricMeasurements: AnthropometricMeasurement[];
  recordProfessionalAnthropometricMeasurement: (patientId: string, input: AnthropometricMeasurementInput) => AnthropometricMeasurement;
  updateProfessionalAnthropometricMeasurement: (measurementId: string, input: AnthropometricMeasurementInput) => AnthropometricMeasurement;
  deleteProfessionalAnthropometricMeasurement: (measurementId: string) => void;
  recordPatientAnthropometricMeasurement: (input: AnthropometricMeasurementInput) => AnthropometricMeasurement;
  professionalAppointments: Appointment[];
  createAppointment: (input: NewAppointmentInput) => Appointment;
  requestAppointmentByPatient: (input: PatientAppointmentRequestInput) => Appointment;
  updateAppointment: (appointmentId: string, input: UpdateAppointmentInput) => Appointment;
  rescheduleAppointment: (appointmentId: string, input: UpdateAppointmentInput) => Appointment;
  updateAppointmentStatus: (appointmentId: string, status: Appointment['status']) => void;
  updateAppointmentPrivateNote: (appointmentId: string, note: string) => void;
  resolveAppointmentBilling: (appointmentId: string, decision: 'no_charge' | 'pending' | 'partial_extra', amount?: number) => void;
  professionalAppointmentPaymentMovements: AppointmentPaymentMovement[];
  recordAppointmentPayment: (input: NewAppointmentPaymentInput) => AppointmentPaymentMovement;
  recordAppointmentRefund: (input: NewAppointmentRefundInput) => AppointmentPaymentMovement;
  patientAppointmentNotifications: AppointmentNotification[];
  professionalAppointmentChangeRequests: AppointmentChangeRequest[];
  patientAppointmentChangeRequests: AppointmentChangeRequest[];
  requestPatientAppointmentChange: (input: PatientAppointmentChangeRequestInput) => AppointmentChangeRequest;
  withdrawPatientAppointmentRequest: (appointmentId: string) => void;
  resolvePatientAppointmentChange: (requestId: string, decision: 'approved' | 'rejected', billingDecision?: 'no_charge' | 'pending' | 'partial_extra') => void;
  markAppointmentNotificationRead: (id: string) => void;
  professionalPracticeSettings: ProfessionalPracticeSettings | null;
  updateProfessionalPracticeSettings: (input: UpdatePracticeSettingsInput) => ProfessionalPracticeSettings;
  resetToInitialMockData: () => void;
}
