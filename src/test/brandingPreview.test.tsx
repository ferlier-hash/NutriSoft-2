import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BrandingColorPreview } from '../components/domain/BrandingColorPreview';
import type { OrganizationBranding } from '../types';
import { organizationBrandingStyle } from '../lib/organizationBranding';

describe('Custom palette preview', () => {
  it('changes draft colors without mutating the saved identity and switches independent headers', () => {
    const saved: OrganizationBranding = { displayName: 'Consultorio', colorPreset: 'aqua', professionalHeaderImageDataUrl: '/professional.png', patientHeaderImageDataUrl: '/patient.png' };
    function Harness() {
      const [draft, setDraft] = useState(saved);
      return <BrandingColorPreview branding={draft} onChange={colorPreset => setDraft(current => ({ ...current, colorPreset }))} />;
    }
    render(<Harness />);
    expect(screen.getAllByRole('radio')).toHaveLength(10);
    fireEvent.click(screen.getByRole('radio', { name: 'Rosa' }));
    expect(screen.getByTestId('branding-preview').style.getPropertyValue('--brand-primary')).toBe('#C482A2');
    expect(saved.colorPreset).toBe('aqua');
    expect(screen.getByAltText('Cabecera profesional')).toHaveAttribute('src', '/professional.png');
    fireEvent.click(screen.getByRole('button', { name: 'Paciente' }));
    expect(screen.getByAltText('Cabecera paciente')).toHaveAttribute('src', '/patient.png');
    expect(screen.queryByAltText('Cabecera profesional')).not.toBeInTheDocument();
    expect(organizationBrandingStyle(undefined)).toBeUndefined();
  });
});
