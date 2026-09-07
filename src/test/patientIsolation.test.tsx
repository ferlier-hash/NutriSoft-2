import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { MockProvider, useMock } from '../app/provider';
import { ToastProvider } from '../components/ui/Toast';
import { PatientLayout } from '../app/layouts/PatientLayout';
import { PatientDashboard } from '../app/routes/patient/PatientDashboard';

const PatientSwitcherHelper = () => {
  const { setCurrentDemoPatientId } = useMock();
  return (
    <>
      <button type="button" onClick={() => setCurrentDemoPatientId('pat-2')}>
        Cambiar a Pablo
      </button>
      <button type="button" onClick={() => setCurrentDemoPatientId('pat-4')}>
        Cambiar a Diego
      </button>
    </>
  );
};

describe('Aislamiento del Portal del Paciente por currentDemoPatientId', () => {
  it('filtra aisladamente el saludo y las recomendaciones según el paciente seleccionado', () => {
    const memoryRouter = createMemoryRouter(
      [
        {
          path: '/patient',
          element: (
            <>
              <PatientLayout />
              <PatientSwitcherHelper />
            </>
          ),
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

    expect(screen.getByText('¡Hola, María! 👋')).toBeInTheDocument();
    expect(screen.getByText('Guía práctica para armar un plato equilibrado')).toBeInTheDocument();
    expect(screen.getByText('Avena nocturna con frutos rojos')).toBeInTheDocument();
    expect(screen.queryByText('Licuado de cacao y banana')).not.toBeInTheDocument();
    expect(screen.getByText(/"Constancia diaria: Pequeños hábitos, grandes cambios. Tú puedes."/i)).toBeInTheDocument();
    expect(screen.queryByText(/"Aumentar la hidratación pre-entrenamiento/i)).not.toBeInTheDocument();

    const switchButton = screen.getByText('Cambiar a Pablo');
    act(() => {
      switchButton.click();
    });

    expect(screen.getByText('¡Hola, Pablo! 👋')).toBeInTheDocument();
    expect(screen.getByText(/"Aumentar la hidratación pre-entrenamiento a 500ml de agua."/i)).toBeInTheDocument();
    expect(screen.queryByText(/"Constancia diaria: Pequeños hábitos/i)).not.toBeInTheDocument();

    act(() => {
      screen.getByText('Cambiar a Diego').click();
    });
    expect(screen.getByText('¡Hola, Diego! 👋')).toBeInTheDocument();
    expect(screen.getByText('Hidratación para días de entrenamiento')).toBeInTheDocument();
    expect(screen.getByText('Licuado de cacao y banana')).toBeInTheDocument();
    expect(screen.queryByText('Avena nocturna con frutos rojos')).not.toBeInTheDocument();
  });
});
