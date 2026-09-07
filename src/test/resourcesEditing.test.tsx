import React from 'react';
import { act, render, renderHook, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MockProvider, useMock } from '../app/provider';
import { ResourcesPage } from '../app/routes/professional/ResourcesPage';
import { ToastProvider } from '../components/ui/Toast';

const wrapper = ({ children }: { children: React.ReactNode }) => <MockProvider>{children}</MockProvider>;

describe('Edición de recursos', () => {
  it('permite editar un recurso propio y refleja el título al paciente', () => {
    const { result } = renderHook(() => useMock(), { wrapper });
    act(() => { result.current.updateProfessionalResource('resource-1', { title: 'Guía corregida del plato equilibrado', kind: 'document', category: 'Guías', source: 'guia-plato-equilibrado.pdf', status: 'published' }); });
    expect(result.current.professionalResources.find(resource => resource.id === 'resource-1')?.title).toBe('Guía corregida del plato equilibrado');
    expect(result.current.patientResources.find(resource => resource.id === 'resource-1')?.title).toBe('Guía corregida del plato equilibrado');
  });

  it('rechaza la edición de recursos ajenos', () => {
    const { result } = renderHook(() => useMock(), { wrapper });
    expect(() => result.current.updateProfessionalResource('resource-4', { title: 'No autorizado', kind: 'document', category: 'Deporte', source: 'archivo.pdf', status: 'published' })).toThrow('permisos');
  });

  it('corrige el título de un PDF desde el modal sin exigir volver a cargar el archivo', async () => {
    const router = createMemoryRouter([{ path: '/professional/resources', element: <ResourcesPage /> }], { initialEntries: ['/professional/resources'] });
    render(<MockProvider><ToastProvider><RouterProvider router={router} /></ToastProvider></MockProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'Editar Guía práctica para armar un plato equilibrado' }));
    const dialog = screen.getByRole('dialog', { name: 'Editar recurso' });
    const title = within(dialog).getByLabelText('Título *');
    await userEvent.clear(title);
    await userEvent.type(title, 'Guía del plato equilibrado corregida');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));
    expect(screen.getByText('Guía del plato equilibrado corregida')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Editar recurso' })).not.toBeInTheDocument();
  });
});
