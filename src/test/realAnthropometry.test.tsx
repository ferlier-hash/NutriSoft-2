import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RealPatientAnthropometryPage } from '../app/routes/professional/RealPatientAnthropometryPage';
import * as repository from '../data/supabase/anthropometry.repository';
import { localDate, measurementRange } from '../lib/anthropometry';
vi.mock('../data/supabase/anthropometry.repository', () => ({ loadAnthropometryPatients: vi.fn(), loadAnthropometryFields: vi.fn(), loadAnthropometry: vi.fn(), saveAnthropometry: vi.fn(), deleteAnthropometry: vi.fn() }));
const mount = () => render(<MemoryRouter initialEntries={['/professional/patients/p1']}><Routes><Route path="/professional/patients/:patientId" element={<RealPatientAnthropometryPage />} /></Routes></MemoryRouter>);
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(repository.loadAnthropometryPatients).mockResolvedValue([{ id: 'p1', organization_id: 'o1', first_name: 'Laura', last_name: 'Pérez' }]);
  vi.mocked(repository.loadAnthropometryFields).mockResolvedValue([]);
  vi.mocked(repository.loadAnthropometry).mockResolvedValue([]);
});
describe('Antropometría real', () => {
  it('guarda la fecha elegida y sólo las mediciones completadas', async () => {
    const user = userEvent.setup(); mount();
    await screen.findByText('Laura Pérez'); await user.click(screen.getByRole('button', { name: 'Nueva medición' }));
    const form = within(screen.getByRole('dialog'));
    fireEvent.change(form.getByLabelText('Fecha'), { target: { value: '2026-01-23' } });
    await user.type(form.getByLabelText('Peso (kg)'), '72.5');
    await user.click(form.getByRole('button', { name: 'Guardar medición' }));
    expect(repository.saveAnthropometry).toHaveBeenCalledWith('p1', undefined, '2026-01-23', { weightKg: 72.5 }, '');
  });
  it('no consulta revisiones de una ficha fuera del alcance autorizado', async () => {
    vi.mocked(repository.loadAnthropometryPatients).mockResolvedValue([]); mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('Ficha no disponible');
    expect(repository.loadAnthropometry).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Nueva medición' })).not.toBeInTheDocument();
  });
  it('mantiene abierto el formulario y muestra el error al fallar el guardado', async () => {
    vi.mocked(repository.saveAnthropometry).mockRejectedValue(new Error('No se guardó la revisión.'));
    const user = userEvent.setup(); mount(); await screen.findByText('Laura Pérez');
    await user.click(screen.getByRole('button', { name: 'Nueva medición' }));
    const form = within(screen.getByRole('dialog')); await user.type(form.getByLabelText('Peso (kg)'), '70');
    await user.click(form.getByRole('button', { name: 'Guardar medición' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se guardó');
    expect(form.getByLabelText('Peso (kg)')).toHaveValue(70);
  });
  it('calcula períodos inclusivos y conserva límites personalizados', () => {
    const range = measurementRange('7', '', '');
    const start = new Date(); start.setDate(start.getDate() - 6);
    expect(range).toEqual({ from: localDate(start), to: localDate() });
    expect(measurementRange('custom', '2026-01-01', '2026-01-23')).toEqual({ from: '2026-01-01', to: '2026-01-23' });
  });
});
