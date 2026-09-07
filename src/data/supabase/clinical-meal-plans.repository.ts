import { z } from 'zod';
import type { Json } from '../../types/database.types';
import type {
  ClinicalMealPlanContent,
  MealPlanAdherenceStatus,
  MealPlanAssignmentKind,
  RealMealPlanActivity,
  RealPatientMealPlan,
  RealProfessionalPatient,
  RealProfessionalMealPlan,
} from '../clinical-meal-plans.types';

const optionalTrimmedText = z.string().trim().optional();
const mealPlanContentSchema = z.object({
  days: z.array(z.object({
    id: z.string().uuid(),
    title: optionalTrimmedText,
    meals: z.array(z.object({
      id: z.string().uuid(),
      type: z.string().trim().min(1),
      alternatives: optionalTrimmedText,
      items: z.array(z.object({
        id: z.string().uuid(),
        description: z.string().trim().min(1),
        quantity: optionalTrimmedText,
        recipe_id: z.string().uuid().optional(),
      })).max(50),
    })).max(4),
  })).max(30),
  general_indications: optionalTrimmedText,
  shopping_list: optionalTrimmedText,
  objectives: optionalTrimmedText,
});

const professionalPlanRowSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  patient_id: z.string().uuid().nullable(),
  patient_first_name: z.string().nullable(),
  patient_last_name: z.string().nullable(),
  title: z.string().min(1),
  status: z.enum(['draft', 'published', 'archived']),
  assignment_kind: z.enum(['primary', 'complement']).nullable(),
  assignment_status: z.enum(['pending', 'active', 'ended']).nullable(),
  visible_version_id: z.string().uuid().nullable(),
  draft_version_id: z.string().uuid().nullable(),
  editable_version_number: z.number().int().positive(),
  editable_title: z.string().min(1),
  editable_content: mealPlanContentSchema,
  published_version_number: z.number().int().positive().nullable(),
  published_at: z.string().datetime({ offset: true }).nullable(),
  pending_comment_count: z.number().int().nonnegative(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});

const patientPlanRowSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  patient_id: z.string().uuid(),
  assignment_id: z.string().uuid(),
  assignment_kind: z.enum(['primary', 'complement']),
  version_id: z.string().uuid(),
  version_number: z.number().int().positive(),
  title: z.string().min(1),
  content: mealPlanContentSchema,
  published_at: z.string().datetime({ offset: true }),
});

const activityRowSchema = z.object({
  id: z.string().uuid(),
  assignment_id: z.string().uuid(),
  meal_plan_id: z.string().uuid(),
  patient_id: z.string().uuid(),
  day_id: z.string().uuid(),
  meal_id: z.string().uuid(),
  adherence_status: z.enum(['completed', 'partial', 'not_completed']).nullable(),
  patient_comment: z.string().nullable(),
  comment_updated_at: z.string().datetime({ offset: true }).nullable(),
  reviewed_at: z.string().datetime({ offset: true }).nullable(),
  updated_at: z.string().datetime({ offset: true }),
});

const professionalPatientRowSchema = z.object({
  id: z.string().uuid(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
});

function mapContent(content: z.infer<typeof mealPlanContentSchema>): ClinicalMealPlanContent {
  return {
    days: content.days.map(day => ({
      id: day.id,
      title: day.title,
      meals: day.meals.map(meal => ({
        id: meal.id,
        type: meal.type,
        alternatives: meal.alternatives,
        items: meal.items.map(item => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          recipeId: item.recipe_id,
        })),
      })),
    })),
    generalIndications: content.general_indications,
    shoppingList: content.shopping_list,
    objectives: content.objectives,
  };
}

function toDatabaseContent(content: ClinicalMealPlanContent): Json {
  return {
    days: content.days.map(day => ({
      id: day.id,
      title: day.title,
      meals: day.meals.map(meal => ({
        id: meal.id,
        type: meal.type,
        alternatives: meal.alternatives,
        items: meal.items.map(item => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          recipe_id: item.recipeId,
        })),
      })),
    })),
    general_indications: content.generalIndications,
    shopping_list: content.shoppingList,
    objectives: content.objectives,
  };
}

