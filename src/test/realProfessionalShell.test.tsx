import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { RealProfessionalShell } from '../app/layouts/RealProfessionalShell';
vi.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ profile: { fullName: 'Profesional de prueba' }, signOut: vi.fn() }) }));
it('activa sólo rutas conectadas y cierra el menú móvil al navegar', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter><RealProfessionalShell /></MemoryRouter>);
  expect(screen.getByRole('link', { name: 'Ingresos' })).toHaveAttribute('href', '/professional/income');
  expect(screen.queryByRole('link', { name: 'Citas' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Check-ins' })).toHaveAttribute('href', '/professional/checkins');
  await user.click(screen.getByRole('button', { name: 'Abrir menú' }));
  const menu = within(screen.getByRole('dialog'));
  await user.click(menu.getByRole('link', { name: 'Pacientes' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('prioriza Inicio, Pacientes, Agenda y Bandeja en la barra inferior profesional', () => {
  render(<MemoryRouter><RealProfessionalShell /></MemoryRouter>);
  const quickNav = within(screen.getByRole('navigation', { name: 'Accesos rápidos' }));
  expect(quickNav.getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/professional');
  expect(quickNav.getByRole('link', { name: 'Pacientes' })).toHaveAttribute('href', '/professional/patients');
  expect(quickNav.getByRole('link', { name: 'Agenda' })).toHaveAttribute('href', '/professional/agenda');
  expect(quickNav.getByRole('link', { name: 'Bandeja' })).toHaveAttribute('href', '/professional/inbox');
  expect(quickNav.getByRole('button', { name: 'Más' })).toBeInTheDocument();
  expect(quickNav.queryByRole('link', { name: 'Planes alimentarios' })).not.toBeInTheDocument();
});
