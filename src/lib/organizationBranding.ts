import type { OrganizationBranding } from '../types';

export const palettes: Record<OrganizationBranding['colorPreset'], { primary: string; strong: string; soft: string }> = {
  aqua: { primary: '#55AEB8', strong: '#357984', soft: '#DDF3F2' },
  ocean: { primary: '#5A9FD4', strong: '#256792', soft: '#E2F0FB' },
  forest: { primary: '#55A878', strong: '#27643F', soft: '#E4F4E9' },
  violet: { primary: '#8B7BC7', strong: '#564799', soft: '#EEEAFB' },
  coral: { primary: '#D98676', strong: '#9D4B43', soft: '#FBEAE6' },
  teal: { primary: '#49A79B', strong: '#236C62', soft: '#DFF3EE' },
  indigo: { primary: '#7C8CCD', strong: '#43548F', soft: '#E9EDFB' },
  rose: { primary: '#C482A2', strong: '#874565', soft: '#F8E8EF' },
  olive: { primary: '#9BA66C', strong: '#596534', soft: '#EFF2E3' },
  slate: { primary: '#8B9EAD', strong: '#465F72', soft: '#EAF0F4' },
};

/** Variables acotadas a un portal: no admite CSS, fuentes ni layouts arbitrarios. */
export function organizationBrandingStyle(branding?: OrganizationBranding): Record<string, string> | undefined {
  if (!branding) return undefined;
  const palette = palettes[branding.colorPreset] ?? palettes.aqua;
  return {
    '--color-brand-primary': palette.primary,
    '--color-brand-strong': palette.strong,
    '--color-brand-soft': palette.soft,
    '--brand-primary': palette.primary,
    '--brand-strong': palette.strong,
    '--brand-soft': palette.soft,
    '--grad-primary-button': `linear-gradient(90deg, ${palette.soft}, ${palette.primary}55)`,
    '--grad-nav-active': `linear-gradient(90deg, ${palette.soft}, ${palette.soft}99)`,
    '--grad-icon': `linear-gradient(135deg, ${palette.primary}, ${palette.soft})`,
  };
}
