import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RealRecipesPage } from '../app/routes/professional/RealRecipesPage';
import { ToastProvider } from '../components/ui/Toast';
import { loadLibrary, saveLibrary } from '../data/supabase/library.repository';

vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({ accessContext: { memberships: [{ role: 'nutritionist', membership_status: 'active', organization_status: 'active', organization_id: 'org', organization_name: 'Clínica Bienestar' }] } }),
}));
vi.mock('../data/supabase/library.repository', () => ({ loadLibrary: vi.fn(), saveLibrary: vi.fn() }));

const recipes = [
  { id: 'r1', organization_id: 'org', owner_user_id: 'owner', kind: 'recipe', title: 'Avena', category: 'Desayunos', status: 'draft', updated_at: '2026-09-04', body: { ingredients: 'Avena\nAgua', steps: 'Cocinar', minutes: 10, servings: 1, tags: 'Vegetariana' } },
  { id: 'r2', organization_id: 'org', owner_user_id: 'owner', kind: 'recipe', title: 'Ensalada', category: 'Almuerzos', status: 'published', updated_at: '2026-09-05', body: { ingredients: 'Hojas verdes', steps: 'Mezclar', minutes: 15, servings: 2 } },
] as never;

function renderPage(path = '/professional/recipes') {
  return render(<ToastProvider><MemoryRouter initialEntries={[path]}><Routes><Route path="/professional/recipes" element={<RealRecipesPage/>}/><Route path="/professional/recipes/:recipeId" element={<RealRecipesPage/>}/></Routes></MemoryRouter></ToastProvider>);
}

describe('Recetario REAL', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(loadLibrary).mockResolvedValue(recipes); vi.mocked(saveLibrary).mockResolvedValue('r1'); });

  it('resume, filtra y publica recetas de la profesional', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Avena' });
    expect(screen.getByText(/2 de 2 recetas · Clínica Bienestar/)).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Buscar por nombre, categoría o etiqueta…'), { target: { value: 'Avena' } });
    expect(screen.queryByRole('heading', { name: 'Ensalada' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }));
    await waitFor(() => expect(saveLibrary).toHaveBeenCalledWith(expect.objectContaining({ id: 'r1', status: 'published', updated_at: '2026-09-04' })));
  });

  it('abre una ficha real desde una URL de plan sin revelar otra receta', async () => {
    renderPage('/professional/recipes/r2');
    await screen.findByRole('dialog');
    expect(screen.getByRole('heading', { name: 'Ensalada' })).toBeInTheDocument();
    expect(screen.getByText('Hojas verdes')).toBeInTheDocument();
    expect(screen.queryByText('Avena y agua')).not.toBeInTheDocument();
  });

  it('crea un borrador con la estructura requerida', async () => {
    renderPage();
    await screen.findByText(/2 de 2 recetas · Clínica Bienestar/);
    fireEvent.click(screen.getByRole('button', { name: 'Nueva receta' }));
    fireEvent.change(screen.getByLabelText('Nombre de la receta *'), { target: { value: 'Sopa suave' } });
    fireEvent.change(screen.getByLabelText(/Ingredientes/), { target: { value: 'Zapallo' } });
    fireEvent.change(screen.getByLabelText(/Preparación/), { target: { value: 'Cocinar' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }));
    await waitFor(() => expect(saveLibrary).toHaveBeenCalledWith(expect.objectContaining({ organization_id: 'org', kind: 'recipe', title: 'Sopa suave', status: 'draft' })));
  });
});
