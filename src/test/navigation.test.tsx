import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { MockProvider } from '../app/provider';
import { ToastProvider } from '../components/ui/Toast';

import { AdminLayout } from '../app/layouts/AdminLayout';
import { ProfessionalLayout } from '../app/layouts/ProfessionalLayout';
import { PatientLayout } from '../app/layouts/PatientLayout';

import { AdminOverviewPage } from '../app/routes/admin/AdminOverviewPage';
import { OrganizationsPage } from '../app/routes/admin/OrganizationsPage';
import { ProfessionalDashboard } from '../app/routes/professional/ProfessionalDashboard';
import { PatientDashboard } from '../app/routes/patient/PatientDashboard';

describe('Navegación y Layouts con React Router (Fase 1.1.1)', () => {
  it('1. Carga directa de /admin renderiza AdminLayout y AdminOverviewPage', () => {
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
  });

  it('2. Carga directa de /professional renderiza ProfessionalLayout', () => {
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

    expect(screen.getByRole('heading', { name: 'Consultorio Nutricional' })).toBeInTheDocument();
  });

  it('3. Carga directa de /patient renderiza PatientLayout', () => {
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
  });

  it('6. Resumen y Organizaciones son pantallas distintas', () => {
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
      { initialEntries: ['/admin/organizations'] }
    );

    render(
      <MockProvider>
        <ToastProvider>
          <RouterProvider router={memoryRouter} />
        </ToastProvider>
      </MockProvider>
    );

    expect(screen.getByRole('heading', { name: 'Organizaciones Registradas' })).toBeInTheDocument();
    expect(screen.queryByText('Resumen General de Plataforma')).not.toBeInTheDocument();
  });

  it('8. Sólo Inicio aparece activo en /patient dentro de MobileBottomNav', () => {
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

    const activeLink = screen.getByRole('link', { name: /Inicio/i });
    expect(activeLink).toHaveClass('text-[#357984]');
  });
});
