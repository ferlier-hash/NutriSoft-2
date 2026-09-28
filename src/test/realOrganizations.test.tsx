import { render, screen, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { RealOrganizationsPage } from '../app/routes/admin/RealOrganizationsPage';
import type { RealAdminOrganization } from '../data/admin-overview.types';

const organizations: RealAdminOrganization[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Clínica Bienestar',
    slug: 'clinica-bienestar',
    status: 'active',
    createdAt: '2026-08-01T12:00:00+00:00',
    updatedAt: '2026-08-12T15:30:00+00:00',
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Centro Pausado',
    slug: 'centro-pausado',
    status: 'suspended',
    createdAt: '2026-08-02T12:00:00+00:00',
    updatedAt: '2026-08-13T09:15:00+00:00',
  },
];

function renderDirectory(props: ComponentProps<typeof RealOrganizationsPage>) {
  return render(<MemoryRouter><RealOrganizationsPage {...props} /></MemoryRouter>);
}

describe('directorio real de consultorios', () => {
  it('busca y filtra localmente sin repetir la consulta autorizada', async () => {
    const user = userEvent.setup();
    const loader = vi.fn().mockResolvedValue(organizations);
    renderDirectory({ loadOrganizations: loader });
    expect(await screen.findByText('Clínica Bienestar')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Buscar consultorio'), 'pausado');
    expect(screen.queryByText('Clínica Bienestar')).not.toBeInTheDocument();
    expect(screen.getByText('Centro Pausado')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Buscar consultorio'));
    await user.selectOptions(screen.getByLabelText('Estado'), 'active');
    expect(screen.getByText('Clínica Bienestar')).toBeInTheDocument();
    expect(screen.queryByText('Centro Pausado')).not.toBeInTheDocument();
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('ofrece limpiar filtros cuando no hay coincidencias', async () => {
    const user = userEvent.setup();
    renderDirectory({ loadOrganizations: vi.fn().mockResolvedValue(organizations) });
    await screen.findByText('Clínica Bienestar');
    await user.type(screen.getByLabelText('Buscar consultorio'), 'inexistente');
    expect(screen.getByText('No encontramos consultorios con esos filtros')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(screen.getByText('Clínica Bienestar')).toBeInTheDocument();
  });

  it('muestra un vacío inicial sin acciones de escritura', async () => {
    renderDirectory({ loadOrganizations: vi.fn().mockResolvedValue([]) });
    expect(await screen.findByText('Todavía no hay consultorios')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /nuevo consultorio/i })).not.toBeInTheDocument();
  });

  it('permite recuperar un error sin revelar detalles internos', async () => {
    const user = userEvent.setup();
    const loader = vi.fn().mockRejectedValueOnce(new Error('detalle interno')).mockResolvedValueOnce(organizations);
    renderDirectory({ loadOrganizations: loader });
    const alert = await screen.findByRole('alert');
    expect(within(alert).queryByText('detalle interno')).not.toBeInTheDocument();
    await user.click(within(alert).getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Clínica Bienestar')).toBeInTheDocument();
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
