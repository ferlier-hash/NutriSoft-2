import { z } from 'zod';
import type { AdminPlatformBillingCycle, AdminPlatformReceipt, AdminPlatformRevenueRow, BillingFrequency, CommercialPlan } from '../admin-platform-revenue.types';

const frequency = z.enum(['monthly', 'yearly']);
const plan = z.enum(['pro', 'ultra', 'custom']);
const termHistory = z.object({
  term_id: z.string().uuid(), plan: plan, billing_frequency: frequency,
  amount: z.number().nonnegative(), currency: z.string().regex(/^[A-Z]{3}$/),
  effective_from: z.string(), effective_to: z.string().nullable(), cancelled_at: z.string().nullable(),
});
const revenueRow = z.object({
  organization_id: z.string().uuid(), organization_name: z.string().min(1), organization_slug: z.string().min(1),
  current_plan: plan.nullable(), term_id: z.string().uuid().nullable(), term_plan: plan.nullable(),
  billing_frequency: frequency.nullable(), term_amount: z.number().nonnegative().nullable(),
  term_currency: z.string().regex(/^[A-Z]{3}$/).nullable(), effective_from: z.string().nullable(),
  term_history: z.array(termHistory),
  received_by_currency: z.array(z.object({ currency: z.string().regex(/^[A-Z]{3}$/), amount: z.number().nonnegative(), receipt_count: z.number().int().nonnegative() })),
});
const receiptRow = z.object({
  receipt_id: z.string().uuid(), organization_id: z.string().uuid(), organization_name: z.string().min(1),
  received_on: z.string(), period_start: z.string(), period_end: z.string(), amount: z.number().positive(),
  currency: z.string().regex(/^[A-Z]{3}$/), status: z.enum(['received', 'voided']),
  billing_frequency: frequency, voided_at: z.string().nullable(), total_count: z.number().int().nonnegative(),
});
const billingCycleRow = z.object({
  organization_id: z.string().uuid(), organization_name: z.string().min(1), organization_slug: z.string().min(1),
  term_id: z.string().uuid(), plan_slug: plan, billing_frequency: frequency, expected_amount: z.number().nonnegative(),
  currency: z.string().regex(/^[A-Z]{3}$/), period_start: z.string(), period_end: z.string(), base_due_date: z.string(),
  due_date: z.string(), received_amount: z.number().nonnegative(), balance: z.number().nonnegative(),
  payment_status: z.enum(['paid', 'partial', 'unpaid']), due_status: z.enum(['settled', 'grace', 'overdue', 'due_today', 'upcoming']),
  extension_count: z.number().int().nonnegative(), latest_extension_at: z.string().nullable(),
});

async function apiClient() {
  const { getSupabaseClient } = await import('../../auth/supabase-client');
  return getSupabaseClient().schema('api');
}

export async function loadAdminPlatformRevenue(from: string, to: string): Promise<AdminPlatformRevenueRow[]> {
  const result = await (await apiClient()).rpc('get_admin_platform_revenue_report', { p_from: from, p_to: to });
  if (result.error) throw new Error('No pudimos cargar las tarifas y cobros de Nutrify.');
  const parsed = z.array(revenueRow).safeParse(result.data);
  if (!parsed.success) throw new Error('El servicio devolvió datos comerciales inválidos.');
  return parsed.data.map(row => ({
    organizationId: row.organization_id, organizationName: row.organization_name, organizationSlug: row.organization_slug,
    currentPlan: row.current_plan, termId: row.term_id, termPlan: row.term_plan,
    billingFrequency: row.billing_frequency, termAmount: row.term_amount, termCurrency: row.term_currency,
    effectiveFrom: row.effective_from,
    termHistory: row.term_history.map(term => ({ termId: term.term_id, plan: term.plan as CommercialPlan, billingFrequency: term.billing_frequency as BillingFrequency, amount: term.amount, currency: term.currency, effectiveFrom: term.effective_from, effectiveTo: term.effective_to, cancelledAt: term.cancelled_at })),
    receivedByCurrency: row.received_by_currency.map(item => ({ currency: item.currency, amount: item.amount, receiptCount: item.receipt_count })),
  }));
}

