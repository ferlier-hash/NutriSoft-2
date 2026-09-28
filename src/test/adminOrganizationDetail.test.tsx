import { render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { RealAdminOrganizationDetailPage } from '../app/routes/admin/RealAdminOrganizationDetailPage';
import type { RealAdminOrganizationDetail } from '../data/admin-organization-detail.types';

const detail: RealAdminOrganizationDetail = {
  organization: { id: '11111111-1111-4111-8111-111111111111', name: 'Consultorio Seguro', slug: 'consultorio-seguro', status: 'active', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z' },
  usage: {
    organizationId: '11111111-1111-4111-8111-111111111111', organizationName: 'Consultorio Seguro', organizationSlug: 'consultorio-seguro', organizationStatus: 'active', plan: 'ultra', subscriptionStatus: 'active', activePatients: 32, maxActivePatients: null, activeProfessionals: 3, professionalCapacity: 10, storedPdfBytes: 1048576, planStorageLimitBytes: 2147483648, uploadEnabledProfessionals: 3, effectiveLibraryQuotaBytes: 786432000, professionalsNearLibraryQuota: 0, professionalsOverLibraryQuota: 0, activeMealPlanAssignments: 18, brandingAssetsCount: 0, brandingSettingsFieldsCount: 0, connectedGoogleCalendars: 2, appointmentsInPeriod: 80, completedAppointmentsInPeriod: 65, checkinResponsesInPeriod: 43, publishedMealPlanVersionsInPeriod: 16, incomeByCurrency: [],
  },
  subscription: { organizationId: '11111111-1111-4111-8111-111111111111', plan: 'ultra', status: 'active', extraProfessionals: 0, includedProfessionals: 10, customBrandingEnabled: false },
  professionals: [{ userId: '22222222-2222-4222-8222-222222222222', fullName: 'Lic. Ana Profesional', email: 'ana@example.test', organizationId: '11111111-1111-4111-8111-111111111111', organizationName: 'Consultorio Seguro', membershipStatus: 'active', accountSuspended: false, assignedPatientCount: 12, createdAt: '2026-01-02T00:00:00Z' }],
  revenue: { organizationId: '11111111-1111-4111-8111-111111111111', organizationName: 'Consultorio Seguro', organizationSlug: 'consultorio-seguro', currentPlan: 'ultra', termId: null, termPlan: null, billingFrequency: null, termAmount: null, termCurrency: null, effectiveFrom: null, termHistory: [], receivedByCurrency: [] },
  billingCycles: [],
  receipts: [],
  recentAudit: [{ eventId: '33333333-3333-4333-8333-333333333333', occurredAt: '2026-09-02T12:00:00Z', eventType: 'subscription_changed', organizationId: '11111111-1111-4111-8111-111111111111', organizationName: 'Consultorio Seguro', organizationSlug: 'consultorio-seguro', previousValue: 'pro · active', newValue: 'ultra · active', extraProfessionals: 0, totalCount: 1 }],
};

describe('Ficha REAL del consultorio en Platform Admin', () => {
  it('reúne uso, equipo y cuenta comercial sin mostrar identidades ni información clínica de pacientes', async () => {
    const router = createMemoryRouter([{ path: '/admin/organizations/:organizationId', element: <RealAdminOrganizationDetailPage loadDetail={async () => detail} /> }], { initialEntries: ['/admin/organizations/11111111-1111-4111-8111-111111111111'] });
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole('heading', { name: 'Consultorio Seguro' })).toBeInTheDocument();
    expect(screen.getByText('32')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('Lic. Ana Profesional')).toBeInTheDocument();
    expect(screen.getByText(/12 asignaciones activas agregadas/)).toBeInTheDocument();
    expect(screen.getByText(/no permite abrir pacientes/i)).toBeInTheDocument();
    expect(screen.getByText(/Cambio de plan/)).toBeInTheDocument();
    expect(screen.queryByText(/Laura Paciente|nota clínica|plan alimentario de Laura/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Reportes y facturación' })).toHaveAttribute('href', '/admin/usage');
  });

  it('no reemplaza la respuesta segura de inexistente/sin acceso por una vista DEMO', async () => {
    const router = createMemoryRouter([{ path: '/admin/organizations/:organizationId', element: <RealAdminOrganizationDetailPage loadDetail={async () => null} /> }], { initialEntries: ['/admin/organizations/11111111-1111-4111-8111-111111111111'] });
    render(<RouterProvider router={router} />);
    const section = await screen.findByRole('heading', { name: 'Consultorio no disponible' });
    expect(within(section.parentElement!).getByText(/no existe o tu sesión no tiene acceso/i)).toBeInTheDocument();
  });
});
