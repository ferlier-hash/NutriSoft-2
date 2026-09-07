import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RealAdminOverviewPage } from '../app/routes/admin/RealAdminOverviewPage';
import type { RealAdminOverview } from '../data/admin-overview.types';
import { parseRealAdminOverview } from '../data/supabase/admin-overview.repository';

const overview: RealAdminOverview = {
  metrics: {
    organizationsTotal: 2,
    organizationsActive: 1,
    organizationsSuspended: 1,
    nutritionistsTotal: 4,
    patientsTotal: 18,
  },
  organizations: [{
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Clínica Bienestar',
    slug: 'clinica-bienestar',
    status: 'active',
    createdAt: '2026-08-01T12:00:00+00:00',
    updatedAt: '2026-08-01T12:00:00+00:00',
  }],
};

describe('primer corte real de administración', () => {
  it('presenta sólo métricas agregadas y el directorio administrativo', async () => {
    render(<RealAdminOverviewPage loadOverview={vi.fn().mockResolvedValue(overview)} />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando datos administrativos reales');
    expect(await screen.findByText('Clínica Bienestar')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('Sólo conteo agregado')).toBeInTheDocument();
    expect(screen.queryByText(/check-in/i)).not.toBeInTheDocument();
  });

  it('explica el estado vacío sin ofrecer una escritura ficticia', async () => {
    render(<RealAdminOverviewPage loadOverview={vi.fn().mockResolvedValue({ ...overview, organizations: [] })} />);
    expect(await screen.findByText('Todavía no hay consultorios')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /nuevo consultorio/i })).not.toBeInTheDocument();
  });

  it('permite reintentar un error recuperable', async () => {
    const loader = vi.fn().mockRejectedValueOnce(new Error('red')).mockResolvedValueOnce(overview);
    render(<RealAdminOverviewPage loadOverview={loader} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Clínica Bienestar')).toBeInTheDocument();
    await waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
  });

  it('rechaza payloads incompletos antes de renderizarlos', () => {
    expect(() => parseRealAdminOverview({ organizations_total: 2 }, [])).toThrow('métricas administrativas inválidas');
  });
});
