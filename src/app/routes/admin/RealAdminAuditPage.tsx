import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import type { AdminAuditEventType, RealAdminAuditEvent, RealAdminAuditPage } from '../../../data/admin-audit.types';
import { loadRealAdminAuditEvents } from '../../../data/supabase/admin-audit.repository';

const PAGE_SIZE = 25;
type ViewState = { status: 'loading' } | { status: 'error' } | { status: 'success'; page: RealAdminAuditPage };

export function RealAdminAuditPage({ loadEvents = loadRealAdminAuditEvents }: {
  loadEvents?: (params: { from: string; to: string; eventType: AdminAuditEventType | null; query: string; limit?: number; offset?: number }) => Promise<RealAdminAuditPage>;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const today = localDate(new Date());
  const [from, setFrom] = useState(() => localDate(addDays(new Date(), -29)));
  const [to, setTo] = useState(today);
  const [eventType, setEventType] = useState<AdminAuditEventType | 'all'>('all');
  const [query, setQuery] = useState(() => searchParams.get('query') ?? '');
  const [pageNumber, setPageNumber] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ViewState>({ status: 'loading' });
  const validRange = Boolean(from && to && from <= to);

  useEffect(() => {
    let active = true;
    if (!validRange) { setState({ status: 'success', page: { rows: [], totalCount: 0 } }); return () => { active = false; }; }
    setState({ status: 'loading' });
    void loadEvents({
      from: toIsoStart(from),
      to: toIsoStart(localDate(addDays(parseLocalDate(to), 1))),
      eventType: eventType === 'all' ? null : eventType,
      query,
      limit: PAGE_SIZE,
      offset: pageNumber * PAGE_SIZE,
    }).then(page => active && setState({ status: 'success', page })).catch(() => active && setState({ status: 'error' }));
    return () => { active = false; };
  }, [attempt, eventType, from, loadEvents, pageNumber, query, to, validRange]);

  const changeFrom = (value: string) => { setFrom(value); setPageNumber(0); };
  const changeTo = (value: string) => { setTo(value); setPageNumber(0); };
  const changeType = (value: AdminAuditEventType | 'all') => { setEventType(value); setPageNumber(0); };
  const changeQuery = (value: string) => { setQuery(value); setPageNumber(0); const next = new URLSearchParams(searchParams); if (value.trim()) next.set('query', value); else next.delete('query'); setSearchParams(next, { replace: true }); };
  const page = state.status === 'success' ? state.page : null;
  const firstNumber = page && page.totalCount ? pageNumber * PAGE_SIZE + 1 : 0;
  const lastNumber = page ? Math.min(pageNumber * PAGE_SIZE + page.rows.length, page.totalCount) : 0;

  return <div className="mx-auto max-w-[1440px] space-y-6 p-4 sm:p-6 lg:p-8">
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-strong">Platform Admin · Trazabilidad</p>
      <h2 className="mt-2 flex items-center gap-2 text-3xl font-bold text-text-primary"><ClipboardList className="h-7 w-7 text-brand-strong" aria-hidden="true" /> Auditoría administrativa</h2>
      <p className="mt-2 max-w-3xl text-sm text-text-secondary">Historial inmutable de acciones de plataforma sobre consultorios, planes y accesos profesionales. La consulta es de sólo lectura.</p>
    </div>

    <section aria-label="Límites de privacidad de la auditoría" className="rounded-2xl border border-[#C6D4F8] bg-[#EAEFFC] p-4">
      <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#2D3F99]" aria-hidden="true" /><div><h3 className="text-sm font-semibold text-[#2D3F99]">Sólo actividad administrativa de la plataforma</h3><p className="mt-1 text-xs leading-5 text-text-secondary">Muestra altas y cambios de estado de consultorios, cambios de plan y cambios de acceso profesional. No incluye actividad clínica, pacientes, notas, motivos libres ni identidades individuales; el actor figura como Platform Admin.</p></div></div>
    </section>

    <section aria-label="Filtros de auditoría" className="grid grid-cols-1 gap-3 rounded-2xl border border-border-subtle bg-surface p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-4">
      <label className="text-xs font-semibold text-text-secondary">Desde<input aria-label="Desde" type="date" value={from} max={to} onChange={event => changeFrom(event.target.value)} className="mt-1 min-h-10 w-full rounded-xl border border-border-subtle bg-surface px-3 text-sm font-normal text-text-primary" /></label>
      <label className="text-xs font-semibold text-text-secondary">Hasta<input aria-label="Hasta" type="date" value={to} min={from} max={today} onChange={event => changeTo(event.target.value)} className="mt-1 min-h-10 w-full rounded-xl border border-border-subtle bg-surface px-3 text-sm font-normal text-text-primary" /></label>
      <label className="text-xs font-semibold text-text-secondary">Tipo de acción<select aria-label="Tipo de acción" value={eventType} onChange={event => changeType(event.target.value as AdminAuditEventType | 'all')} className="mt-1 min-h-10 w-full rounded-xl border border-border-subtle bg-surface px-3 text-sm font-normal text-text-primary"><option value="all">Todas las acciones</option><option value="organization_created">Alta de consultorio</option><option value="organization_status_changed">Cambio de estado de consultorio</option><option value="subscription_changed">Cambio de plan</option><option value="professional_membership_changed">Acceso en consultorio</option><option value="professional_account_suspension_changed">Bloqueo global de cuenta</option><option value="professional_invitation_changed">Invitación profesional</option></select></label>
      <label className="relative text-xs font-semibold text-text-secondary">Buscar consultorio<Search className="pointer-events-none absolute left-3 top-[2.45rem] h-4 w-4 -translate-y-1/2 text-text-tertiary" aria-hidden="true" /><input aria-label="Buscar consultorio" value={query} maxLength={100} onChange={event => changeQuery(event.target.value)} placeholder="Nombre o identificador" className="mt-1 min-h-10 w-full rounded-xl border border-border-subtle bg-surface pl-9 pr-3 text-sm font-normal text-text-primary" /></label>
    </section>

    {!validRange && <p role="alert" className="rounded-xl border border-[#F4E3B4] bg-[#FDF6E2] p-4 text-sm text-[#70470C]">El período seleccionado no es válido.</p>}
    {state.status === 'loading' && <div role="status" className="rounded-2xl border border-border-subtle bg-surface p-8 text-sm text-text-secondary">Cargando auditoría…</div>}
    {state.status === 'error' && <section role="alert" className="rounded-2xl border border-[#F8C4C1] bg-[#FCEBEA] p-5"><h3 className="font-semibold text-[#902A24]">No pudimos cargar la auditoría</h3><p className="mt-1 text-sm text-text-secondary">No se modificó ningún dato. Revisá tu conexión e intentá nuevamente.</p><Button type="button" variant="secondary" className="mt-4 gap-2" onClick={() => setAttempt(value => value + 1)}><RefreshCw className="h-4 w-4" aria-hidden="true" /> Reintentar</Button></section>}
    {state.status === 'success' && <section className="overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm">
      <div className="flex flex-col gap-2 border-b border-border-subtle p-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-semibold text-text-primary">Actividad de plataforma</h3><p className="mt-1 text-xs text-text-secondary">{page?.totalCount ?? 0} eventos en el período · actor: Platform Admin</p></div><p className="text-xs text-text-tertiary">Más recientes primero</p></div>
      {!page?.rows.length ? <div className="p-10 text-center"><ClipboardList className="mx-auto h-8 w-8 text-text-tertiary" aria-hidden="true" /><p className="mt-3 text-sm font-semibold text-text-primary">No hay acciones para estos filtros</p><p className="mt-1 text-xs text-text-secondary">Probá con otro período, consultorio o tipo de acción.</p></div> : <>
        <div className="space-y-3 p-3 xl:hidden">{page.rows.map(event => <AuditCard key={event.eventId} event={event} />)}</div>
        <div className="hidden overflow-x-auto xl:block"><table className="w-full min-w-[900px] border-collapse text-left"><thead className="bg-surface-subtle"><tr className="text-[11px] uppercase tracking-wide text-text-secondary"><th scope="col" className="table-cell-admin">Fecha y hora</th><th scope="col" className="table-cell-admin">Consultorio</th><th scope="col" className="table-cell-admin">Acción</th><th scope="col" className="table-cell-admin">Actor</th><th scope="col" className="table-cell-admin">Antes</th><th scope="col" className="table-cell-admin">Después</th></tr></thead><tbody className="divide-y divide-border-subtle text-xs">{page.rows.map(event => <AuditRow key={event.eventId} event={event} />)}</tbody></table></div>
        <div className="flex flex-col gap-3 border-t border-border-subtle p-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-text-secondary">Mostrando {firstNumber}–{lastNumber} de {page.totalCount}</p><div className="flex gap-2"><Button type="button" variant="secondary" disabled={pageNumber === 0} onClick={() => setPageNumber(value => Math.max(0, value - 1))}>Anterior</Button><Button type="button" variant="secondary" disabled={lastNumber >= page.totalCount} onClick={() => setPageNumber(value => value + 1)}>Siguiente</Button></div></div>
      </>}
    </section>}
  </div>;
}

function AuditRow({ event }: { event: RealAdminAuditEvent }) {
  return <tr className="align-top"><td className="table-cell-admin whitespace-nowrap">{formatDateTime(event.occurredAt)}</td><td className="table-cell-admin"><p className="font-semibold text-text-primary">{event.organizationName}</p>{event.organizationSlug && <p className="mt-1 text-[11px] text-text-tertiary">{event.organizationSlug}</p>}</td><td className="table-cell-admin"><Badge variant={event.eventType === 'organization_status_changed' ? 'medium' : 'info'}>{eventLabel(event.eventType)}</Badge></td><td className="table-cell-admin">Platform Admin</td><td className="table-cell-admin">{displayValue(event.previousValue)}</td><td className="table-cell-admin">{displayValue(event.newValue)}{event.eventType === 'subscription_changed' && <p className="mt-1 text-[11px] text-text-tertiary">{event.extraProfessionals ?? 0} profesionales adicionales</p>}</td></tr>;
}

function AuditCard({ event }: { event: RealAdminAuditEvent }) {
  return <article className="rounded-2xl border border-border-subtle bg-surface p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h4 className="truncate font-semibold text-text-primary">{event.organizationName}</h4>{event.organizationSlug && <p className="mt-0.5 truncate text-[11px] text-text-tertiary">{event.organizationSlug}</p>}</div><Badge variant={event.eventType === 'organization_status_changed' ? 'medium' : 'info'}>{eventLabel(event.eventType)}</Badge></div><p className="mt-3 text-xs text-text-secondary">{formatDateTime(event.occurredAt)} · Platform Admin</p><dl className="mt-3 grid grid-cols-2 gap-3"><div className="rounded-xl bg-surface-subtle p-3"><dt className="text-[11px] text-text-secondary">Antes</dt><dd className="mt-1 text-sm font-semibold text-text-primary">{displayValue(event.previousValue)}</dd></div><div className="rounded-xl bg-surface-subtle p-3"><dt className="text-[11px] text-text-secondary">Después</dt><dd className="mt-1 text-sm font-semibold text-text-primary">{displayValue(event.newValue)}</dd></div></dl>{event.eventType === 'subscription_changed' && <p className="mt-3 text-xs text-text-secondary">{event.extraProfessionals ?? 0} profesionales adicionales</p>}</article>;
}

function eventLabel(type: AdminAuditEventType) { return ({ organization_created: 'Alta de consultorio', organization_status_changed: 'Cambio de estado', subscription_changed: 'Cambio de plan', professional_membership_changed: 'Acceso en consultorio', professional_account_suspension_changed: 'Bloqueo global de cuenta', professional_invitation_changed: 'Invitación profesional' })[type]; }
function displayValue(value: string | null) {
  if (!value) return '—';
  if (value === 'created') return 'Creado';
  const [first, second] = value.split(' · ');
  if (!second) return first ? (({ active: 'Activo', suspended: 'Suspendido', pending: 'Pendiente', accepted: 'Aceptada', revoked: 'Cancelada' } as Record<string, string>)[first] ?? first) : '—';
  const statusLabels: Record<string, string> = { active: 'Activa', trialing: 'En prueba', grace: 'En gracia', suspended: 'Suspendida', cancelled: 'Cancelada' };
  return `${first?.toUpperCase()} · ${statusLabels[second] ?? second}`;
}
function formatDateTime(value: string) { return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
function localDate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function parseLocalDate(value: string) { const [year = 1970, month = 1, day = 1] = value.split('-').map(Number); return new Date(year, month - 1, day); }
function addDays(date: Date, days: number) { const result = new Date(date); result.setDate(result.getDate() + days); return result; }
function toIsoStart(value: string) { return parseLocalDate(value).toISOString(); }
