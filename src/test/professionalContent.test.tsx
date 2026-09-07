import React from 'react';
import { act, render, renderHook, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MockProvider, useMock } from '../app/provider';
import { ToastProvider } from '../components/ui/Toast';
import { RecipesPage } from '../app/routes/professional/RecipesPage';
import { ResourcesPage } from '../app/routes/professional/ResourcesPage';

const renderRoute = (path: string, element: React.ReactNode) => {
  const router = createMemoryRouter([{ path, element }], { initialEntries: [path] });
  return render(<MockProvider><ToastProvider><RouterProvider router={router} /></ToastProvider></MockProvider>);
};

describe('Biblioteca y recetario del profesional', () => {
  it('aísla recursos y recetas por nutricionista incluso dentro de la plataforma compartida', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <MockProvider>{children}</MockProvider>;
    const { result } = renderHook(() => useMock(), { wrapper });

    expect(result.current.professionalRecipes).toHaveLength(5);
    expect(result.current.professionalResources).toHaveLength(8);
    expect(result.current.professionalRecipes.every(item => item.ownerNutritionistId === 'nutri-1')).toBe(true);

    act(() => result.current.setCurrentDemoNutritionistId('nutri-3'));
    expect(result.current.professionalRecipes).toHaveLength(1);
    expect(result.current.professionalResources).toHaveLength(1);
    expect(result.current.professionalRecipes[0]?.ownerNutritionistId).toBe('nutri-3');
    expect(result.current.professionalRecipes.some(item => item.title === 'Avena nocturna con frutos rojos')).toBe(false);
  });

  it('muestra cinco recetas útiles y filtra por categoría y etiqueta', async () => {
    const user = userEvent.setup();
    renderRoute('/professional/recipes', <RecipesPage />);

    expect(screen.getByRole('heading', { name: 'Recetario y nutrición' })).toBeInTheDocument();
    expect(screen.getAllByText(/Visible para 3 pacientes/)).toHaveLength(5);
    await user.click(screen.getByRole('button', { name: 'Desayunos' }));
    expect(screen.getByText('Avena nocturna con frutos rojos')).toBeInTheDocument();
    expect(screen.getByText('Tostadas de huevo y palta')).toBeInTheDocument();
    expect(screen.queryByText('Pollo al limón con batatas')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Filtrar por etiqueta nutricional'), 'Rápida');
    expect(screen.getByText('Tostadas de huevo y palta')).toBeInTheDocument();
    expect(screen.queryByText('Avena nocturna con frutos rojos')).not.toBeInTheDocument();
  });

  it('busca recetas por texto y permite limpiar la búsqueda sin perder los filtros', async () => {
    const user = userEvent.setup();
    renderRoute('/professional/recipes', <RecipesPage />);

    const search = screen.getByLabelText('Buscar recetas');
    await user.type(search, 'batatas');
    expect(screen.getByText('Pollo al limón con batatas')).toBeInTheDocument();
    expect(screen.queryByText('Avena nocturna con frutos rojos')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Limpiar búsqueda de recetas' }));
    expect(screen.getByText('Avena nocturna con frutos rojos')).toBeInTheDocument();
    expect(screen.getByText('Pollo al limón con batatas')).toBeInTheDocument();
  });

  it('publica un enlace educativo y lo comparte sólo con los pacientes propios', async () => {
    const user = userEvent.setup();
    renderRoute('/professional/resources', <ResourcesPage />);

    await user.click(screen.getByRole('button', { name: 'Agregar recurso' }));
    const dialog = screen.getByRole('dialog', { name: 'Agregar recurso' });
    await user.selectOptions(within(dialog).getByLabelText('Tipo de recurso'), 'video');
    await user.type(within(dialog).getByLabelText('Título *'), 'Video sobre hidratación diaria');
    await user.clear(within(dialog).getByLabelText('Categoría *'));
    await user.type(within(dialog).getByLabelText('Categoría *'), 'Educación');
    await user.type(within(dialog).getByLabelText('Enlace del video *'), 'https://www.youtube.com/watch?v=hidratacion');
    await user.click(within(dialog).getByRole('button', { name: 'Publicar recurso' }));

    expect(screen.getByText('Video sobre hidratación diaria')).toBeInTheDocument();
    expect(screen.getAllByText('Visible para 3 pacientes').length).toBeGreaterThan(0);
  });

  it('mantiene borradores privados, publica de forma explícita y duplica sin modificar el original', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <MockProvider>{children}</MockProvider>;
    const { result } = renderHook(() => useMock(), { wrapper });

    let draftResource: ReturnType<typeof result.current.addProfessionalResource> | undefined;
    act(() => {
      draftResource = result.current.addProfessionalResource({
        title: 'Borrador privado',
        kind: 'document',
        category: 'Guías',
        source: 'borrador.pdf',
        status: 'draft',
      });
    });
    expect(result.current.patientResources.some(item => item.id === draftResource?.id)).toBe(false);

    act(() => result.current.setProfessionalResourceStatus(draftResource!.id, 'published'));
    expect(result.current.patientResources.some(item => item.id === draftResource?.id)).toBe(true);

    const original = result.current.professionalRecipes[0]!;
    let copy: ReturnType<typeof result.current.duplicateProfessionalRecipe> | undefined;
    act(() => { copy = result.current.duplicateProfessionalRecipe(original.id); });
    expect(copy?.status).toBe('draft');
    expect(copy?.sourceRecipeId).toBe(original.id);
    expect(result.current.professionalRecipes.find(item => item.id === original.id)?.title).toBe(original.title);
    expect(result.current.patientRecipes.some(item => item.id === copy?.id)).toBe(false);
  });
});
