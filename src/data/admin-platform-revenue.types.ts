export type BillingFrequency = 'monthly' | 'yearly';
export type CommercialPlan = 'pro' | 'ultra' | 'custom';
export type CommercialPaymentStatus = 'paid' | 'partial' | 'unpaid';
export type CommercialDueStatus = 'settled' | 'grace' | 'overdue' | 'due_today' | 'upcoming';

export interface AdminCommercialTermHistory {
  termId: string;
  plan: CommercialPlan;
  billingFrequency: BillingFrequency;
  amount: number;
  currency: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  cancelledAt: string | null;
}

export interface AdminPlatformRevenueRow {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  currentPlan: CommercialPlan | null;
  termId: string | null;
  termPlan: CommercialPlan | null;
  billingFrequency: BillingFrequency | null;
  termAmount: number | null;
  termCurrency: string | null;
  effectiveFrom: string | null;
  termHistory: AdminCommercialTermHistory[];
  receivedByCurrency: Array<{ currency: string; amount: number; receiptCount: number }>;
}

export interface AdminPlatformReceipt {
  receiptId: string;
  organizationId: string;
  organizationName: string;
  receivedOn: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  currency: string;
  status: 'received' | 'voided';
  billingFrequency: BillingFrequency;
  voidedAt: string | null;
  totalCount: number;
}

export interface AdminPlatformBillingCycle {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  termId: string;
  plan: CommercialPlan;
  frequency: BillingFrequency;
  expectedAmount: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  receivedAmount: number;
  balance: number;
  paymentStatus: CommercialPaymentStatus;
  dueStatus: CommercialDueStatus;
  extensionCount: number;
  latestExtensionAt: string | null;
}
