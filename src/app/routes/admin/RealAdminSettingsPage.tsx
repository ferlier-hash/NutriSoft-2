import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Save, Settings2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import type { AdminPlanConfiguration } from '../../../data/commercial-plan.types';
import { loadAdminPlanConfiguration, saveAdminAddonConfiguration, saveAdminPlanConfiguration } from '../../../data/supabase/commercial-plan.repository';

const MB = 1024 * 1024;

export function RealAdminSettingsPage() {
  const [config, setConfig] = useState<AdminPlanConfiguration | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [storageMb, setStorageMb] = useState(250);

  const reload = useCallback(async () => {
    setError('');
    try {
      const loaded = await loadAdminPlanConfiguration();
      setConfig(loaded);
      const space = loaded.addons.find(addon => addon.code === 'extra_pdf_space');
      if (space?.unitBytes) setStorageMb(Math.round(space.unitBytes / MB));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos cargar la configuración.'); }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const updatePlan = (slug: string, update: Partial<AdminPlanConfiguration['plans'][number]>) => {
    setConfig(current => current ? { ...current, plans: current.plans.map(plan => plan.slug === slug ? { ...plan, ...update } : plan) } : current);
  };

  const savePlan = async (plan: AdminPlanConfiguration['plans'][number]) => {
    setBusy(true); setError(''); setNotice('');
    try { await saveAdminPlanConfiguration(plan); setNotice(`${plan.displayName}: guardada una nueva versión. Las suscripciones actuales no cambian.`); await reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos guardar el plan.'); }
    finally { setBusy(false); }
  };

  const saveAddons = async () => {
    if (!config || !Number.isInteger(storageMb) || storageMb < 1 || storageMb > 10240) { setError('La unidad adicional debe ser de 1 a 10.240 MB.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      await saveAdminAddonConfiguration(storageMb * MB, Boolean(config.addons.find(addon => addon.code === 'extra_pdf_space')?.active), Boolean(config.addons.find(addon => addon.code === 'extra_professional')?.active));
      setNotice('Adicionales guardados. El cambio aplica a nuevas configuraciones de suscripción.'); await reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos guardar los adicionales.'); }
    finally { setBusy(false); }
  };

  return <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
    <header className="rounded-3xl border border-border-subtle bg-[linear-gradient(135deg,#E9F8F7_0%,#EEF7FB_58%,#FCF9E8_100%)] p-5 sm:p-7">
      <div className="flex items-start gap-3"><div className="rounded-xl bg-white/80 p-2 text-brand-strong"><Settings2 className="h-5 w-5" aria-hidden="true" /></div><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-strong">Administrador REAL</p><h2 className="mt-1 text-2xl font-bold text-text-primary">Configuración comercial</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">Definí los límites técnicos de los planes y adicionales. Los cambios crean versiones nuevas y no modifican automáticamente consultorios existentes.</p></div></div>
    </header>
    {error && <p role="alert" className="rounded-xl border border-[#F8C4C1] bg-[#FCEBEA] p-3 text-sm text-[#902A24]">{error}</p>}
    {notice && <p role="status" className="rounded-xl border border-[#BDE3CC] bg-[#E8F5EE] p-3 text-sm text-[#1E5235]">{notice}</p>}
    {!config && !error && <p role="status" className="rounded-2xl border border-border-subtle bg-surface p-6 text-sm text-text-secondary">Cargando configuración…</p>}
    {config && <>
      <section className="space-y-4" aria-labelledby="plans-heading"><div><h3 id="plans-heading" className="text-lg font-bold text-text-primary">Planes</h3><p className="text-sm text-text-secondary">El límite 0 en pacientes o almacenamiento significa sin límite técnico configurado.</p></div>
        {config.plans.map(plan => <article key={plan.slug} className="space-y-4 rounded-2xl border border-border-subtle bg-surface p-4 shadow-sm sm:p-5"><header className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="font-bold text-text-primary">{plan.displayName} <span className="text-xs font-medium text-text-tertiary">· versión {plan.version}</span></h4><p className="text-xs text-text-secondary">Las nuevas suscripciones y cambios explícitos usarán la última versión.</p></div><Button type="button" disabled={busy} onClick={() => void savePlan(plan)}><Save className="mr-2 h-4 w-4" aria-hidden="true" />Guardar nueva versión</Button></header>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <NumberField label="Pacientes activos incluidos (0 = sin límite)" value={plan.maxActivePatients ?? 0} min={0} onChange={value => updatePlan(plan.slug, { maxActivePatients: value || null })} />
            <NumberField label="Profesionales incluidos" value={plan.includedProfessionals} min={1} onChange={value => updatePlan(plan.slug, { includedProfessionals: value })} />
            <NumberField label="Almacenamiento comercial (MB, 0 = sin límite)" value={plan.storageLimitBytes ? Math.round(plan.storageLimitBytes / MB) : 0} min={0} onChange={value => updatePlan(plan.slug, { storageLimitBytes: value ? value * MB : null })} />
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
            <label className="inline-flex min-h-11 items-center gap-2 text-text-primary"><input type="checkbox" checked={plan.extraProfessionalEnabled} onChange={event => updatePlan(plan.slug, { extraProfessionalEnabled: event.target.checked })} />Permitir profesional adicional</label>
            <label className="inline-flex min-h-11 items-center gap-2 text-text-primary"><input type="checkbox" checked={plan.customBrandingEnabled} onChange={event => updatePlan(plan.slug, { customBrandingEnabled: event.target.checked })} />Personalización CUSTOM</label>
            <label className="inline-flex min-h-11 items-center gap-2 text-text-primary"><input type="checkbox" checked={plan.active} onChange={event => updatePlan(plan.slug, { active: event.target.checked })} />Disponible para nuevas suscripciones</label>
          </div>
        </article>)}
      </section>
      <section className="space-y-4 rounded-2xl border border-border-subtle bg-surface p-4 shadow-sm sm:p-5"><div><h3 className="font-bold text-text-primary">Adicionales técnicos</h3><p className="mt-1 text-sm text-text-secondary">El espacio PDF se suma individualmente a cada profesional y tiene un tope técnico de 10 GB por persona. No cambia tarifas ni registra pagos.</p></div>
        <div className="grid gap-3 sm:grid-cols-2"><NumberField label="Unidad de espacio PDF adicional (MB)" value={storageMb} min={1} max={10240} onChange={setStorageMb} />
          <div className="flex flex-col gap-2"><Toggle label="Adicional de espacio PDF habilitado" checked={Boolean(config.addons.find(addon => addon.code === 'extra_pdf_space')?.active)} onChange={checked => setConfig(current => current ? { ...current, addons: current.addons.map(addon => addon.code === 'extra_pdf_space' ? { ...addon, active: checked } : addon) } : current)} /><Toggle label="Profesionales adicionales habilitados" checked={Boolean(config.addons.find(addon => addon.code === 'extra_professional')?.active)} onChange={checked => setConfig(current => current ? { ...current, addons: current.addons.map(addon => addon.code === 'extra_professional' ? { ...addon, active: checked } : addon) } : current)} /></div>
        </div><Button type="button" disabled={busy} onClick={() => void saveAddons()}><Save className="mr-2 h-4 w-4" aria-hidden="true" />Guardar adicionales</Button>
      </section>
      <Button type="button" variant="secondary" disabled={busy} onClick={() => void reload()}><RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />Actualizar</Button>
    </>}
  </div>;
}

function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max?: number; onChange: (value: number) => void }) {
  return <label className="flex flex-col gap-1.5 text-xs font-semibold text-text-secondary">{label}<input type="number" min={min} max={max} value={value} onChange={event => onChange(event.target.value === '' ? 0 : Number(event.target.value))} className="min-h-11 rounded-xl border border-border-subtle bg-white px-3 text-sm font-normal text-text-primary" /></label>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex min-h-11 items-center gap-2 text-sm text-text-primary"><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} />{label}</label>;
}
