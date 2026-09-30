import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { RealAppointmentsPage } from '../app/routes/professional/RealAppointmentsPage';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
const appointment = { id: 'appointment-1', patient_id: 'patient-1', starts_at: '2026-09-01T12:00:00Z', time_zone: 'America/Argentina/Cordoba', duration_minutes: 45, modality: 'virtual', status: 'confirmed', payment_status: 'pending', billing_disposition: 'chargeable', currency: 'ARS', quoted_amount: 100, virtual_meeting_url: null };
const data: Record<string, unknown[]> = {
  appointments: [appointment],
  patient_directory: [{ id: 'patient-1', first_name: 'María', last_name: 'Prueba' }],
  professional_appointment_notes: [],
};
vi.mock('../auth/supabase-client', () => ({ getSupabaseClient: () => ({ schema: () => ({
  rpc,
  from: (table: string) => {
    const result = { data: data[table] ?? [], error: null };
    const query: Record<string, unknown> = { select: () => query, eq: () => query, order: () => query, then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve) };
    return query;
  },
}) }) }));
vi.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ accessContext: { memberships: [{ organization_id: 'org-1', role: 'nutritionist', membership_status: 'active', organization_status: 'active' }] } }) }));
vi.mock('../components/domain/RealBranding', () => ({ useRealBranding: () => ({ activeOrganizationId: 'org-1' }) }));

beforeEach(() => { rpc.mockReset().mockResolvedValue({ data: new Date().toISOString(), error: null }); data.professional_appointment_notes = []; });

it('guarda una nota privada por RPC desde Citas y mantiene las acciones de agenda separadas', async () => {
  render(<MemoryRouter><RealAppointmentsPage /></MemoryRouter>);
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Agregar nota privada' }));
  expect(screen.getByText(/Sólo vos, como profesional asignado/)).toBeInTheDocument();
  await user.type(screen.getByRole('textbox', { name: /Nota de consulta/ }), 'Seguimiento de prueba');
  await user.click(screen.getByRole('button', { name: 'Guardar nota privada' }));
  expect(rpc).toHaveBeenCalledWith('save_appointment_private_note', { p_appointment_id: 'appointment-1', p_note: 'Seguimiento de prueba' });
  expect(await screen.findByRole('heading', { name: 'Citas' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Abrir Agenda/ })).toHaveAttribute('href', '/professional/agenda');
});

it('cierra sólo una cita iniciada y deja la decisión manual de ausencia en Citas', async () => {
  render(<MemoryRouter><RealAppointmentsPage /></MemoryRouter>);
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Acciones' }));
  await user.click(screen.getByRole('button', { name: 'Marcar completada' }));
  expect(rpc).toHaveBeenCalledWith('set_professional_appointment_outcome', { p_appointment_id: 'appointment-1', p_status: 'completed' });
});
