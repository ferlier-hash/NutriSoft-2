export type IncomeAppointment = { id: string; patient_id: string; starts_at: string; time_zone: string; quoted_amount: number; currency: string; payment_status: string; status: string; modality: string };
export type IncomeMovement = { id: string; appointment_id: string; amount: number; currency: string; movement_kind: string; method: string; note: string | null; occurred_at: string; refunded_payment_id: string | null; revision_id?: string; correction_count?: number; original_amount?: number };
export const civilDate = (stamp: string, zone: string) => new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(stamp));
export const incomeMoney = (value: number, currency: string) => new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
export const signedIncome = (m: IncomeMovement) => m.movement_kind === 'refund' ? -m.amount : m.amount;
export const netIncome = (id: string, movements: IncomeMovement[]) => movements.filter(m => m.appointment_id === id).reduce((sum, m) => sum + signedIncome(m), 0);
export const pendingIncome = (a: IncomeAppointment, movements: IncomeMovement[]) => ['pending', 'partial'].includes(a.payment_status) ? Math.max(0, a.quoted_amount - netIncome(a.id, movements)) : 0;
export function incomeMetrics(appointments: IncomeAppointment[], movements: IncomeMovement[], now = new Date()) {
  const rows = movements.filter(m => appointments.some(a => a.id === m.appointment_id));
  return {
    paid: rows.reduce((sum, m) => sum + signedIncome(m), 0),
    pending: appointments.reduce((sum, a) => sum + pendingIncome(a, rows), 0),
    partial: appointments.filter(a => a.payment_status === 'partial').reduce((sum, a) => sum + pendingIncome(a, rows), 0),
    projected: appointments.filter(a => new Date(a.starts_at) > now && ['requested', 'confirmed'].includes(a.status)).reduce((sum, a) => sum + a.quoted_amount, 0),
    lost: appointments.filter(a => ['cancelled_by_patient', 'cancelled_by_professional', 'no_show'].includes(a.status) && a.payment_status === 'no_charge').reduce((sum, a) => sum + a.quoted_amount, 0),
  };
}
export function incomeMonths(first: string, last: string): string[] | null {
  const index = (v: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(v) ? Number(v.slice(0, 4)) * 12 + Number(v.slice(5)) - 1 : NaN;
  const start = index(first), end = index(last);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || end - start >= 240) return null;
  return Array.from({ length: end - start + 1 }, (_, i) => `${Math.floor((start + i) / 12).toString().padStart(4, '0')}-${((start + i) % 12 + 1).toString().padStart(2, '0')}`);
}
export function monthlyIncome(keys: string[], appointments: IncomeAppointment[], movements: IncomeMovement[]) {
  const rows = new Map(keys.map(key => [key, { key, paid: 0, pending: 0 }]));
  const byId = new Map(appointments.map(a => [a.id, a]));
  for (const m of movements) {
    const a = byId.get(m.appointment_id);
    if (!a) continue;
    const row = rows.get(civilDate(m.occurred_at, a.time_zone).slice(0, 7));
    if (row) row.paid += signedIncome(m);
  }
  for (const a of appointments) {
    const row = rows.get(civilDate(a.starts_at, a.time_zone).slice(0, 7));
    if (row) row.pending += pendingIncome(a, movements);
  }
  return [...rows.values()];
}
