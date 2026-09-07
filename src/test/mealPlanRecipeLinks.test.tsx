import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MockProvider } from '../app/provider';
import { MealPlanEditorPage } from '../app/routes/professional/MealPlanEditorPage';
import { PatientDashboard } from '../app/routes/patient/PatientDashboard';
import { RecipeDetailPage } from '../app/routes/shared/RecipeDetailPage';
import { ToastProvider } from '../components/ui/Toast';

const renderRouter = (router: ReturnType<typeof createMemoryRouter>) => render(<MockProvider><ToastProvider><RouterProvider router={router} /></ToastProvider></MockProvider>);

describe('Recetas vinculadas a planes alimentarios', () => {
  it('permite al profesional elegir sólo recetas publicadas y abrir su ficha', async () => {
    const router = createMemoryRouter([
      { path: '/professional/meal-plans/:planId', element: <MealPlanEditorPage /> },
      { path: '/professional/recipes/:recipeId', element: <RecipeDetailPage portal="professional" /> },
    ], { initialEntries: ['/professional/meal-plans/meal-plan-1'] });
    const editorView = renderRouter(router);

    const selectors = screen.getAllByLabelText('Receta vinculada opcional');
    expect(selectors.length).toBeGreaterThan(0);
    expect(withinOptions(selectors[0]!).some(option => option.textContent === 'Avena nocturna con frutos rojos')).toBe(true);
    expect(screen.getAllByRole('link', { name: /Ver receta/ }).length).toBeGreaterThan(0);

    expect(screen.getAllByRole('link', { name: /Ver receta/ })[0]).toHaveAttribute('href', '/professional/recipes/recipe-1');
    editorView.unmount();
    renderRouter(createMemoryRouter([{ path: '/professional/recipes/:recipeId', element: <RecipeDetailPage portal="professional" /> }], { initialEntries: ['/professional/recipes/recipe-1'] }));
    expect(screen.getByRole('heading', { name: 'Avena nocturna con frutos rojos' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ingredientes' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Preparación' })).toBeInTheDocument();
  });

  it('permite al paciente abrir únicamente una receta publicada incluida en su copia del plan', async () => {
    const router = createMemoryRouter([
      { path: '/patient', element: <PatientDashboard /> },
      { path: '/patient/recipes/:recipeId', element: <RecipeDetailPage portal="patient" /> },
    ], { initialEntries: ['/patient'] });
    const dashboardView = renderRouter(router);

    expect(screen.getAllByRole('link', { name: 'Ver receta' })[0]).toHaveAttribute('href', '/patient/recipes/recipe-1');
    dashboardView.unmount();
    renderRouter(createMemoryRouter([{ path: '/patient/recipes/:recipeId', element: <RecipeDetailPage portal="patient" /> }], { initialEntries: ['/patient/recipes/recipe-1'] }));
    expect(screen.getByRole('heading', { name: 'Avena nocturna con frutos rojos' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al recetario' })).toHaveAttribute('href', '/patient/recipes');
  });

  it('no revela al paciente una receta inexistente o fuera de su acceso', () => {
    const router = createMemoryRouter([
      { path: '/patient/recipes/:recipeId', element: <RecipeDetailPage portal="patient" /> },
    ], { initialEntries: ['/patient/recipes/recipe-private'] });
    renderRouter(router);
    expect(screen.getByRole('heading', { name: 'Receta no disponible' })).toBeInTheDocument();
  });
});

function withinOptions(select: HTMLElement) {
  return Array.from(select.querySelectorAll('option'));
}
