import type { ClinicalPatient, InitialMeasurements, RecentPatientAppointment } from '../data/supabase/patient-profile.repository';
import type { AnthropometryField, AnthropometryRevision } from '../data/supabase/anthropometry.repository';
import type { DailyCheckin, DailyWeight } from '../data/supabase/daily-followup.repository';
import type { RealProfessionalMealPlan } from '../data/clinical-meal-plans.types';

export const clinicalReportSections = [
  ['profile', 'Información y referencia'],
  ['anthropometry', 'Antropometría'],
  ['weight', 'Peso cotidiano'],
  ['checkins', 'Check-ins'],
  ['plans', 'Planes alimentarios'],
  ['appointments', 'Citas recientes'],
] as const;
export type ClinicalReportSection = typeof clinicalReportSections[number][0];

export interface ClinicalReportData {
  patient: ClinicalPatient;
  initial: InitialMeasurements | null;
  anthropometry: AnthropometryRevision[];
  anthropometryFields: AnthropometryField[];
  weights: DailyWeight[];
  checkins: DailyCheckin[];
  plans: RealProfessionalMealPlan[];
  appointments: RecentPatientAppointment[];
}

export interface ClinicalReport {
  data: ClinicalReportData;
  sections: ClinicalReportSection[];
  from: string;
  to: string;
  includeNotes: boolean;
  professionalName?: string;
  organizationName?: string;
  logoUrl?: string;
}

export const inClinicalReportPeriod = (date: string | null | undefined, from: string, to: string) => Boolean(date && date.slice(0, 10) >= from && date.slice(0, 10) <= to);

export function reportEntryCount(report: ClinicalReport) {
  const { data, from, to, sections } = report;
  return (sections.includes('profile') ? 1 : 0)
    + (sections.includes('anthropometry') ? data.anthropometry.filter(row => inClinicalReportPeriod(row.recorded_on, from, to)).length : 0)
    + (sections.includes('weight') ? data.weights.filter(row => inClinicalReportPeriod(row.recorded_on, from, to)).length : 0)
    + (sections.includes('checkins') ? data.checkins.filter(row => inClinicalReportPeriod(row.submitted_at ?? row.created_at, from, to)).length : 0)
    + (sections.includes('plans') ? data.plans.length : 0)
    + (sections.includes('appointments') ? data.appointments.filter(row => inClinicalReportPeriod(row.starts_at, from, to)).length : 0);
}
