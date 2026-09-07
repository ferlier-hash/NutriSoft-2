import { describe, expect, it } from 'vitest';
import {
  parseMealPlanActivity,
  parsePatientMealPlans,
  parseProfessionalMealPlans,
} from '../data/supabase/clinical-meal-plans.repository';

const ids = {
  plan: '10000000-0000-4000-8000-000000000001',
  org: '10000000-0000-4000-8000-000000000002',
  patient: '10000000-0000-4000-8000-000000000003',
  owner: '10000000-0000-4000-8000-000000000004',
  version: '10000000-0000-4000-8000-000000000005',
  assignment: '10000000-0000-4000-8000-000000000006',
  day: '10000000-0000-4000-8000-000000000007',
  meal: '10000000-0000-4000-8000-000000000008',
  item: '10000000-0000-4000-8000-000000000009',
  activity: '10000000-0000-4000-8000-000000000010',
};

const timestamp = '2026-08-21T12:00:00+00:00';
const content = { days: [{ id: ids.day, title: 'Todo moderado', meals: [{ id: ids.meal, type: 'Almuerzo', items: [{ id: ids.item, description: 'Bowl de quinoa', quantity: '1 plato' }] }] }] };

describe('repositorio real de planes alimentarios', () => {
  it('mapea el contrato profesional sin aceptar datos parciales', () => {
    const plan = parseProfessionalMealPlans([{ id: ids.plan, organization_id: ids.org, patient_id: ids.patient, patient_first_name: 'María', patient_last_name: 'González', title: 'Plan', status: 'published', assignment_kind: 'primary', assignment_status: 'active', visible_version_id: ids.version, draft_version_id: null, editable_version_number: 1, editable_title: 'Plan', editable_content: content, published_version_number: 1, published_at: timestamp, pending_comment_count: 2, created_at: timestamp, updated_at: timestamp }])[0]!;
    expect(plan.patientName).toBe('María González');
    expect(plan.pendingCommentCount).toBe(2);
    expect(plan.content.days[0]?.meals[0]?.items[0]?.description).toBe('Bowl de quinoa');
    expect(() => parseProfessionalMealPlans([{ id: 'no-es-uuid' }])).toThrow(/inválidos/);
  });

  it('mapea únicamente el snapshot publicado que recibe el paciente', () => {
    const plan = parsePatientMealPlans([{ id: ids.plan, organization_id: ids.org, patient_id: ids.patient, assignment_id: ids.assignment, assignment_kind: 'primary', version_id: ids.version, version_number: 1, title: 'Plan', content, published_at: timestamp }])[0]!;
    expect(plan.assignmentKind).toBe('primary');
    expect(plan.versionNumber).toBe(1);
  });

  it('conserva sólo el estado y comentario clínico actual del contrato', () => {
    const activity = parseMealPlanActivity([{ id: ids.activity, assignment_id: ids.assignment, meal_plan_id: ids.plan, patient_id: ids.patient, day_id: ids.day, meal_id: ids.meal, adherence_status: 'partial', patient_comment: 'Cambié una guarnición', comment_updated_at: timestamp, reviewed_at: null, updated_at: timestamp }])[0]!;
    expect(activity.adherenceStatus).toBe('partial');
    expect(activity.patientComment).toBe('Cambié una guarnición');
    expect(activity.reviewedAt).toBeUndefined();
  });
});
