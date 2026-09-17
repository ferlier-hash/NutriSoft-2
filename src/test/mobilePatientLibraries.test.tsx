import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { RealLibraryPage } from '../app/routes/shared/RealLibraryPage';
import { RealPatientDetailPage } from '../app/routes/professional/RealPatientDetailPage';

const libraryItems = [
  { id: 'recipe-1', organization_id: 'org-1', owner_user_id: 'pro-1', title: 'Ensalada completa', category: 'Almuerzos', kind: 'recipe' as const, status: 'published' as const, body: { minutes: 20, servings: 2, tags: 'vegetariana' }, updated_at: '2026-09-14T10:00:00Z' },
  { id: 'resource-1', organization_id: 'org-1', owner_user_id: 'pro-1', title: 'Guía de porciones', category: 'Guías', kind: 'document' as const, status: 'published' as const, body: { filename: 'porciones.pdf', path: 'private/file.pdf' }, updated_at: '2026-09-14T10:00:00Z' },
];

vi.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ accessContext: { memberships: [] } }) }));
vi.mock('../data/supabase/library.repository', async importOriginal => {
  const original = await importOriginal<typeof import('../data/supabase/library.repository')>();
  return { ...original, loadLibrary: async () => libraryItems, downloadLibraryPdf: vi.fn() };
});
vi.mock('../data/supabase/patient-profile.repository', () => ({
  loadClinicalPatients: async () => [{ id: 'patient-1', first_name: 'María', last_name: 'González', email: 'maria@test.com', phone: null, city: null, birth_date: null, status: 'active' }],
  loadRecentPatientAppointments: async () => [],
}));
vi.mock('../data/supabase/clinical-meal-plans.repository', () => ({ loadProfessionalMealPlans: async () => [] }));
vi.mock('../components/domain/RealInitialMeasurements', () => ({ RealInitialMeasurements: () => <p>Mediciones iniciales</p> }));
vi.mock('../app/routes/shared/RealDailyFollowupPage', () => ({ RealDailyFollowupPage: ({ section }: { section: string }) => <p>Seguimiento {section}</p> }));
vi.mock('../app/routes/professional/RealPatientAnthropometryPage', () => ({ RealPatientAnthropometryPage: () => <p>Antropometría</p> }));

beforeEach(() => vi.clearAllMocks());

it('presenta recetas REAL del paciente como filas completas que abren el detalle', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter><RealLibraryPage recipes patient /></MemoryRouter>);
  expect(await screen.findByRole('region', { name: 'Recetas disponibles' })).toBeInTheDocument();
  const recipe = screen.getByRole('button', { name: /Ensalada completa/ });
  expect(recipe).toHaveTextContent('20 min');
  expect(recipe).toHaveTextContent('2 porciones');
  await user.click(recipe);
  expect(screen.getByRole('dialog')).toHaveTextContent('Ensalada completa');
});

it('presenta recursos REAL en filas con una acción primaria clara', async () => {
  render(<MemoryRouter><RealLibraryPage recipes={false} patient /></MemoryRouter>);
  expect(await screen.findByRole('region', { name: 'Recursos disponibles' })).toHaveTextContent('Guía de porciones');
  expect(screen.getByRole('button', { name: 'Descargar Guía de porciones' })).toBeInTheDocument();
  expect(screen.getByText('porciones.pdf')).toBeInTheDocument();
});

it('ofrece un selector compacto para navegar la ficha profesional', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter initialEntries={['/professional/patients/patient-1']}><Routes><Route path="/professional/patients/:patientId" element={<RealPatientDetailPage />} /></Routes></MemoryRouter>);
  const selector = await screen.findByLabelText('Sección de la ficha');
  expect(selector).toHaveValue('basic');
  await user.selectOptions(selector, 'plans');
  expect(await screen.findByText('No hay planes vinculados a este paciente.')).toBeInTheDocument();
});
