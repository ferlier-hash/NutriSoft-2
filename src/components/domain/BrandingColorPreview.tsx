import { useState } from 'react';
import { CalendarDays, Check, Home, Users, Utensils } from 'lucide-react';
import type { OrganizationBranding } from '../../types';
import { organizationBrandingStyle, palettes } from '../../lib/organizationBranding';

const choices: Array<[OrganizationBranding['colorPreset'], string]> = [
  ['aqua', 'Aqua'], ['ocean', 'Océano'], ['forest', 'Bosque'], ['violet', 'Violeta'], ['coral', 'Coral'],
  ['teal', 'Jade'], ['indigo', 'Índigo'], ['rose', 'Rosa'], ['olive', 'Oliva'], ['slate', 'Pizarra'],
];

export function BrandingColorPreview({ branding, onChange }: {
  branding: OrganizationBranding;
  onChange: (preset: OrganizationBranding['colorPreset']) => void;
}) {
  const [portal, setPortal] = useState<'professional' | 'patient'>('professional');
  const professional = portal === 'professional';
  const header = professional ? branding.professionalHeaderImageDataUrl : branding.patientHeaderImageDataUrl;
  return <section className="space-y-4">
    <fieldset>
      <legend className="form-label">Color de marca</legend>
      <p className="text-xs text-text-secondary mb-3">Probá una paleta y mirá cómo cambia la vista previa. Los avisos de error y los estados mantienen sus colores.</p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {choices.map(([key, label]) => <label key={key} className={`relative flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-xs min-h-11 ${branding.colorPreset === key ? 'border-brand-strong bg-white' : 'border-border-subtle bg-white/60'}`}>
          <input type="radio" name="brand-palette" value={key} checked={branding.colorPreset === key} onChange={() => onChange(key)} className="peer sr-only" />
          <span className="absolute inset-0 rounded-xl peer-focus-visible:ring-2 peer-focus-visible:ring-brand-strong" />
          <span className="h-5 w-5 shrink-0 rounded-full border border-black/10" style={{ background: palettes[key].primary }} />
          <span>{label}</span>{branding.colorPreset === key && <Check className="ml-auto h-3 w-3 shrink-0" aria-hidden="true" />}
        </label>)}
      </div>
    </fieldset>
    <div className="rounded-2xl border border-border-subtle bg-white overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b border-border-subtle">
        <div><h3 className="text-sm font-bold">Vista previa</h3><p className="text-[11px] text-text-secondary">Diseño ilustrativo · datos de ejemplo</p></div>
        <div className="flex rounded-xl bg-surface-subtle p-1" aria-label="Portal de la vista previa">
          {(['professional', 'patient'] as const).map(value => <button key={value} type="button" aria-pressed={portal === value} onClick={() => setPortal(value)} className={`min-h-11 px-3 rounded-lg text-xs ${portal === value ? 'bg-white shadow-sm font-semibold' : 'text-text-secondary'}`}>{value === 'professional' ? 'Profesional' : 'Paciente'}</button>)}
        </div>
      </div>
      <div style={organizationBrandingStyle(branding)} className="bg-surface-subtle text-text-primary p-3 sm:p-4" data-testid="branding-preview">
        <div className={`rounded-xl border border-border-subtle bg-white overflow-hidden ${professional ? '' : 'max-w-sm mx-auto'}`}>
          <div className="flex items-center gap-2 border-b border-border-subtle p-3">
            {branding.logoDataUrl ? <img src={branding.logoDataUrl} alt="Logo del consultorio" className="h-7 w-7 rounded-lg object-contain" /> : <span className="h-7 w-7 rounded-lg bg-brand-soft text-brand-strong grid place-items-center font-bold">N</span>}
            <span className="text-xs font-bold break-words min-w-0">{branding.displayName || 'Tu consultorio'}</span>
          </div>
          <div className="flex">
            {professional && <aside className="hidden sm:block w-28 shrink-0 border-r border-border-subtle p-2 space-y-2 text-[11px]">
              {[['Inicio', Home], ['Pacientes', Users], ['Agenda', CalendarDays]].map(([title, Icon], index) => { const ItemIcon = Icon as typeof Home; return <div key={String(title)} className={`flex items-center gap-1 rounded-lg p-2 ${index === 0 ? 'bg-brand-soft text-brand-strong font-semibold' : 'text-text-secondary'}`}><ItemIcon className="h-3 w-3" />{String(title)}</div>; })}
            </aside>}
            <div className="min-w-0 flex-1 p-3 space-y-3">
              {(header || !professional) && <div className="relative overflow-hidden rounded-xl bg-brand-soft p-4 min-h-24 flex flex-col justify-end">
                {header && <><img src={header} alt={professional ? 'Cabecera profesional' : 'Cabecera paciente'} className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/10" /></>}
                <p className={`relative text-sm font-bold break-words ${header ? 'text-white' : 'text-brand-strong'}`}>{branding.displayName || 'Tu consultorio'}</p>
                {branding.tagline && <p className={`relative text-[11px] break-words ${header ? 'text-white' : 'text-text-secondary'}`}>{branding.tagline}</p>}
              </div>}
              <h4 className="text-sm font-bold">{professional ? 'Tu consultorio, al día' : 'Hola, María'}</h4>
              <div className="grid grid-cols-2 gap-2">
                {(professional ? ['Pacientes activos', 'Citas de hoy'] : ['Plan alimentario', 'Próxima cita']).map((text, index) => <div key={text} className="rounded-xl border border-border-subtle p-3"><span className="text-brand-strong">{index ? <CalendarDays className="w-4 h-4" /> : <Utensils className="w-4 h-4" />}</span><p className="text-[11px] mt-2">{text}</p><p className="text-sm font-semibold mt-1">{professional ? (index ? '3' : '24') : (index ? 'Mañana · 10:00' : 'Ver mi plan')}</p></div>)}
              </div>
              <div className="rounded-xl bg-brand-soft p-3 text-xs"><p className="font-semibold text-brand-strong">{professional ? 'Agenda de hoy' : 'Tu próximo paso'}</p><p className="mt-1">{professional ? '10:00 · Consulta virtual' : 'Completá tu check-in'}</p></div>
              <div className="rounded-xl p-3 text-center text-xs font-semibold" style={{ background: 'var(--grad-primary-button)' }}>{professional ? '+ Nueva cita' : 'Abrir check-in'}</div>
            </div>
          </div>
        </div>
      </div>
      <p className="px-4 pb-3 pt-2 text-xs text-text-secondary">La selección sólo modifica esta vista previa hasta que pulses <b>Guardar marca</b>.</p>
    </div>
  </section>;
}
