import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { MockProvider } from '../app/provider';
import { ToastProvider } from '../components/ui/Toast';
import { ProfessionalLayout } from '../app/layouts/ProfessionalLayout';
import { ProfessionalDashboard } from '../app/routes/professional/ProfessionalDashboard';

describe('Flujo de Integración Completo con userEvent (Fase 1.1)', () => {
  it('permite abrir el modal de nuevo paciente y validar campos obligatorios con Zod', async () => {
    const user = userEvent.setup();
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

    const newPatientBtn = screen.getByRole('button', { name: /Nuevo paciente/i });
    await user.click(newPatientBtn);

    expect(screen.getByText('Agregar nuevo paciente')).toBeInTheDocument();

    const saveBtn = screen.getByRole('button', { name: /Guardar paciente/i });
    await user.click(saveBtn);

    expect(await screen.findByText('El nombre debe tener al menos 2 caracteres')).toBeInTheDocument();
    expect(await screen.findByText('El apellido debe tener al menos 2 caracteres')).toBeInTheDocument();
  });
});
