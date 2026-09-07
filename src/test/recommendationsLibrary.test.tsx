import React from 'react';
import { act, render, renderHook, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MockProvider, useMock } from '../app/provider';
import { RecommendationsPage } from '../app/routes/professional/RecommendationsPage';
import { ToastProvider } from '../components/ui/Toast';

const providerWrapper = ({ children }: { children: React.ReactNode }) => <MockProvider>{children}</MockProvider>;

describe('Biblioteca de frases motivacionales', () => {
  it('mantiene una sola frase activa por paciente y propaga edición y eliminación', () => {
    const { result } = renderHook(() => useMock(), { wrapper: providerWrapper });
    let phraseId = '';

    act(() => { phraseId = result.current.addMotivationalPhrase('Elegí un paso posible para hoy.').id; });
    act(() => { result.current.setMotivationalPhrasePatients(phraseId, ['pat-1', 'pat-2']); });

    for (const patientId of ['pat-1', 'pat-2']) {
      const active = result.current.professionalRecommendations.filter(rec => rec.patientId === patientId && rec.phraseId);
      expect(active).toHaveLength(1);
      expect(active[0]?.phraseId).toBe(phraseId);
    }

    act(() => { result.current.updateMotivationalPhrase(phraseId, 'Cada paso consciente cuenta.'); });
    expect(result.current.professionalRecommendations.filter(rec => rec.phraseId === phraseId).every(rec => rec.recommendationText === 'Cada paso consciente cuenta.')).toBe(true);

    let copyId = '';
    act(() => { copyId = result.current.duplicateMotivationalPhrase(phraseId).id; });
    expect(result.current.professionalMotivationalPhrases.find(item => item.id === copyId)?.text).toContain('(copia)');

    act(() => { result.current.deleteMotivationalPhrase(phraseId); });
    expect(result.current.professionalMotivationalPhrases.some(item => item.id === phraseId)).toBe(false);
    expect(result.current.professionalRecommendations.some(rec => rec.phraseId === phraseId)).toBe(false);
  });

  it('rechaza pacientes fuera del alcance profesional', () => {
    const { result } = renderHook(() => useMock(), { wrapper: providerWrapper });
    expect(() => result.current.setMotivationalPhrasePatients('phrase-1', ['pat-4'])).toThrow(/no pertenece/i);
  });

  it('permite crear, aplicar a varios pacientes, editar, duplicar y eliminar desde la interfaz', async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter([{ path: '/professional/recommendations', element: <RecommendationsPage /> }], { initialEntries: ['/professional/recommendations'] });
    render(<MockProvider><ToastProvider><RouterProvider router={router} /></ToastProvider></MockProvider>);

    await user.click(screen.getByRole('button', { name: 'Nueva frase' }));
    await user.type(screen.getByLabelText('Frase motivacional *'), 'Un hábito simple también es progreso.');
    await user.click(screen.getByRole('button', { name: 'Guardar frase' }));

    let phraseCard = screen.getByText('“Un hábito simple también es progreso.”').closest('article')!;
    await user.click(within(phraseCard).getByRole('button', { name: 'Aplicar' }));
    const assignmentDialog = screen.getByRole('dialog', { name: 'Aplicar a pacientes' });
    await user.click(within(assignmentDialog).getByText('María González'));
    await user.click(within(assignmentDialog).getByText('Pablo Acosta'));
    await user.click(within(assignmentDialog).getByRole('button', { name: 'Guardar asignación' }));
    phraseCard = screen.getByText('“Un hábito simple también es progreso.”').closest('article')!;
    expect(within(phraseCard).getByText('María González')).toBeInTheDocument();
    expect(within(phraseCard).getByText('Pablo Acosta')).toBeInTheDocument();

    await user.click(within(phraseCard).getByRole('button', { name: 'Editar frase' }));
    const editor = screen.getByRole('dialog', { name: 'Editar frase' });
    await user.clear(within(editor).getByLabelText('Frase motivacional *'));
    await user.type(within(editor).getByLabelText('Frase motivacional *'), 'Tu constancia merece ser reconocida.');
    await user.click(within(editor).getByRole('button', { name: 'Guardar cambios' }));
    phraseCard = screen.getByText('“Tu constancia merece ser reconocida.”').closest('article')!;

    await user.click(within(phraseCard).getByRole('button', { name: 'Duplicar frase' }));
    expect(screen.getByText('“Tu constancia merece ser reconocida. (copia)”')).toBeInTheDocument();

    await user.click(within(phraseCard).getByRole('button', { name: 'Eliminar frase' }));
    await user.click(screen.getByRole('button', { name: 'Eliminar frase' }));
    expect(screen.queryByText('“Tu constancia merece ser reconocida.”')).not.toBeInTheDocument();
  });
});
