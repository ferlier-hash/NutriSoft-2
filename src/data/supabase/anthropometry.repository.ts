import { z } from 'zod';
import { getSupabaseClient } from '../../auth/supabase-client';

const patientSchema = z.object({ id: z.string(), organization_id: z.string(), first_name: z.string(), last_name: z.string() });
const fieldSchema = z.object({ id: z.string(), organization_id: z.string(), label: z.string(), unit: z.string(), position: z.number(), status: z.enum(['active', 'archived']) });
const revisionSchema = z.object({ id: z.string(), patient_id: z.string(), recorded_on: z.string(), values: z.record(z.number()), note: z.string().nullable(), can_edit: z.boolean() });
export type AnthropometryPatient = z.infer<typeof patientSchema>;
export type AnthropometryField = z.infer<typeof fieldSchema>;
export type AnthropometryRevision = z.infer<typeof revisionSchema>;
const api = () => getSupabaseClient().schema('api');
export async function loadAnthropometryPatients() {
  const { data, error } = await api().from('anthropometry_patients').select('*').order('last_name');
  if (error) throw new Error('No pudimos cargar las fichas autorizadas. Reintentá.');
  return z.array(patientSchema).parse(data);
}
export async function loadAnthropometryFields(organizationId: string) {
  const { data, error } = await api().from('professional_anthropometric_fields').select('*').eq('organization_id', organizationId).order('position').order('id');
  if (error) throw new Error('No pudimos cargar los campos de antropometría.');
  return z.array(fieldSchema).parse(data);
}
export async function loadAnthropometry(patientId: string) {
  const { data, error } = await api().from('professional_patient_anthropometry').select('*').eq('patient_id', patientId).order('recorded_on').order('created_at');
  if (error) throw new Error('No pudimos cargar las revisiones.');
  return z.array(revisionSchema).parse(data);
}
export async function saveAnthropometry(patientId: string, id: string | undefined, date: string, values: Record<string, number>, note: string) {
  const { error } = await api().rpc('save_patient_anthropometric_revision', { p_patient_id: patientId, p_revision_id: id ?? null!, p_recorded_on: date, p_values: values, p_note: note });
  if (error) throw new Error('No se guardó la revisión. Revisá la fecha, las mediciones y tu acceso a esta ficha.');
}
export async function deleteAnthropometry(id: string) {
  const { error } = await api().rpc('delete_patient_anthropometric_revision', { p_revision_id: id });
  if (error) throw new Error('No pudimos eliminar la revisión.');
}
export async function saveAnthropometryField(organizationId: string, field: { id?: string; label: string; unit: string; position: number; status: 'active' | 'archived' }) {
  const { error } = await api().rpc('save_anthropometric_field', { p_org_id: organizationId, p_field_id: field.id ?? null!, p_label: field.label, p_unit: field.unit, p_position: field.position, p_status: field.status });
  if (error) throw new Error('No se guardó el campo. Comprobá que el nombre no esté repetido y que conserves acceso.');
}
