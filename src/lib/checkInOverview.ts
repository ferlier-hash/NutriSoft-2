import type { CheckInAssignment, CheckInResponse, Patient } from '../types';

export type CheckInPriority = 'high' | 'medium' | 'normal' | 'none';
export type CheckInDateRange = 'all' | 'today' | '7days' | '15days' | 'month' | 'custom';
export type CheckInSort = 'date-desc' | 'date-asc' | 'patient-asc';

export interface CheckInOverviewRow {
  patient: Patient;
  latestResponse?: CheckInResponse;
  latestAssignment?: CheckInAssignment;
  priority: CheckInPriority;
}

export function deriveCheckInPriority(response?: CheckInResponse): CheckInPriority {
  if (!response) return 'none';
  if (response.helpRequested || response.energyScore <= 2 || response.adherenceScore <= 2) return 'high';
  if (response.energyScore === 3 || response.adherenceScore === 3) return 'medium';
  return 'normal';
}

export function buildCheckInOverviewRows(patients: Patient[], assignments: CheckInAssignment[], responses: CheckInResponse[]): CheckInOverviewRow[] {
  return patients.map(patient => {
    const latestResponse = responses
      .filter(response => response.patientId === patient.id)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
    const latestAssignment = assignments
      .filter(assignment => assignment.patientId === patient.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    return { patient, latestResponse, latestAssignment, priority: deriveCheckInPriority(latestResponse) };
  });
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function isResponseInDateRange(response: CheckInResponse | undefined, range: CheckInDateRange, customStart?: string, customEnd?: string, now = new Date()): boolean {
  if (range === 'all') return true;
  if (!response) return false;
  const submitted = new Date(response.submittedAt);
  if (Number.isNaN(submitted.getTime())) return false;
  const today = startOfDay(now);
  if (range === 'today') return submitted >= today;
  if (range === '7days' || range === '15days') {
    const days = range === '7days' ? 7 : 15;
    const start = new Date(today);
    start.setDate(start.getDate() - (days - 1));
    return submitted >= start && submitted <= now;
  }
  if (range === 'month') return submitted.getFullYear() === now.getFullYear() && submitted.getMonth() === now.getMonth();
  if (!customStart || !customEnd) return false;
  const start = new Date(`${customStart}T00:00:00`);
  const end = new Date(`${customEnd}T23:59:59.999`);
  return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && submitted >= start && submitted <= end;
}

export function sortCheckInRows(rows: CheckInOverviewRow[], sort: CheckInSort): CheckInOverviewRow[] {
  return [...rows].sort((a, b) => {
    if (sort === 'patient-asc') return `${a.patient.lastName} ${a.patient.firstName}`.localeCompare(`${b.patient.lastName} ${b.patient.firstName}`, 'es');
    if (!a.latestResponse && !b.latestResponse) return 0;
    if (!a.latestResponse) return 1;
    if (!b.latestResponse) return -1;
    const aTime = a.latestResponse ? new Date(a.latestResponse.submittedAt).getTime() : -Infinity;
    const bTime = b.latestResponse ? new Date(b.latestResponse.submittedAt).getTime() : -Infinity;
    return sort === 'date-asc' ? aTime - bTime : bTime - aTime;
  });
}