export async function loadAdminPlatformReceipts(from: string, to: string, limit = 25, offset = 0): Promise<{ rows: AdminPlatformReceipt[]; totalCount: number }> {
  const result = await (await apiClient()).rpc('get_admin_platform_receipts', { p_from: from, p_to: to, p_limit: limit, p_offset: offset });
  if (result.error) throw new Error('No pudimos cargar los cobros registrados de Nutrify.');
  const parsed = z.array(receiptRow).safeParse(result.data);
  if (!parsed.success) throw new Error('El servicio devolvió movimientos comerciales inválidos.');
  const rows = parsed.data.map(row => ({ receiptId: row.receipt_id, organizationId: row.organization_id, organizationName: row.organization_name, receivedOn: row.received_on, periodStart: row.period_start, periodEnd: row.period_end, amount: row.amount, currency: row.currency, status: row.status, billingFrequency: row.billing_frequency, voidedAt: row.voided_at, totalCount: row.total_count }));
  return { rows, totalCount: rows[0]?.totalCount ?? 0 };
}

export async function loadAdminPlatformBilling(from: string, to: string): Promise<AdminPlatformBillingCycle[]> {
  const result = await (await apiClient()).rpc('get_admin_platform_billing_report', { p_from: from, p_to: to });
  if (result.error) throw new Error('No pudimos cargar los vencimientos comerciales.');
  const parsed = z.array(billingCycleRow).safeParse(result.data);
  if (!parsed.success) throw new Error('El servicio devolvió ciclos comerciales inválidos.');
  return parsed.data.map(row => ({
    organizationId: row.organization_id, organizationName: row.organization_name, organizationSlug: row.organization_slug,
    termId: row.term_id, plan: row.plan_slug, frequency: row.billing_frequency, expectedAmount: row.expected_amount,
    currency: row.currency, periodStart: row.period_start, periodEnd: row.period_end, dueDate: row.due_date,
    receivedAmount: row.received_amount, balance: row.balance, paymentStatus: row.payment_status,
    dueStatus: row.due_status, extensionCount: row.extension_count, latestExtensionAt: row.latest_extension_at,
  }));
}

export async function extendAdminPlatformBillingDueDate(termId: string, periodStart: string, newDueDate: string): Promise<void> {
  const result = await (await apiClient()).rpc('extend_admin_commercial_billing_due_date', { p_term_id: termId, p_period_start: periodStart, p_new_due_date: newDueDate });
  if (result.error) throw new Error('No pudimos otorgar la prórroga. Verificá que el ciclo siga pendiente y que la nueva fecha sea posterior al vencimiento actual.');
}

export async function setAdminCommercialTerm(input: { organizationId: string; plan: CommercialPlan; frequency: BillingFrequency; amount: number; currency: string; effectiveFrom: string }) {
  const result = await (await apiClient()).rpc('set_admin_organization_commercial_term', { p_organization_id: input.organizationId, p_plan_slug: input.plan, p_billing_frequency: input.frequency, p_amount: input.amount, p_currency: input.currency, p_effective_from: input.effectiveFrom });
  if (result.error) throw new Error('No pudimos guardar la nueva tarifa. Verificá la fecha y que comience después de la tarifa vigente.');
}

export async function recordAdminCommercialReceipt(input: { organizationId: string; termId: string; requestId: string; amount: number; currency: string; receivedOn: string; periodStart: string; periodEnd: string }) {
  const result = await (await apiClient()).rpc('record_admin_organization_commercial_receipt', { p_organization_id: input.organizationId, p_term_id: input.termId, p_request_id: input.requestId, p_amount: input.amount, p_currency: input.currency, p_received_on: input.receivedOn, p_period_start: input.periodStart, p_period_end: input.periodEnd });
  if (result.error) throw new Error('No pudimos registrar el cobro. Revisá que la fecha y el período correspondan a la tarifa.');
}

export async function voidAdminCommercialReceipt(receiptId: string) {
  const result = await (await apiClient()).rpc('void_admin_organization_commercial_receipt', { p_receipt_id: receiptId });
  if (result.error) throw new Error('No pudimos anular el registro. Puede que ya esté anulado.');
}
