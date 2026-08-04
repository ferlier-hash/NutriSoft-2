import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { MockProvider } from '../app/provider';
import { ToastProvider } from '../components/ui/Toast';
import { AdminLayout } from '../app/layouts/AdminLayout';
import { AdminPatientDetailPage } from '../app/routes/admin/AdminPatientDetailPage';
import { NotFoundPage } from '../app/routes/NotFoundPage';

describe('Barrera de Privacidad del Portal Administrador', () => {
  it('muestra únicamente información operativa y OCURRE aviso de privacidad al consultar el perfil administrativo de un paciente', () => {
    const memoryRouter = createMemoryRouter(
      [
        {
          path: '/admin',
          element: <AdminLayout />,
          children: [
            {
              path: 'nutritionists/:nutritionistId/patients/:patientId',
              element: <AdminPatientDetailPage />,
            },
          ],
        },
      ],
      { initialEntries: ['/admin/nutritionists/nutri-1/patients/pat-1'] }
    );

    render(
      <MockProvider>
        <ToastProvider>
          <RouterProvider router={memoryRouter} />
        </ToastProvider>
      </MockProvider>
    );

    expect(screen.getAllByText('María González').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lic. Andrea N.').length).toBeGreaterThan(0);

    expect(
      screen.getByText(/Por privacidad, la información clínica sólo está disponible para los profesionales autorizados/i)
    ).toBeInTheDocument();

    expect(screen.queryByText(/Energía/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Adherencia/i)).not.toBeInTheDocument();
  });

  it('muestra NotFoundPage si se intenta consultar un paciente no asignado a ese nutricionista', () => {
    const memoryRouter = createMemoryRouter(
      [
        {
          path: '/admin',
          element: <AdminLayout />,
          children: [
            {
              path: 'nutritionists/:nutritionistId/patients/:patientId',
              element: <AdminPatientDetailPage />,
            },
          ],
        },
      ],
      { initialEntries: ['/admin/nutritionists/nutri-1/patients/pat-4'] }
    );

    render(
      <MockProvider>
        <ToastProvider>
          <RouterProvider router={memoryRouter} />
        </ToastProvider>
      </MockProvider>
    );

    expect(screen.getByText('Asignación o paciente no encontrado')).toBeInTheDocument();
  });

  it('muestra explicación o 404 al intentar acceder directamente a /admin/patients', () => {
    const memoryRouter = createMemoryRouter(
      [
        {
          path: '/admin',
          element: <AdminLayout />,
          children: [
            {
              path: 'patients',
              element: (
                <NotFoundPage
                  title="Acceso directo no permitido"
                  message="El acceso a pacientes en el portal Administrador se realiza exclusivamente desde el perfil del nutricionista responsable."
                />
              ),
            },
          ],
        },
      ],
      { initialEntries: ['/admin/patients'] }
    );

    render(
      <MockProvider>
        <ToastProvider>
          <RouterProvider router={memoryRouter} />
        </ToastProvider>
      </MockProvider>
    );

    expect(screen.getByText('Acceso directo no permitido')).toBeInTheDocument();
  });
});