export function parseProfessionalMealPlans(value: unknown): RealProfessionalMealPlan[] {
  const rows = z.array(professionalPlanRowSchema).safeParse(value);
  if (!rows.success) throw new Error('El servicio devolvió planes profesionales inválidos.');
  return rows.data.map(row => ({
    id: row.id,
    organizationId: row.organization_id,
    patientId: row.patient_id ?? undefined,
    patientName: [row.patient_first_name, row.patient_last_name].filter(Boolean).join(' ') || undefined,
    title: row.editable_title,
    status: row.status,
    assignmentKind: row.assignment_kind ?? undefined,
    assignmentStatus: row.assignment_status ?? undefined,
    draftVersionId: row.draft_version_id ?? undefined,
    visibleVersionId: row.visible_version_id ?? undefined,
    editableVersionNumber: row.editable_version_number,
    publishedVersionNumber: row.published_version_number ?? undefined,
    content: mapContent(row.editable_content),
    pendingCommentCount: row.pending_comment_count,
    publishedAt: row.published_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function parsePatientMealPlans(value: unknown): RealPatientMealPlan[] {
  const rows = z.array(patientPlanRowSchema).safeParse(value);
  if (!rows.success) throw new Error('El servicio devolvió planes del paciente inválidos.');
  return rows.data.map(row => ({
    id: row.id,
    organizationId: row.organization_id,
    patientId: row.patient_id,
    assignmentId: row.assignment_id,
    assignmentKind: row.assignment_kind,
    versionId: row.version_id,
    versionNumber: row.version_number,
    title: row.title,
    content: mapContent(row.content),
    publishedAt: row.published_at,
  }));
}

export function parseMealPlanActivity(value: unknown): RealMealPlanActivity[] {
  const rows = z.array(activityRowSchema).safeParse(value);
  if (!rows.success) throw new Error('El servicio devolvió seguimiento del plan inválido.');
  return rows.data.map(row => ({
    id: row.id,
    assignmentId: row.assignment_id,
    mealPlanId: row.meal_plan_id,
    patientId: row.patient_id,
    dayId: row.day_id,
    mealId: row.meal_id,
    adherenceStatus: row.adherence_status ?? undefined,
    patientComment: row.patient_comment ?? undefined,
    commentUpdatedAt: row.comment_updated_at ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    updatedAt: row.updated_at,
  }));
}

async function client() {
  const { getSupabaseClient } = await import('../../auth/supabase-client');
  return getSupabaseClient();
}

function assertResult<T>(data: T | null, error: { message: string } | null, message: string): T {
  if (error || data === null) throw new Error(message);
  return data;
}

export async function loadProfessionalMealPlans(): Promise<RealProfessionalMealPlan[]> {
  const supabase = await client();
  const { data, error } = await supabase.schema('api').from('professional_meal_plans').select('*').order('updated_at', { ascending: false });
  return parseProfessionalMealPlans(assertResult(data, error, 'No pudimos cargar los planes alimentarios.'));
}

export async function loadPatientMealPlans(): Promise<RealPatientMealPlan[]> {
  const supabase = await client();
  const { data, error } = await supabase.schema('api').from('patient_current_meal_plans').select('*').order('assignment_kind');
  return parsePatientMealPlans(assertResult(data, error, 'No pudimos cargar tu plan alimentario.'));
}

export async function loadMealPlanActivity(mealPlanId?: string): Promise<RealMealPlanActivity[]> {
  const supabase = await client();
  let query = supabase.schema('api').from('meal_plan_meal_activity').select('*').order('updated_at', { ascending: false });
  if (mealPlanId) query = query.eq('meal_plan_id', mealPlanId);
  const { data, error } = await query;
  return parseMealPlanActivity(assertResult(data, error, 'No pudimos cargar el seguimiento del plan.'));
}

export async function loadProfessionalPatients(): Promise<RealProfessionalPatient[]> {
  const supabase = await client();
  const { data, error } = await supabase.schema('api').from('patient_directory').select('id,first_name,last_name').order('last_name');
  const rows = z.array(professionalPatientRowSchema).safeParse(assertResult(data, error, 'No pudimos cargar los pacientes disponibles.'));
  if (!rows.success) throw new Error('El servicio devolvió pacientes inválidos.');
  return rows.data.map(row => ({ id: row.id, firstName: row.first_name, lastName: row.last_name }));
}

export async function createMealPlan(organizationId: string, title: string, content: ClinicalMealPlanContent): Promise<string> {
  const supabase = await client();
  const { data, error } = await supabase.schema('api').rpc('create_meal_plan', {
    p_org_id: organizationId,
    p_title: title.trim(),
    p_content: toDatabaseContent(content),
  });
  return assertResult(data, error, 'No pudimos crear el plan alimentario.');
}

export async function updateMealPlanDraft(mealPlanId: string, title: string, content: ClinicalMealPlanContent): Promise<string> {
  const supabase = await client();
  const { data, error } = await supabase.schema('api').rpc('update_meal_plan_draft', {
    p_meal_plan_id: mealPlanId,
    p_title: title.trim(),
    p_content: toDatabaseContent(content),
  });
  return assertResult(data, error, 'No pudimos guardar el borrador del plan.');
}

export async function assignMealPlan(mealPlanId: string, patientId: string, kind: MealPlanAssignmentKind): Promise<string> {
  const supabase = await client();
  const { data, error } = await supabase.schema('api').rpc('assign_meal_plan', {
    p_meal_plan_id: mealPlanId,
    p_patient_id: patientId,
    p_assignment_kind: kind,
  });
  return assertResult(data, error, 'No pudimos asignar el plan al paciente.');
}

export async function publishMealPlan(mealPlanId: string): Promise<string> {
  const supabase = await client();
  const { data, error } = await supabase.schema('api').rpc('publish_meal_plan', { p_meal_plan_id: mealPlanId });
  return assertResult(data, error, 'No pudimos publicar los cambios del plan.');
}

export async function duplicateMealPlan(mealPlanId: string, title?: string): Promise<string> {
  const supabase = await client();
  const { data, error } = await supabase.schema('api').rpc('duplicate_meal_plan', {
    p_source_meal_plan_id: mealPlanId,
    p_title: title?.trim(),
  });
  return assertResult(data, error, 'No pudimos duplicar el plan alimentario.');
}

export async function retireMealPlan(mealPlanId: string): Promise<void> {
  const supabase = await client();
  const { data, error } = await supabase.schema('api').rpc('retire_meal_plan', { p_meal_plan_id: mealPlanId });
  if (error || data !== true) throw new Error('No pudimos retirar el plan.');
}

export async function setMealPlanActivity(input: {
  mealPlanId: string;
  dayId: string;
  mealId: string;
  adherenceStatus?: MealPlanAdherenceStatus;
  comment?: string;
}): Promise<string> {
  const supabase = await client();
  const { data, error } = await supabase.schema('api').rpc('set_meal_plan_meal_activity', {
    p_meal_plan_id: input.mealPlanId,
    p_day_id: input.dayId,
    p_meal_id: input.mealId,
    p_adherence_status: input.adherenceStatus,
    p_comment: input.comment,
  });
  return assertResult(data, error, 'No pudimos guardar el avance de esta comida.');
}

export async function reviewMealPlanComment(activityId: string): Promise<void> {
  const supabase = await client();
  const { data, error } = await supabase.schema('api').rpc('review_meal_plan_comment', { p_activity_id: activityId });
  if (error || data !== true) throw new Error('No pudimos marcar el comentario como revisado.');
}
