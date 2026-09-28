import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, ShieldAlert, Stethoscope, Users } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import type { RealAdminProfessionalsPage } from '../../../data/admin-professionals.types';
import { loadRealAdminProfessionals, setRealAdminProfessionalAccountSuspension, setRealAdminProfessionalMembership } from '../../../data/supabase/admin-professionals.repository';

export function RealAdminProfessionalsPage() {
  const [searchParams] = useSearchParams();
  const organizationId = searchParams.get('organizationId') ?? '';
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [data, setData] = useState<RealAdminProfessionalsPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const refresh = useCallback(() => { setReload(value => value + 1); }, []);
  useEffect(() => {
    let live = true; setError(null); setData(null);
    void loadRealAdminProfessionals(query, status).then(value => live && setData(value)).catch(value => live && setError(value instanceof Error ? value.message : 'Error de carga.'));
    return () => { live = false; };
  }, [query, reload, status]);

  const visibleRows = useMemo(() => data?.rows.filter(row => !organizationId || row.organizationId === organizationId) ?? [], [data, organizationId]);

  const perform = async (key: string, operation: () => Promise<void>) => {
    setBusy(key); setError(null);
    try { await operation(); refresh(); }
    catch (value) { setError(value instanceof Error ? value.message : 'No se pudo completar la acción.'); }
    finally { setBusy(null); }
  };

  return <div className="mx-auto max-w-[1440px] space-y-6 p-4 sm:p-6 lg:p-8">
    <header><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-strong">Platform Admin · Gestión de cuentas</p><h2 className="mt-2 flex items-center gap-2 text-3xl font-bold text-text-primary"><Stethoscope className="h-7 w-7 text-brand-strong" aria-hidden="true" />Profesionales</h2><p className="mt-2 max-w-3xl text-sm text-text-secondary">Directorio de nutricionistas por consultorio, estados de membresía y controles de acceso reversibles.</p></header>
    <section className="rounded-2xl border border-[#C6D4F8] bg-[#EAEFFC] p-4"><div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#2D3F99]" aria-hidden="true" /><div><h3 className="text-sm font-semibold text-[#2D3F99]">Alcance y privacidad</h3><p className="mt-1 text-xs leading-5 text-text-secondary">Se muestran sólo datos de cuenta, consultorio y cantidades agregadas de asignaciones. El Admin no puede abrir pacientes ni consultar información clínica. Para suspender una membresía, primero transferí formalmente los pacientes activos; se conserva el acceso de sólo lectura acordado por 14 días. El bloqueo global es una excepción inmediata.</p></div></div></section>
    <section aria-label="Filtros de profesionales" className="grid grid-cols-1 gap-3 rounded-2xl border border-border-subtle bg-surface p-4 shadow-sm sm:grid-cols-2">
      <label className="relative text-xs font-semibold text-text-secondary">Buscar profesional o consultorio<Search className="pointer-events-none absolute left-3 top-[2.45rem] h-4 w-4 -translate-y-1/2 text-text-tertiary" aria-hidden="true" /><input aria-label="Buscar profesional o consultorio" value={query} maxLength={100} onChange={event => setQuery(event.target.value)} placeholder="Nombre, email o consultorio" className="mt-1 min-h-10 w-full rounded-xl border border-border-subtle bg-surface pl-9 pr-3 text-sm font-normal text-text-primary" /></label>
      <label className="text-xs font-semibold text-text-secondary">Estado<select aria-label="Estado" value={status} onChange={event => setStatus(event.target.value)} className="mt-1 min-h-10 w-full rounded-xl border border-border-subtle bg-surface px-3 text-sm font-normal text-text-primary"><option value="all">Todos</option><option value="active">Membresías activas</option><option value="inactive">Membresías suspendidas</option><option value="suspended">Cuentas bloqueadas globalmente</option></select></label>
    </section>
    {error && <p role="alert" className="rounded-xl border border-[#F8C4C1] bg-[#FCEBEA] p-4 text-sm text-[#902A24]">{error}</p>}
    {!data && !error && <div role="status" className="rounded-2xl border border-border-subtle bg-surface p-8 text-sm text-text-secondary">Cargando profesionales…</div>}
    {data && <section className="overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm"><div className="flex items-center justify-between gap-2 border-b border-border-subtle p-4"><div><h3 className="font-semibold text-text-primary">Membresías profesionales</h3><p className="mt-1 text-xs text-text-secondary">{organizationId ? `${visibleRows.length.toLocaleString('es-AR')} en este consultorio` : `${data.totalCount.toLocaleString('es-AR')} resultados · los profesionales de varios consultorios aparecen en cada membresía`}</p></div><Users className="h-5 w-5 text-brand-strong" aria-hidden="true" /></div>
      {!visibleRows.length ? <p className="p-8 text-center text-sm text-text-secondary">No hay profesionales para estos filtros.</p> : <div className="divide-y divide-border-subtle">{visibleRows.map(row => {
        const key = `${row.organizationId}:${row.userId}`;
        return <article key={key} className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_auto] lg:items-center">
          <div className="min-w-0"><h4 className="truncate font-semibold text-text-primary">{row.fullName}</h4><p className="truncate text-xs text-text-secondary">{row.email}</p><p className="mt-1 text-[11px] text-text-tertiary">Alta {new Intl.DateTimeFormat('es-AR',{dateStyle:'medium'}).format(new Date(row.createdAt))}</p></div>
          <div><p className="font-medium text-text-primary">{row.organizationName}</p><div className="mt-1 flex flex-wrap gap-2"><Badge variant={row.membershipStatus === 'active' ? 'active' : 'suspended'}>{row.membershipStatus === 'active' ? 'Membresía activa' : 'Membresía suspendida'}</Badge><Badge variant="neutral">{row.assignedPatientCount} asignaciones activas</Badge>{row.accountSuspended && <Badge variant="high">Cuenta bloqueada</Badge>}</div></div>
          <div className="flex flex-wrap gap-2 lg:justify-end"><Button type="button" variant="secondary" size="sm" disabled={busy === key || row.accountSuspended} onClick={() => {
            const next = row.membershipStatus === 'active' ? 'inactive' : 'active';
            if (next === 'inactive' && !window.confirm(`¿Suspender el acceso de ${row.fullName} a ${row.organizationName}? No se elimina información y se requiere transferir primero sus pacientes activos.`)) return;
            void perform(key, () => setRealAdminProfessionalMembership(row.organizationId,row.userId,next));
          }}>{row.membershipStatus === 'active' ? 'Suspender en este consultorio' : 'Reactivar membresía'}</Button>
          <Button type="button" variant={row.accountSuspended ? 'secondary' : 'destructive'} size="sm" disabled={busy === key} onClick={() => {
            const next = !row.accountSuspended;
            if (next && !window.confirm(`Bloquear la cuenta completa de ${row.fullName} en todos sus consultorios? La acción es reversible y no elimina información.`)) return;
            if (!next && !window.confirm(`¿Restablecer el acceso global de ${row.fullName}? Las membresías suspendidas por separado seguirán suspendidas.`)) return;
            void perform(key, () => setRealAdminProfessionalAccountSuspension(row.userId,next));
          }}>{row.accountSuspended ? 'Restablecer cuenta' : 'Bloquear cuenta global'}</Button></div>
        </article>;
      })}</div>}</section>}
  </div>;
}
