import React from 'react';
import { act, render, renderHook, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MockProvider, useMock } from '../app/provider';
import { CheckInsPage } from '../app/routes/professional/CheckInsPage';
import { PatientDetailPage } from '../app/routes/professional/PatientDetailPage';
import { ToastProvider } from '../components/ui/Toast';
import { buildCheckInOverviewRows, deriveCheckInPriority, isResponseInDateRange } from '../lib/checkInOverview';
import type { CheckInResponse } from '../types';

const wrapper = ({ children }: { children: React.ReactNode }) => <MockProvider>{children}</MockProvider>;
const response = (overrides: Partial<CheckInResponse> = {}): CheckInResponse => ({ id: 'r', assignmentId: 'a', organizationId: 'o', patientId: 'p', energyScore: 4, adherenceScore: 4, helpRequested: false, submittedAt: '2026-08-20T12:00:00.000Z', ...overrides });

describe('Resumen profesional de check-ins', () => {
  it('deriva prioridades mediante reglas explícitas', () => {
    expect(deriveCheckInPriority(response({ helpRequested: true }))).toBe('high');
    expect(deriveCheckInPriority(response({ energyScore: 2 }))).toBe('high');
    expect(deriveCheckInPriority(response({ adherenceScore: 3 }))).toBe('medium');
    expect(deriveCheckInPriority(response())).toBe('normal');
    expect(deriveCheckInPriority()).toBe('none');
  });

  it('filtra períodos con límites inclusivos y conserva todos sólo en la vista general', () => {
    const now = new Date('2026-08-20T18:00:00.000Z');
    expect(isResponseInDateRange(response({ submittedAt: '2026-08-20T10:00:00.000Z' }), 'today', undefined, undefined, now)).toBe(true);
    expect(isResponseInDateRange(response({ submittedAt: '2026-08-14T10:00:00.000Z' }), '7days', undefined, undefined, now)).toBe(true);
    expect(isResponseInDateRange(response({ submittedAt: '2026-08-13T10:00:00.000Z' }), '7days', undefined, undefined, now)).toBe(false);
    expect(isResponseInDateRange(undefined, 'all', undefined, undefined, now)).toBe(true);
    expect(isResponseInDateRange(undefined, '15days', undefined, undefined, now)).toBe(false);
  });

  it('muestra una fila por paciente autorizado y abre su historial completo', async () => {
    const router = createMemoryRouter([
      { path: '/professional/checkins', element: <CheckInsPage /> },
      { path: '/professional/patients/:patientId', element: <PatientDetailPage /> },
    ], { initialEntries: ['/professional/checkins'] });
    const overview = render(<MockProvider><ToastProvider><RouterProvider router={router} /></ToastProvider></MockProvider>);
    const table = screen.getByRole('table');
    expect(within(table).getByText('María González')).toBeInTheDocument();
    expect(within(table).getByText('Pablo Acosta')).toBeInTheDocument();
    expect(within(table).getByText('Lucía Torres')).toBeInTheDocument();
    expect(within(table).queryByText('Diego Ramírez')).not.toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Filtrar por prioridad'), 'high');
    expect(within(table).getByText('Pablo Acosta')).toBeInTheDocument();
    expect(within(table).queryByText('María González')).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Filtrar por prioridad'), 'all');

    const pabloRow = within(table).getByText('Pablo Acosta').closest('tr')!;
    expect(within(pabloRow).getByRole('link', { name: 'Ver historial' })).toHaveAttribute('href', '/professional/patients/pat-2?tab=checkins');
    overview.unmount();
    const detailRouter = createMemoryRouter([{ path: '/professional/patients/:patientId', element: <PatientDetailPage /> }], { initialEntries: ['/professional/patients/pat-2?tab=checkins'] });
    render(<MockProvider><ToastProvider><RouterProvider router={detailRouter} /></ToastProvider></MockProvider>);
    expect(screen.getByRole('tab', { name: /Historial de Check-ins/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(/Mucho cansancio esta semana/)).toBeInTheDocument();
  });

  it('recalcula las filas cuando cambia el profesional activo', () => {
    const { result } = renderHook(() => useMock(), { wrapper });
    expect(buildCheckInOverviewRows(result.current.professionalPatients, result.current.professionalAssignments, result.current.checkInResponses).map(row => row.patient.id)).toEqual(['pat-1', 'pat-2', 'pat-3']);
    act(() => result.current.setCurrentDemoNutritionistId('nutri-3'));
    expect(buildCheckInOverviewRows(result.current.professionalPatients, result.current.professionalAssignments, result.current.checkInResponses).map(row => row.patient.id)).toEqual(['pat-4', 'pat-5']);
  });
});
