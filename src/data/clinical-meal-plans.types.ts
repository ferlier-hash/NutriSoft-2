export type MealPlanAssignmentKind = 'primary' | 'complement';
export type MealPlanAdherenceStatus = 'completed' | 'partial' | 'not_completed';

export interface ClinicalMealPlanItem {
  id: string;
  description: string;
  quantity?: string;
  recipeId?: string;
}

export interface ClinicalMealPlanMeal {
  id: string;
  type: string;
  alternatives?: string;
  items: ClinicalMealPlanItem[];
}

export interface ClinicalMealPlanDay {
  id: string;
  title?: string;
  meals: ClinicalMealPlanMeal[];
}

export interface ClinicalMealPlanContent {
  days: ClinicalMealPlanDay[];
  generalIndications?: string;
  shoppingList?: string;
  objectives?: string;
}

export interface RealProfessionalMealPlan {
  id: string;
  organizationId: string;
  patientId?: string;
  patientName?: string;
  title: string;
  status: 'draft' | 'published' | 'archived';
  assignmentKind?: MealPlanAssignmentKind;
  assignmentStatus?: 'pending' | 'active' | 'ended';
  draftVersionId?: string;
  visibleVersionId?: string;
  editableVersionNumber: number;
  publishedVersionNumber?: number;
  content: ClinicalMealPlanContent;
  pendingCommentCount: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RealPatientMealPlan {
  id: string;
  organizationId: string;
  patientId: string;
  assignmentId: string;
  assignmentKind: MealPlanAssignmentKind;
  versionId: string;
  versionNumber: number;
  title: string;
  content: ClinicalMealPlanContent;
  publishedAt: string;
}

export interface RealMealPlanActivity {
  id: string;
  assignmentId: string;
  mealPlanId: string;
  patientId: string;
  dayId: string;
  mealId: string;
  adherenceStatus?: MealPlanAdherenceStatus;
  patientComment?: string;
  commentUpdatedAt?: string;
  reviewedAt?: string;
  updatedAt: string;
}

export interface RealProfessionalPatient {
  id: string;
  firstName: string;
  lastName: string;
}
