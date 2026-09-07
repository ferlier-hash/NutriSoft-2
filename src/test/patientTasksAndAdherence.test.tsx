import React from 'react';
import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MockProvider, useMock } from '../app/provider';
import { PatientDashboard } from '../app/routes/patient/PatientDashboard';
import { PatientResourcesPage } from '../app/routes/patient/PatientResourcesPage';
import { PatientRecipesPage } from '../app/routes/patient/PatientRecipesPage';
import { NextStepsPage } from '../app/routes/professional/NextStepsPage';
import { ToastProvider } from '../components/ui/Toast';

const wrapper = ({ children }: { children: React.ReactNode }) => <MockProvider>{children}</MockProvider>;

describe('Próximos pasos y cumplimiento del plan', () => {
  it('mantiene una sola lista por paciente, permite duplicar y conserva comentarios', () => {
    const { result } = renderHook(() => useMock(), { wrapper });
    let createdId = '';
    act(() => { createdId = result.current.createNextStepList({ title: 'Nueva rutina', durationDays: 9, items: ['Tomar agua', 'Preparar la merienda'] }).id; });
    act(() => result.current.assignNextStepList(createdId, 'pat-1'));
    expect(result.current.professionalNextStepLists.find(list => list.id === 'next-steps-1')?.patientId).toBeUndefined();
    expect(result.current.patientNextStepList?.id).toBe(createdId);

    const firstTask = result.current.patientNextStepList!.items[0]!;
    act(() => result.current.updateNextStepItemByPatient(createdId, firstTask.id, true, 'Pude hacerlo durante el trabajo.'));
    expect(result.current.patientNextStepList?.items[0]).toMatchObject({ completed: true, patientComment: 'Pude hacerlo durante el trabajo.' });

    let duplicateId = '';
    act(() => { duplicateId = result.current.duplicateNextStepList(createdId).id; });
    expect(result.current.professionalNextStepLists.find(list => list.id === duplicateId)?.patientId).toBeUndefined();
    expect(result.current.professionalNextStepLists.find(list => list.id === duplicateId)?.items.every(item => !item.completed && !item.patientComment)).toBe(true);
  });

  it('impide que otro paciente modifique tareas o comidas ajenas', () => {
    const { result } = renderHook(() => useMock(), { wrapper });
    act(() => result.current.setCurrentDemoPatientId('pat-2'));
    expect(() => result.current.updateNextStepItemByPatient('next-steps-1', 'next-step-1', true, '')).toThrow('no pertenece');
    expect(() => result.current.setMealCompleted('meal-assignment-1', 'meal-plan-1-day-1', 'meal-plan-1-day-1-meal-1', true)).toThrow('no pertenece');
    expect(() => result.current.setMealComment('meal-assignment-1', 'meal-plan-1-day-1', 'meal-plan-1-day-1-meal-1', 'Comentario ajeno')).toThrow('no pertenece');
  });

  it('guarda comentarios por comida y permite al profesional marcarlos como revisados', () => {
    const { result } = renderHook(() => useMock(), { wrapper });
    act(() => result.current.setMealComment('meal-assignment-1', 'meal-plan-1-day-1', 'meal-plan-1-day-1-meal-2', 'La porción me resultó demasiado grande.'));
    const record = result.current.mealAdherenceRecords.find(item => item.assignmentId === 'meal-assignment-1' && item.mealId === 'meal-plan-1-day-1-meal-2')!;
    expect(record).toMatchObject({ patientId: 'pat-1', patientComment: 'La porción me resultó demasiado grande.', completed: false });
    expect(record.professionalReviewedAt).toBeUndefined();

    act(() => result.current.markMealCommentReviewed(record.id));
    expect(result.current.mealAdherenceRecords.find(item => item.id === record.id)?.professionalReviewedAt).toBeTruthy();
  });

  it('muestra los siete días, registra comidas y ofrece todas las bibliotecas', async () => {
    const dashboardRouter = createMemoryRouter([{ path: '/patient', element: <PatientDashboard /> }], { initialEntries: ['/patient'] });
    const dashboard = render(<MockProvider><ToastProvider><RouterProvider router={dashboardRouter} /></ToastProvider></MockProvider>);
    expect(screen.getByText(/Día 7/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver todos los recursos/ })).toHaveAttribute('href', '/patient/resources');
    expect(screen.getByRole('link', { name: /Ver todas las recetas/ })).toHaveAttribute('href', '/patient/recipes');
    const mealCheckboxes = screen.getAllByRole('checkbox');
    const uncheckedMeal = mealCheckboxes.find(input => !(input as HTMLInputElement).checked && input.closest('details'))!;
    await userEvent.click(uncheckedMeal);
    expect(uncheckedMeal).toBeChecked();
    dashboard.unmount();

    const resourcesRouter = createMemoryRouter([{ path: '/patient/resources', element: <PatientResourcesPage /> }], { initialEntries: ['/patient/resources'] });
    render(<MockProvider><RouterProvider router={resourcesRouter} /></MockProvider>);
    expect(screen.getByText('Todos tus recursos')).toBeInTheDocument();
    expect(screen.getByText('Porciones y señales de saciedad')).toBeInTheDocument();
    expect(screen.queryByText('Borrador de guía para vacaciones')).not.toBeInTheDocument();

    const recipesRouter = createMemoryRouter([{ path: '/patient/recipes', element: <PatientRecipesPage /> }], { initialEntries: ['/patient/recipes'] });
    render(<MockProvider><RouterProvider router={recipesRouter} /></MockProvider>);
    expect(screen.getByText('Todas tus recetas')).toBeInTheDocument();
    expect(screen.getByText('Hummus cremoso con crudités')).toBeInTheDocument();
  });

  it('muestra novedades de citas al paciente y permite marcarlas como vistas', async () => {
    const router = createMemoryRouter([{ path: '/patient', element: <PatientDashboard /> }], { initialEntries: ['/patient'] });
    render(<MockProvider><ToastProvider><RouterProvider router={router} /></ToastProvider></MockProvider>);
    expect(screen.getByText('Novedades de citas')).toBeInTheDocument();
    expect(screen.getByText('Nueva cita agendada')).toBeInTheDocument();
    expect(screen.getByText('1 nuevas')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Marcar como visto' }));
    expect(screen.getByText('0 nuevas')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Marcar como visto' })).not.toBeInTheDocument();
  });

  it('muestra las tareas de una lista nueva aunque todavía no tenga paciente', async () => {
    const router = createMemoryRouter([{ path: '/professional/next-steps', element: <NextStepsPage /> }], { initialEntries: ['/professional/next-steps'] });
    render(<MockProvider><ToastProvider><RouterProvider router={router} /></ToastProvider></MockProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'Nueva lista' }));
    await userEvent.type(screen.getByLabelText('Título *'), 'Preparación de la semana');
    await userEvent.type(screen.getByLabelText('Tareas, una por línea *'), 'Comprar frutas{enter}Preparar colaciones{enter}Llevar una botella de agua');
    await userEvent.click(screen.getByRole('button', { name: 'Crear lista' }));
    expect(screen.getByText('Preparación de la semana')).toBeInTheDocument();
    expect(screen.getByText('Comprar frutas')).toBeInTheDocument();
    expect(screen.getByText('Preparar colaciones')).toBeInTheDocument();
    expect(screen.getByText('Llevar una botella de agua')).toBeInTheDocument();
  });
});
