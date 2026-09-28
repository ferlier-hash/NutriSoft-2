import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RealAdminPlatformRevenue } from '../app/routes/admin/RealAdminPlatformRevenue';
import type { AdminPlatformBillingCycle, AdminPlatformRevenueRow } from '../data/admin-platform-revenue.types';
import { extendAdminPlatformBillingDueDate, loadAdminPlatformBilling, loadAdminPlatformReceipts, loadAdminPlatformRevenue, recordAdminCommercialReceipt, setAdminCommercialTerm } from '../data/supabase/admin-platform-revenue.repository';

vi.mock('../data/supabase/admin-platform-revenue.repository', () => ({
  loadAdminPlatformReceipts: vi.fn(),
  loadAdminPlatformRevenue: vi.fn(),
  loadAdminPlatformBilling: vi.fn(),
  extendAdminPlatformBillingDueDate: vi.fn(),
  recordAdminCommercialReceipt: vi.fn(),
  setAdminCommercialTerm: vi.fn(),
  voidAdminCommercialReceipt: vi.fn(),
}));

const organization: AdminPlatformRevenueRow = {
  organizationId: '00000000-0000-4000-8000-000000000001',
  organizationName: 'Consultorio Prueba', organizationSlug: 'consultorio-prueba',
  currentPlan: 'pro', termId: '00000000-0000-4000-8000-000000000002', termPlan: 'pro',
  billingFrequency: 'monthly', termAmount: 3200, termCurrency: 'ARS', effectiveFrom: '2026-09-01',
  termHistory: [], receivedByCurrency: [],
};
const billingCycle: AdminPlatformBillingCycle = {
  organizationId: organization.organizationId, organizationName: organization.organizationName, organizationSlug: organization.organizationSlug,
  termId: organization.termId!, plan: 'pro', frequency: 'monthly', expectedAmount: 3200, currency: 'ARS',
  periodStart: '2026-09-15', periodEnd: '2026-10-14', dueDate: '2026-09-15', receivedAmount: 0, balance: 3200,
  paymentStatus: 'unpaid', dueStatus: 'overdue', extensionCount: 0, latestExtensionAt: null,
};

describe('Ingresos comerciales de Nutrify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadAdminPlatformRevenue).mockResolvedValue([organization]);
    vi.mocked(loadAdminPlatformReceipts).mockResolvedValue({ rows: [], totalCount: 0 });
    vi.mocked(loadAdminPlatformBilling).mockResolvedValue([]);
    vi.mocked(extendAdminPlatformBillingDueDate).mockResolvedValue(undefined);
    vi.mocked(setAdminCommercialTerm).mockResolvedValue(undefined);
    vi.mocked(recordAdminCommercialReceipt).mockResolvedValue(undefined);
  });

  it('versiona la tarifa desde la interfaz sin sobrescribir el historial', async () => {
    render(<RealAdminPlatformRevenue from="2026-09-01" to="2026-09-30" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Configurar tarifa' }));
    fireEvent.change(screen.getByLabelText('Importe acordado'), { target: { value: '4500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar tarifa' }));

    await waitFor(() => expect(setAdminCommercialTerm).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: organization.organizationId,
      plan: 'pro',
      frequency: 'monthly',
      amount: 4500,
      currency: 'ARS',
    })));
    await waitFor(() => expect(loadAdminPlatformRevenue).toHaveBeenCalledTimes(2));
  });

  it('envía la fecha flexible elegida sin forzar el primer día del mes', async () => {
    render(<RealAdminPlatformRevenue from="2026-09-01" to="2026-09-30" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Configurar tarifa' }));
    fireEvent.change(screen.getByLabelText(/Vigente desde/), { target: { value: '2026-09-15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar tarifa' }));

    await waitFor(() => expect(setAdminCommercialTerm).toHaveBeenCalledWith(expect.objectContaining({
      effectiveFrom: '2026-09-15',
    })));
  });

  it('registra un cobro recibido con idempotencia y el período mensual correcto', async () => {
    vi.mocked(loadAdminPlatformRevenue).mockResolvedValue([{ ...organization, effectiveFrom: '2026-09-15' }]);
    render(<RealAdminPlatformRevenue from="2026-09-01" to="2026-09-30" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar cobro' }));
    expect(screen.getByLabelText('Período desde')).toHaveValue('2026-09-15');
    expect(screen.getByLabelText('Período hasta (calculado)')).toHaveValue('2026-10-14');
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Registrar cobro$/ }));

    await waitFor(() => expect(recordAdminCommercialReceipt).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: organization.organizationId,
      termId: organization.termId,
      amount: 3200,
      currency: 'ARS',
      periodStart: '2026-09-15',
      periodEnd: '2026-10-14',
      requestId: expect.stringMatching(/^[0-9a-f-]{36}$/i),
    })));
  });

  it('muestra una tarifa futura como programada y no permite cobrar antes de la vigencia', async () => {
    vi.mocked(loadAdminPlatformRevenue).mockResolvedValue([{ ...organization, effectiveFrom: '2999-01-01' }]);
    render(<RealAdminPlatformRevenue from="2026-09-01" to="2026-09-30" />);

    expect(await screen.findByText('Programada desde 01/01/2999')).toBeInTheDocument();
    expect(screen.queryByText('Tarifa pendiente')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cobro disponible al iniciar vigencia' })).toBeDisabled();
  });

  it('permite otorgar una prórroga manual con fecha seleccionada para un único ciclo', async () => {
    vi.mocked(loadAdminPlatformBilling).mockResolvedValue([billingCycle]);
    render(<RealAdminPlatformRevenue from="2026-09-01" to="2026-09-30" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Dar prórroga' }));
    fireEvent.change(screen.getByLabelText('Nueva fecha límite'), { target: { value: '2026-10-01' } });
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar prórroga' }));
    await waitFor(() => expect(extendAdminPlatformBillingDueDate).toHaveBeenCalledWith(billingCycle.termId, billingCycle.periodStart, '2026-10-01'));
  });

  it('prellena el saldo pendiente al iniciar un cobro desde el ciclo', async () => {
    vi.mocked(loadAdminPlatformBilling).mockResolvedValue([{ ...billingCycle, receivedAmount: 1200, balance: 2000, paymentStatus: 'partial' }]);
    render(<RealAdminPlatformRevenue from="2026-09-01" to="2026-09-30" />);
    fireEvent.click(within(await screen.findByRole('region', { name: 'Facturación y vencimientos comerciales' })).getByRole('button', { name: 'Registrar cobro' }));
    expect(screen.getByLabelText('Importe recibido')).toHaveValue(2000);
    expect(screen.getByLabelText('Período desde')).toHaveValue(billingCycle.periodStart);
  });
});
