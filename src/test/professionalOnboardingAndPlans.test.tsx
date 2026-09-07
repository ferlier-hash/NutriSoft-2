import React from 'react';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MockProvider, useMock } from '../app/provider';
import { ProfessionalProfilePage } from '../app/routes/professional/ProfessionalProfilePage';
import { MealPlansPage } from '../app/routes/professional/MealPlansPage';
import { MealPlanEditorPage } from '../app/routes/professional/MealPlanEditorPage';
import { ToastProvider } from '../components/ui/Toast';

const wrapper = ({ children }: { children: React.ReactNode }) => <MockProvider>{children}</MockProvider>;

describe('Onboarding profesional, invitaciones y planes alimentarios', () => {
  it('guarda un perfil contextual sin modificar otro profesional del consultorio', () => {
    const { result } = renderHook(() => useMock(), { wrapper });

    act(() => {
      result.current.updateProfessionalProfile({
        firstName: 'Andrea',
        lastName: 'Núñez',
        email: 'andrea+nuevo@clinicabienestar.com',
        phone: '+54 351 444 0000',
        specialty: 'Nutrición pediátrica',
        timeZone: 'America/Argentina/Cordoba',
      });
    });

    expect(result.current.currentDemoNutritionist?.email).toBe('andrea+nuevo@clinicabienestar.com');
    expect(result.current.currentDemoNutritionist?.specialty).toBe('Nutrición pediátrica');
    expect(result.current.nutritionists.find(item => item.id === 'nutri-2')?.email).toBe('carlos@clinicabienestar.com');
  });

  it('crea una invitación por siete días y permite revocarla y renovarla', () => {
    const { result } = renderHook(() => useMock(), { wrapper });
    let patientId = '';

    act(() => {
      const patient = result.current.addPatient({ firstName: 'Elena', lastName: 'Paz', email: 'ELENA@EXAMPLE.COM' });
      patientId = patient.id;
    });

    const invited = result.current.patients.find(item => item.id === patientId)!;
    expect(invited.email).toBe('elena@example.com');
    expect(invited.portalAccessStatus).toBe('pending');
    expect(new Date(invited.invitationExpiresAt!).getTime() - new Date(invited.invitedAt!).getTime()).toBe(7 * 86400000);

    act(() => result.current.revokePatientInvitation(patientId));
    expect(result.current.patients.find(item => item.id === patientId)?.portalAccessStatus).toBe('revoked');

    act(() => result.current.resendPatientInvitation(patientId));
    expect(result.current.patients.find(item => item.id === patientId)?.portalAccessStatus).toBe('pending');
  });

  it('reemplaza el plan principal sin borrar la plantilla ni el historial', () => {
    const { result } = renderHook(() => useMock(), { wrapper });
    let newPlanId = '';

    act(() => {
      const plan = result.current.createMealPlan({
        name: 'Plan de vacaciones',
        status: 'published',
        days: Array.from({ length: 7 }, (_, index) => ({ id: `day-test-${index}`, label: `Día ${index + 1}`, meals: index === 0 ? [{ id: 'meal-test', name: 'Almuerzo', items: [{ id: 'item-test', description: 'Opción flexible disponible en destino' }] }] : [] })),
      });
      newPlanId = plan.id;
    });

    act(() => result.current.assignMealPlan(newPlanId, 'pat-1', 'primary'));

    const patientAssignments = result.current.professionalMealPlanAssignments.filter(item => item.patientId === 'pat-1');
    expect(patientAssignments.filter(item => item.status === 'active')).toHaveLength(1);
    expect(patientAssignments.filter(item => item.status === 'ended')).toHaveLength(1);
    expect(result.current.patients.find(item => item.id === 'pat-1')?.currentPlan).toBe('Plan de vacaciones');
    expect(result.current.professionalMealPlans.some(item => item.id === 'meal-plan-1')).toBe(true);
    expect(result.current.professionalMealPlans.some(item => item.id === newPlanId)).toBe(true);
  });

  it('liga cada plan a un solo paciente y exige duplicarlo para reutilizar su estructura', () => {
    const { result } = renderHook(() => useMock(), { wrapper });
    expect(() => result.current.assignMealPlan('meal-plan-1', 'pat-2', 'primary')).toThrow('ya pertenece a otro paciente');

    let copyId = '';
    act(() => { copyId = result.current.duplicateMealPlan('meal-plan-1').id; });
    const copy = result.current.professionalMealPlans.find(item => item.id === copyId)!;
    expect(copy.status).toBe('draft');
    expect(copy.days[0]?.id).not.toBe(result.current.professionalMealPlans.find(item => item.id === 'meal-plan-1')?.days[0]?.id);
    expect(result.current.professionalMealPlanAssignments.some(item => item.templateId === copyId)).toBe(false);

    act(() => result.current.setMealPlanStatus(copyId, 'published'));
    act(() => result.current.assignMealPlan(copyId, 'pat-2', 'primary'));
    expect(result.current.professionalMealPlanAssignments.find(item => item.templateId === copyId)?.patientId).toBe('pat-2');
  });

  it('mantiene intacta la copia asignada cuando se edita la plantilla multidía', () => {
    const { result } = renderHook(() => useMock(), { wrapper });
    const originalSnapshot = result.current.professionalMealPlanAssignments.find(item => item.id === 'meal-assignment-1')!.snapshotDays;

    act(() => {
      const plan = result.current.professionalMealPlans.find(item => item.id === 'meal-plan-1')!;
      result.current.updateMealPlan(plan.id, {
        name: plan.name,
        status: 'published',
        days: plan.days.map((day, index) => index === 0 ? {
          ...day,
          meals: day.meals.map((meal, mealIndex) => mealIndex === 0 ? {
            ...meal,
            items: [{ id: 'new-item', description: 'Contenido modificado para futuras asignaciones' }],
          } : meal),
        } : day),
      });
    });

    expect(result.current.professionalMealPlans.find(item => item.id === 'meal-plan-1')?.days).toHaveLength(7);
    expect(result.current.professionalMealPlanAssignments.find(item => item.id === 'meal-assignment-1')?.snapshotDays).toEqual(originalSnapshot);
    expect(result.current.professionalMealPlanAssignments.find(item => item.id === 'meal-assignment-1')?.snapshotDays[0]?.meals[0]?.items[0]?.description).not.toBe('Contenido modificado para futuras asignaciones');
  });

  it('expone las dos superficies nuevas con la identidad visual del portal', () => {
    const router = createMemoryRouter([
      { path: '/professional/profile', element: <ProfessionalProfilePage /> },
      { path: '/professional/meal-plans', element: <MealPlansPage /> },
    ], { initialEntries: ['/professional/profile'] });

    render(<MockProvider><ToastProvider><RouterProvider router={router} /></ToastProvider></MockProvider>);
    expect(screen.getByRole('heading', { name: 'Mi perfil profesional' })).toBeInTheDocument();
    expect(screen.getByLabelText('Especialidad')).toBeInTheDocument();
  });

  it('muestra planes completos, pacientes con acceso y el editor de siete días', () => {
    const libraryRouter = createMemoryRouter([
      { path: '/professional/meal-plans', element: <MealPlansPage /> },
    ], { initialEntries: ['/professional/meal-plans'] });

    const library = render(<MockProvider><ToastProvider><RouterProvider router={libraryRouter} /></ToastProvider></MockProvider>);
    expect(screen.getByRole('heading', { name: 'Planes individuales' })).toBeInTheDocument();
    expect(screen.getAllByText('7 días').length).toBeGreaterThan(0);
    expect(screen.getByText('María González')).toBeInTheDocument();
    library.unmount();

    const editorRouter = createMemoryRouter([
      { path: '/professional/meal-plans/:planId', element: <MealPlanEditorPage /> },
    ], { initialEntries: ['/professional/meal-plans/meal-plan-1'] });
    render(<MockProvider><ToastProvider><RouterProvider router={editorRouter} /></ToastProvider></MockProvider>);
    expect(screen.getByLabelText('Título general del plan')).toHaveValue('Plan balance cotidiano');
    expect(screen.getByText(/hasta 4 comidas opcionales por día/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Organización del plan' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Seleccionar Día/ })).toHaveLength(7);
    expect(screen.getByText('Todo moderado')).toBeInTheDocument();
    expect(screen.getAllByText('Elementos de la comida')).toHaveLength(4);
    expect(screen.getByText(/Me resultó práctica/)).toBeInTheDocument();
    expect(screen.getByText('1 nuevo')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Marcar revisado' }));
    expect(screen.getByText('0 nuevos')).toBeInTheDocument();
    expect(screen.getByText('Revisado')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Copiar Día 2' }));
    expect(screen.getAllByRole('button', { name: /^Seleccionar Día/ })).toHaveLength(8);
    expect(screen.getByLabelText('Título adicional del día')).toHaveValue('Día de permitido');

    fireEvent.click(screen.getByRole('button', { name: 'Quitar Día 3' }));
    expect(screen.getAllByRole('button', { name: /^Seleccionar Día/ })).toHaveLength(7);

    fireEvent.click(screen.getByRole('button', { name: 'Mover Día 1 hacia abajo' }));
    expect(screen.getAllByRole('button', { name: /^Seleccionar Día/ })[0]).toHaveAttribute('aria-label', 'Seleccionar Día 1, Día de permitido');
  });

  it('permite buscar planes por título o paciente y limpiar el filtro', async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter([
      { path: '/professional/meal-plans', element: <MealPlansPage /> },
    ], { initialEntries: ['/professional/meal-plans'] });

    render(<MockProvider><ToastProvider><RouterProvider router={router} /></ToastProvider></MockProvider>);
    const search = screen.getByLabelText('Buscar planes alimentarios');
    await user.type(search, 'hidratación');
    expect(screen.getByText('Complemento de hidratación')).toBeInTheDocument();
    expect(screen.queryByText('Plan balance cotidiano')).not.toBeInTheDocument();

    await user.clear(search);
    await user.type(search, 'María');
    expect(screen.getByText('Plan balance cotidiano')).toBeInTheDocument();
    expect(screen.queryByText('Complemento de hidratación')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Limpiar búsqueda de planes' }));
    expect(screen.getByText('Complemento de hidratación')).toBeInTheDocument();
    expect(screen.getByText('Plan balance cotidiano')).toBeInTheDocument();
  });
});
