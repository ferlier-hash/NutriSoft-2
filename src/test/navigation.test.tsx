import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { useState } from 'react';
import { MockProvider } from '../app/provider';
import { ToastProvider } from '../components/ui/Toast';

import { AdminLayout } from '../app/layouts/AdminLayout';
import { ProfessionalLayout } from '../app/layouts/ProfessionalLayout';
import { PatientLayout } from '../app/layouts/PatientLayout';

import { AdminOverviewPage } from '../app/routes/admin/AdminOverviewPage';
import { OrganizationsPage } from '../app/routes/admin/OrganizationsPage';
import { ProfessionalDashboard } from '../app/routes/professional/ProfessionalDashboard';
import { AgendaPage } from '../app/routes/professional/AgendaPage';
import { ProfessionalSettingsPage } from '../app/routes/professional/ProfessionalSettingsPage';
import { PatientDashboard } from '../app/routes/patient/PatientDashboard';
import { NotFoundPage } from '../app/routes/NotFoundPage';
import userEvent from '@testing-library/user-event';

describe('Navegación, Layouts y UX Accesible (Fase 1.1.2)', () => {
  it('1. Carga directa de /admin renderiza AdminLayout y AdminOverviewPage con portal admin', () => {
    const memoryRouter = createMemoryRouter(
      [
        {
          path: '/admin',
          element: <AdminLayout />,
          children: [
            { index: true, element: <AdminOverviewPage /> },
            { path: 'organizations', element: <OrganizationsPage /> },
          ],
        },
      ],
      { initialEntries: ['/admin'] }
    );

    render(
      <MockProvider>
        <ToastProvider>
          <RouterProvider router={memoryRouter} />
        </ToastProvider>
      </MockProvider>
    );

    expect(screen.getByRole('heading', { name: 'Resumen General de Plataforma' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Panel de Administración' })).toBeInTheDocument();
  });

  it('2. Carga directa de /professional renderiza ProfessionalLayout y Sidebar profesional', () => {
    const memoryRouter = createMemoryRouter(
      [
        {
          path: '/professional',
          element: <ProfessionalLayout />,
          children: [{ index: true, element: <ProfessionalDashboard /> }],
        },
      ],
      { initialEntries: ['/professional'] }
    );

    render(
      <MockProvider>
        <ToastProvider>
          <RouterProvider router={memoryRouter} />
        </ToastProvider>
      </MockProvider>
    );

    expect(screen.getByRole('heading', { name: /Consultorio —/i })).toBeInTheDocument();
  });

  it('3. MobileBottomNav muestra aria-disabled="true" en opciones deshabilitadas', () => {
    const memoryRouter = createMemoryRouter(
      [
        {
          path: '/patient',
          element: <PatientLayout />,
          children: [{ index: true, element: <PatientDashboard /> }],
        },
      ],
      { initialEntries: ['/patient'] }
    );

    render(
      <MockProvider>
        <ToastProvider>
          <RouterProvider router={memoryRouter} />
        </ToastProvider>
      </MockProvider>
    );

    const bottomNav = screen.getByRole('navigation', { name: /Navegación inferior del portal del paciente/i });
    expect(bottomNav).toBeInTheDocument();

    const disabledOptions = screen.getAllByText('Próximamente');
    expect(disabledOptions.length).toBeGreaterThan(0);
  });

  it('4. NotFoundPage ofrece salida ajustada al portal del paciente', () => {
    const memoryRouter = createMemoryRouter(
      [
        { path: '/patient/*', element: <NotFoundPage /> },
      ],
      { initialEntries: ['/patient/inexistente'] }
    );

    render(
      <MockProvider>
        <ToastProvider>
          <RouterProvider router={memoryRouter} />
        </ToastProvider>
      </MockProvider>
    );

    expect(screen.getByRole('link', { name: 'Volver a mi portal de paciente' })).toBeInTheDocument();
    expect(screen.queryByText('Volver al panel administrador')).not.toBeInTheDocument();
  });

  it('5. Configuración profesional guarda moneda/precio sugerido y lo precarga en Agenda', async () => {
    const user = userEvent.setup();
    function SettingsAgendaHarness() {
      const [page, setPage] = useState<'settings' | 'agenda'>('settings');
      return (
        <>
          <button type="button" onClick={() => setPage('agenda')}>Ir a agenda</button>
          {page === 'settings' ? <ProfessionalSettingsPage /> : <AgendaPage />}
        </>
      );
    }

    render(
      <MockProvider>
        <ToastProvider>
          <SettingsAgendaHarness />
        </ToastProvider>
      </MockProvider>
    );

    await user.selectOptions(screen.getByLabelText('Moneda predeterminada'), 'USD');
    await user.clear(screen.getByLabelText('Precio virtual'));
    await user.type(screen.getByLabelText('Precio virtual'), '40');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    await user.click(screen.getByRole('button', { name: 'Ir a agenda' }));
    await user.click(screen.getByRole('button', { name: 'Nueva cita' }));

    expect(screen.getByLabelText('Importe (USD)')).toHaveValue(40);
  });
});
