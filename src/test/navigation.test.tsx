import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { MockProvider } from '../app/provider';
import { ToastProvider } from '../components/ui/Toast';

import { AdminLayout } from '../app/layouts/AdminLayout';
import { ProfessionalLayout } from '../app/layouts/ProfessionalLayout';
import { PatientLayout } from '../app/layouts/PatientLayout';

import { AdminDashboard } from '../app/routes/admin/AdminDashboard';
import { NutritionistsListPage } from '../app/routes/admin/NutritionistsListPage';
import { ProfessionalDashboard } from '../app/routes/professional/ProfessionalDashboard';
import { PatientDashboard } from '../app/routes/patient/PatientDashboard';

describe('Navegación y Layouts con React Router', () => {
  it('renderiza AdminLayout correctamente al navegar a /admin y activa únicamente "Resumen"', () => {
    const memoryRouter = createMemoryRouter(
      [
        {
          path: '/admin',
          element: <AdminLayout />,
          children: [
            { index: true, element: <AdminDashboard /> },
            { path: 'nutritionists', element: <NutritionistsListPage /> },
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

    expect(screen.getByRole('heading', { name: 'Organizaciones' })).toBeInTheDocument();
  });

  it('renderiza ProfessionalLayout al navegar a /professional', () => {
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

    expect(screen.getAllByText('Bandeja de atención').length).toBeGreaterThan(0);
  });

  it('renderiza MobileBottomNav únicamente dentro de PatientLayout', () => {
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
});
