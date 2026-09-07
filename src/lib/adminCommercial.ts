import type { Organization, OrganizationPlan, OrganizationStatus } from '../types';

export const STATUS_LABELS: Record<OrganizationStatus, string> = {
  active: 'Activo',
  payment_due: 'Pago pendiente',
  suspended: 'Suspendido',
  closed: 'Cerrado',
};

export const PLAN_LABELS: Record<OrganizationPlan, string> = {
  BASIC: 'Basic',
  PRO: 'Pro',
  ULTRA: 'Ultra',
  CUSTOM: 'Custom',
};

export const PLAN_PRICES: Record<OrganizationPlan, number> = {
  BASIC: 30000,
  PRO: 60000,
  ULTRA: 100000,
  CUSTOM: 200000,
};

export const PLAN_STORAGE_LIMITS: Record<OrganizationPlan, number | null> = {
  BASIC: 1024,
  PRO: 5120,
  ULTRA: 15360,
  CUSTOM: null,
};

export function advanceBillingDate(date: string) {
  const current = new Date(date);
  const originalDay = current.getDate();
  const target = new Date(current);
  target.setDate(1);
  target.setMonth(target.getMonth() + 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(originalDay, lastDay));
  return target.toISOString();
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatStorage(mb: number) {
  if (mb < 1024) return `${Math.round(mb)} MB`;
  return `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB`;
}

export function storagePercent(org: Organization) {
  if (!org.storageLimitMb) return 0;
  return Math.min(100, Math.round((org.storageUsedMb / org.storageLimitMb) * 100));
}

export function daysUntil(date: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}
