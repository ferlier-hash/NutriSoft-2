import React from 'react';
import { act, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MockProvider, useMock } from '../app/provider';
import { ToastProvider } from '../components/ui/Toast';
import { AdminOverviewPage } from '../app/routes/admin/AdminOverviewPage';
import { OrganizationsPage } from '../app/routes/admin/OrganizationsPage';
import { advanceBillingDate } from '../lib/adminCommercial';
import { NutritionistsListPage } from '../app/routes/admin/NutritionistsListPage';
import { NutritionistDetailPage } from '../app/routes/admin/NutritionistDetailPage';

describe('Dominio comercial del Super Admin', () => {
  it('mantiene estados comerciales separados y exige pago al reactivar', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <MockProvider>{children}</MockProvider>;
    const { result } = renderHook(() => useMock(), { wrapper });
    const suspended = result.current.organizations.find(item => item.status === 'suspended');
    expect(suspended).toBeDefined();

    expect(() => {
      act(() => result.current.setOrganizationStatus(suspended!.id, 'active'));
    }).toThrow(/requiere registrar el pago confirmado/i);

    act(() => {
      result.current.setOrganizationStatus(suspended!.id, 'active', {
        amount: 100000,
        paidAt: new Date().toISOString(),
        method: 'Transferencia',
        note: 'Prueba de reactivación',
      });
    });

    const reactivated = result.current.organizations.find(item => item.id === suspended!.id);
    expect(reactivated?.status).toBe('active');
    expect(reactivated?.payments[0]?.amount).toBe(100000);
    expect(reactivated?.statusHistory[0]?.note).toMatch(/pago confirmado/i);
  });

  it('renderiza prioridades comerciales sin restaurar la métrica de retención ni datos clínicos', () => {
    const router = createMemoryRouter([{ path: '/admin', element: <AdminOverviewPage /> }], { initialEntries: ['/admin'] });
    render(
      <MockProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </MockProvider>
    );

    expect(screen.getByText('Atención comercial')).toBeInTheDocument();
    expect(screen.getByText('Pendiente de pago')).toBeInTheDocument();
    expect(screen.getByText('Próximo a suspensión')).toBeInTheDocument();
    expect(screen.getByText('Evolución de la plataforma')).toBeInTheDocument();
    expect(screen.queryByText(/Retención \(30 días\)/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/adherencia|energía|recomendación clínica/i)).not.toBeInTheDocument();
  });

  it('filtra el contenido del tooltip según las series activas', async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter([{ path: '/admin', element: <AdminOverviewPage /> }], { initialEntries: ['/admin'] });
    render(<MockProvider><ToastProvider><RouterProvider router={router} /></ToastProvider></MockProvider>);

    await user.hover(screen.getByRole('button', { name: 'Ver valores de Jul 2026' }));
    let tooltip = screen.getByRole('status');
    expect(within(tooltip).getByText('Consultorios')).toBeInTheDocument();
    expect(within(tooltip).getByText('Pacientes')).toBeInTheDocument();
    expect(within(tooltip).getByText('Cobros')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Consultorios activos' }));
    await user.click(screen.getByRole('button', { name: 'Cobros reales' }));
    await user.hover(screen.getByRole('button', { name: 'Ver valores de Jul 2026' }));
    tooltip = screen.getByRole('status');
    expect(within(tooltip).getByText('Pacientes')).toBeInTheDocument();
    expect(within(tooltip).queryByText('Consultorios')).not.toBeInTheDocument();
    expect(within(tooltip).queryByText('Cobros')).not.toBeInTheDocument();
  });

  it('permite alternar mes actual y un rango mensual personalizado', async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter([{ path: '/admin', element: <AdminOverviewPage /> }], { initialEntries: ['/admin'] });
    render(<MockProvider><ToastProvider><RouterProvider router={router} /></ToastProvider></MockProvider>);

    await user.click(screen.getByRole('button', { name: 'Mes actual' }));
    expect(screen.getByRole('button', { name: 'Mes actual' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Ver valores de Ago 2026' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ver valores de Jul 2026' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Personalizado' }));
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-04' } });
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-06' } });
    expect(screen.getByText('3 meses seleccionados')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver valores de Abr 2026' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver valores de Jun 2026' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ver valores de Jul 2026' })).not.toBeInTheDocument();
  });

  it('abre un menú compacto en español desde el badge de estado', async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter([
      { path: '/admin/organizations', element: <OrganizationsPage /> },
      { path: '/admin/organizations/:organizationId', element: <div>Detalle</div> },
    ], { initialEntries: ['/admin/organizations'] });
    render(<MockProvider><ToastProvider><RouterProvider router={router} /></ToastProvider></MockProvider>);

    expect(screen.queryByLabelText('Cambiar estado de Clínica Bienestar')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Activo, cambiar estado de Clínica Bienestar' }));
    const menu = screen.getByRole('menu', { name: 'Estados disponibles para Clínica Bienestar' });
    expect(within(menu).getByRole('menuitem', { name: 'Pago pendiente' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Suspendido' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Cerrado' })).toBeInTheDocument();
  });

  it('registra altas, invitaciones, cambios de plan y pagos de forma coherente', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <MockProvider>{children}</MockProvider>;
    const { result } = renderHook(() => useMock(), { wrapper });
    let createdId = '';

    act(() => {
      createdId = result.current.addOrganization({
        name: 'Consultorio Prueba',
        location: 'Córdoba, Argentina',
        plan: 'BASIC',
        responsibleName: 'Ana Prueba',
        responsibleEmail: 'ana@prueba.com',
      }).id;
    });
    expect(result.current.organizations.find(item => item.id === createdId)?.responsibleMembers[0]?.invitationStatus).toBe('pending');

    act(() => result.current.changeOrganizationPlan(createdId, 'PRO'));
    expect(result.current.organizations.find(item => item.id === createdId)?.monthlyPrice).toBe(60000);

    act(() => {
      result.current.inviteAdditionalManager(createdId, 'Bruno Gestión', 'bruno@prueba.com');
      result.current.inviteNutritionist(createdId, 'Lic. Clara Salud', 'clara@prueba.com');
    });
    const invitedOrganization = result.current.organizations.find(item => item.id === createdId);
    expect(invitedOrganization?.responsibleMembers.at(-1)?.invitationStatus).toBe('pending');
    expect(invitedOrganization?.professionalInvitations.at(-1)?.email).toBe('clara@prueba.com');

    const due = result.current.organizations.find(item => item.id === 'org-2')!;
    const previousPaymentCount = due.payments.length;
    act(() => result.current.registerPayment(due.id, { amount: due.monthlyPrice, paidAt: new Date().toISOString(), method: 'Transferencia' }));
    const paid = result.current.organizations.find(item => item.id === due.id);
    expect(paid?.status).toBe('active');
    expect(paid?.nextBillingDate).toBe(advanceBillingDate(due.nextBillingDate));
    expect(paid?.payments).toHaveLength(previousPaymentCount + 1);
  });

  it('cambia el plan y registra un pago desde la tabla sin recargar', async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter([
      { path: '/admin/organizations', element: <OrganizationsPage /> },
      { path: '/admin/organizations/:organizationId', element: <div>Detalle</div> },
    ], { initialEntries: ['/admin/organizations'] });
    render(<MockProvider><ToastProvider><RouterProvider router={router} /></ToastProvider></MockProvider>);

    let row = screen.getByRole('row', { name: /NutriVida/ });
    await user.click(within(row).getByRole('button', { name: 'Plan Basic, cambiar plan de NutriVida' }));
    await user.click(screen.getByRole('menuitem', { name: /Pro/ }));
    row = screen.getByRole('row', { name: /NutriVida/ });
    expect(within(row).getByText('$ 60.000/mes')).toBeInTheDocument();

    await user.click(within(row).getByRole('button', { name: 'Registrar pago' }));
    expect(screen.getByRole('dialog', { name: 'Registrar pago' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmar cobro' }));
    row = screen.getByRole('row', { name: /NutriVida/ });
    expect(within(row).getByRole('button', { name: 'Activo, cambiar estado de NutriVida' })).toBeInTheDocument();
  });

  it('muestra fecha, horario y referencia relativa de la última actividad profesional', () => {
    const router = createMemoryRouter([{ path: '/admin/nutritionists', element: <NutritionistsListPage /> }], { initialEntries: ['/admin/nutritionists'] });
    render(<MockProvider><ToastProvider><RouterProvider router={router} /></ToastProvider></MockProvider>);

    expect(screen.getByRole('columnheader', { name: 'Última actividad' })).toBeInTheDocument();
    expect(screen.getAllByText(/Hace \d+ h/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\d{2}:\d{2}/).length).toBeGreaterThan(0);
  });

  it('presenta todos los perfiles de nutricionistas como un tablero de tarjetas sin pestañas', () => {
    const router = createMemoryRouter([
      { path: '/admin/nutritionists/:nutritionistId', element: <NutritionistDetailPage /> },
      { path: '/admin/nutritionists/:nutritionistId/patients/:patientId', element: <div>Paciente</div> },
      { path: '/admin/organizations/:organizationId', element: <div>Consultorio</div> },
    ], { initialEntries: ['/admin/nutritionists/nutri-2'] });
    render(<MockProvider><ToastProvider><RouterProvider router={router} /></ToastProvider></MockProvider>);

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Resumen del nutricionista' })).toBeInTheDocument();
    expect(screen.getByText('Datos de contacto')).toBeInTheDocument();
    expect(screen.getByText('Consultorio vinculado')).toBeInTheDocument();
    expect(screen.getAllByText('Pacientes asignados')).toHaveLength(2);
    expect(screen.getByText('Sin pacientes asignados')).toBeInTheDocument();
    expect(screen.getByText('Actividad operativa')).toBeInTheDocument();
    expect(screen.getAllByText('Estado de cuenta')).toHaveLength(2);
  });
});
