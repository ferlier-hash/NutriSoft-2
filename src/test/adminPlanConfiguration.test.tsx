import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RealAdminSettingsPage } from '../app/routes/admin/RealAdminSettingsPage';

const { loadAdminPlanConfiguration, saveAdminPlanConfiguration, saveAdminAddonConfiguration } = vi.hoisted(() => ({
  loadAdminPlanConfiguration: vi.fn(), saveAdminPlanConfiguration: vi.fn(), saveAdminAddonConfiguration: vi.fn(),
}));
vi.mock('../data/supabase/commercial-plan.repository', () => ({ loadAdminPlanConfiguration, saveAdminPlanConfiguration, saveAdminAddonConfiguration }));

const configuration = {
  plans: [
    { slug: 'pro' as const, displayName: 'PRO', version: 1, maxActivePatients: 50, includedProfessionals: 1, extraProfessionalEnabled: true, storageLimitBytes: 1073741824, customBrandingEnabled: false, active: true },
    { slug: 'ultra' as const, displayName: 'ULTRA', version: 1, maxActivePatients: null, includedProfessionals: 10, extraProfessionalEnabled: false, storageLimitBytes: 2147483648, customBrandingEnabled: false, active: true },
    { slug: 'custom' as const, displayName: 'CUSTOM', version: 1, maxActivePatients: null, includedProfessionals: 1, extraProfessionalEnabled: false, storageLimitBytes: null, customBrandingEnabled: true, active: true },
  ],
  addons: [
    { code: 'extra_professional' as const, displayName: 'Profesional adicional', unitKind: 'professional_seat', unitBytes: null, active: true },
    { code: 'extra_pdf_space' as const, displayName: 'Espacio PDF adicional', unitKind: 'pdf_bytes_per_professional', unitBytes: 262144000, active: true },
  ],
};

describe('Configuración comercial REAL de Admin', () => {
  beforeEach(() => { vi.clearAllMocks(); loadAdminPlanConfiguration.mockResolvedValue(configuration); saveAdminPlanConfiguration.mockResolvedValue(undefined); saveAdminAddonConfiguration.mockResolvedValue(undefined); });

  it('muestra límites versionados y conserva el carácter prospectivo del cambio', async () => {
    const user = userEvent.setup();
    render(<RealAdminSettingsPage />);
    expect(await screen.findByRole('heading', { name: 'Configuración comercial' })).toBeInTheDocument();
    expect(screen.getByText(/no modifican automáticamente consultorios existentes/i)).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: /Guardar nueva versión/i })[0]!);
    expect(saveAdminPlanConfiguration).toHaveBeenCalledWith(configuration.plans[0]);
    expect(await screen.findByText(/guardada una nueva versión/i)).toBeInTheDocument();
    expect(loadAdminPlanConfiguration).toHaveBeenCalledTimes(2);
  });

  it('guarda la unidad de espacio adicional sin mezclarla con precios o cobros', async () => {
    const user = userEvent.setup();
    render(<RealAdminSettingsPage />);
    await screen.findByRole('heading', { name: 'Configuración comercial' });
    await user.clear(screen.getByLabelText('Unidad de espacio PDF adicional (MB)'));
    await user.type(screen.getByLabelText('Unidad de espacio PDF adicional (MB)'), '500');
    await user.click(screen.getByRole('button', { name: 'Guardar adicionales' }));
    expect(saveAdminAddonConfiguration).toHaveBeenCalledWith(500 * 1024 * 1024, true, true);
  });
});
