import type {
  Alert,
  CheckInAssignment,
  Nutritionist,
  Organization,
  Patient,
  ProfessionalRecipe,
  ProfessionalResource,
  Recommendation,
} from '../types';

export function deriveNutritionistsWithCounts(
  nutritionists: Nutritionist[],
  patients: Patient[],
): Nutritionist[] {
  return nutritionists.map(nutritionist => ({
    ...nutritionist,
    assignedPatientsCount: patients.filter(
      patient =>
        patient.assignedNutritionistId === nutritionist.id && patient.status !== 'archived',
    ).length,
  }));
}

export function deriveOrganizationsWithCounts(
  organizations: Organization[],
  nutritionists: Nutritionist[],
  patients: Patient[],
): Organization[] {
  return organizations.map(organization => ({
    ...organization,
    nutritionistsCount: nutritionists.filter(
      nutritionist => nutritionist.organizationId === organization.id,
    ).length,
    patientsCount: patients.filter(
      patient => patient.organizationId === organization.id && patient.status !== 'archived',
    ).length,
  }));
}

export function selectProfessionalPatients(
  patients: Patient[],
  nutritionist: Nutritionist | null,
): Patient[] {
  if (!nutritionist) return [];
  return patients.filter(
    patient =>
      patient.assignedNutritionistId === nutritionist.id &&
      patient.organizationId === nutritionist.organizationId &&
      patient.status !== 'archived',
  );
}

function selectRecordsForPatients<T extends { patientId: string }>(
  records: T[],
  patients: Patient[],
): T[] {
  const patientIds = new Set(patients.map(patient => patient.id));
  return records.filter(record => patientIds.has(record.patientId));
}

export const selectProfessionalAlerts = (alerts: Alert[], patients: Patient[]) =>
  selectRecordsForPatients(alerts, patients);

export const selectProfessionalAssignments = (
  assignments: CheckInAssignment[],
  patients: Patient[],
) => selectRecordsForPatients(assignments, patients);

export const selectProfessionalRecommendations = (
  recommendations: Recommendation[],
  patients: Patient[],
) => selectRecordsForPatients(recommendations, patients);

export function selectProfessionalResources(
  resources: ProfessionalResource[],
  nutritionist: Nutritionist | null,
): ProfessionalResource[] {
  if (!nutritionist) return [];
  return resources.filter(
    resource =>
      resource.ownerNutritionistId === nutritionist.id &&
      resource.organizationId === nutritionist.organizationId,
  );
}

export function selectProfessionalRecipes(
  recipes: ProfessionalRecipe[],
  nutritionist: Nutritionist | null,
): ProfessionalRecipe[] {
  if (!nutritionist) return [];
  return recipes.filter(
    recipe =>
      recipe.ownerNutritionistId === nutritionist.id &&
      recipe.organizationId === nutritionist.organizationId,
  );
}

export function selectPublishedPatientResources(
  resources: ProfessionalResource[],
  patient: Patient | null,
): ProfessionalResource[] {
  if (!patient) return [];
  return resources.filter(
    resource =>
      resource.organizationId === patient.organizationId &&
      resource.ownerNutritionistId === patient.assignedNutritionistId &&
      resource.status === 'published',
  );
}

export function selectPublishedPatientRecipes(
  recipes: ProfessionalRecipe[],
  patient: Patient | null,
): ProfessionalRecipe[] {
  if (!patient) return [];
  return recipes.filter(
    recipe =>
      recipe.organizationId === patient.organizationId &&
      recipe.ownerNutritionistId === patient.assignedNutritionistId &&
      recipe.status === 'published',
  );
}
