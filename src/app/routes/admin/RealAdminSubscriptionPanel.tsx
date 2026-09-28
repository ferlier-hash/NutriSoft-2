import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, History, Save, XCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import type { AdminPlanConfiguration, RealOrganizationSubscription } from '../../../data/commercial-plan.types';
import { cancelRealSubscriptionSchedule, configureRealOrganizationSubscription, loadAdminPlanConfiguration, loadRealSubscriptionHistory, type SubscriptionHistoryEntry } from '../../../data/supabase/commercial-plan.repository';

const MB = 1024 * 1024;
type FormState = { plan: RealOrganizationSubscription['plan']; status: RealOrganizationSubscription['status']; extraProfessionals: number; extraPdfMb: number; effectiveOn: string };

export function RealAdminSubscriptionPanel({ organizationId, subscription, onChanged }: { organizationId: string; subscription?: RealOrganizationSubscription; onChanged: () => void }) {
  const [configuration, setConfiguration] = useState<AdminPlanConfiguration | null>(null);
  const [history, setHistory] = useState<SubscriptionHistoryEntry[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const reload = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [config, entries] = await Promise.all([loadAdminPlanConfiguration(), loadRealSubscriptionHistory(organizationId)]);
      setConfiguration(config); setHistory(entries);
      setForm({ plan: subscription?.plan ?? 'pro', status: subscription?.status ?? 'active', extraProfessionals: subscription?.extraProfessionals ?? 0, extraPdfMb: Math.round((subscription?.libraryExtraBytesPerProfessional ?? 0) / MB), effectiveOn: localToday() });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos cargar la suscripción.'); }
    finally { setLoading(false); }
  }, [organizationId, subscription?.extraProfessionals, subscription?.libraryExtraBytesPerProfessional, subscription?.plan, subscription?.status]);
  useEffect(() => { void reload(); }, [reload, subscription?.planVersion]);

  const submit = async () => {
    if (!form) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await configureRealOrganizationSubscription({ organizationId, plan: form.plan, status: form.status, extraProfessionals: form.extraProfessionals, extraPdfBytes: form.extraPdfMb * MB, effectiveOn: form.effectiveOn });
      setNotice(form.effectiveOn > localToday() ? 'Cambio programado y registrado en el historial.' : 'Suscripción actualizada y registrada en el historial.');
      onChanged(); await reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos guardar el cambio.'); }
    finally { setBusy(false); }
  };
  const cancelSchedule = async () => {
    const scheduled = subscription?.scheduledChange;
    if (!scheduled || !window.confirm('¿Cancelar el cambio programado? La suscripción vigente no cambiará y el intento quedará en el historial.')) return;
    setBusy(true); setError('');
    try { await cancelRealSubscriptionSchedule(scheduled.id); setNotice('Cambio programado cancelado.'); onChanged(); await reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos cancelar el cambio.'); }
    finally { setBusy(false); }
  };

  if (loading || !form || !configuration) return <section className="rounded-2xl border border-border-subtle bg-surface p-5"><p role="status" className="text-sm text-text-secondary">Cargando configuración e historial comercial…</p></section>;
  const addOn = configuration.addons.find(item => item.code === 'extra_pdf_space');
  const proAddon = configuration.addons.find(item => item.code === 'extra_professional');
  return <section className="space-y-4 rounded-2xl border border-border-subtle bg-surface p-5 shadow-sm">
    <header className="flex items-start gap-3"><div className="rounded-xl bg-brand-soft p-2 text-brand-strong"><CalendarClock className="h-5 w-5" aria-hidden="true" /></div><div><h3 className="font-bold text-text-primary">Plan, adicionales y vigencia</h3><p className="mt-1 text-xs leading-5 text-text-secondary">Cambios manuales, sin cobro automático ni prorrateo. Una fecha pasada se registra como vigencia declarada y el cambio se aplica ahora; no reescribe snapshots ni cobros previos. Las reducciones no borran archivos ni profesionales; el exceso de uso puede impedir nuevas cargas o altas.</p></div></header>
    {error && <p role="alert" className="rounded-xl border border-[#F8C4C1] bg-[#FCEBEA] p-3 text-sm text-[#902A24]">{error}</p>}{notice && <p role="status" className="rounded-xl border border-[#BDE3CC] bg-[#E8F5EE] p-3 text-sm text-[#1E5235]">{notice}</p>}
    {subscription?.scheduledChange && <div className="flex flex-col gap-3 rounded-xl border border-[#F4E3B4] bg-[#FDF6E2] p-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-[#70470C]">Cambio futuro: {subscription.scheduledChange.plan.toUpperCase()} desde {subscription.scheduledChange.effectiveOn}.</p><Button type="button" variant="secondary" disabled={busy} onClick={() => void cancelSchedule()}><XCircle className="mr-2 h-4 w-4" aria-hidden="true" />Cancelar cambio</Button></div>}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <label className="field-label">Plan<select className="form-control mt-1" value={form.plan} onChange={event => { const plan = event.target.value as FormState['plan']; setForm({ ...form, plan, extraProfessionals: plan === 'pro' ? form.extraProfessionals : 0 }); }}>{configuration.plans.map(plan => <option key={plan.slug} value={plan.slug} disabled={!plan.active}>{plan.displayName}{plan.active ? '' : ' (no disponible)'}</option>)}</select></label>
      <label className="field-label">Estado<select className="form-control mt-1" value={form.status} onChange={event => setForm({ ...form, status: event.target.value as FormState['status'] })}>{[['trialing','En prueba'],['active','Activa'],['grace','En gracia'],['suspended','Suspendida'],['cancelled','Cancelada']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="field-label">Fecha de inicio de vigencia<input type="date" className="form-control mt-1" value={form.effectiveOn} onChange={event => setForm({ ...form, effectiveOn: event.target.value })} /></label>
      <label className="field-label">Profesionales adicionales<input type="number" min={0} max={proAddon?.active ? 100 : subscription?.extraProfessionals ?? 0} className="form-control mt-1" value={form.extraProfessionals} onChange={event => setForm({ ...form, extraProfessionals: Math.max(0, Number(event.target.value) || 0) })} disabled={form.plan !== 'pro' || (!proAddon?.active && form.extraProfessionals===0)} /></label>
      <label className="field-label">Espacio PDF adicional por profesional (MB)<input type="number" min={0} max={addOn?.active ? 10240 : subscription?.libraryExtraBytesPerProfessional ? Math.round(subscription.libraryExtraBytesPerProfessional / MB) : 0} className="form-control mt-1" value={form.extraPdfMb} onChange={event => setForm({ ...form, extraPdfMb: Math.max(0, Number(event.target.value) || 0) })} disabled={!addOn?.active && form.extraPdfMb===0} /><span className="mt-1 block text-[11px] font-normal">Unidad actual: {Math.round((addOn?.unitBytes ?? 0) / MB)} MB. Si cambiás el extra, usá un múltiplo de esa unidad. El valor actual se conserva aunque la unidad cambie.</span></label>
    </div>
    <Button type="button" disabled={busy || !form.effectiveOn} onClick={() => void submit()}><Save className="mr-2 h-4 w-4" aria-hidden="true" />{form.effectiveOn > localToday() ? 'Programar cambio' : 'Guardar desde esta fecha'}</Button>
    <div className="border-t border-border-subtle pt-4"><h4 className="flex items-center gap-2 text-sm font-bold text-text-primary"><History className="h-4 w-4" aria-hidden="true" />Historial de suscripción</h4>{history.length ? <ol className="mt-3 space-y-2">{history.map(entry => <li key={entry.eventId} className="rounded-xl bg-surface-subtle p-3 text-xs text-text-secondary"><span className="font-semibold text-text-primary">{historyLabel(entry.eventKind)}</span> · {entry.previousPlanSlug?.toUpperCase() ?? 'Sin plan'} ({statusLabel(entry.previousStatus)}) → {entry.nextPlanSlug.toUpperCase()} ({statusLabel(entry.nextStatus)}) · {entry.extraProfessionals} profes. extra · {formatBytes(entry.libraryExtraBytesPerProfessional)} extra PDF/profesional · vigencia {entry.effectiveOn} · {entry.entryState}<span className="block mt-1 text-text-tertiary">Registrado {new Date(entry.occurredAt).toLocaleString('es-AR')}</span></li>)}</ol> : <p className="mt-2 text-xs text-text-secondary">Todavía no hay movimientos de suscripción.</p>}</div>
  </section>;
}

function historyLabel(kind: string) { return ({ changed: 'Cambio aplicado', scheduled: 'Cambio programado', schedule_cancelled: 'Cambio cancelado', schedule_applied: 'Cambio programado aplicado' } as Record<string,string>)[kind] ?? kind; }
function localToday() { const today = new Date(); return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`; }
function statusLabel(status: string | null) { return ({ trialing: 'en prueba', active: 'activo', grace: 'en gracia', suspended: 'suspendido', cancelled: 'cancelado' } as Record<string,string>)[status ?? ''] ?? '—'; }
function formatBytes(bytes: number) { if (bytes === 0) return '0 B'; const units = ['B','KB','MB','GB']; const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)),units.length - 1); return `${(bytes / 1024 ** index).toLocaleString('es-AR',{maximumFractionDigits:1})} ${units[index]}`; }
