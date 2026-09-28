import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Building2, ChevronDown, ChevronUp, HardDrive, RefreshCw, Search, ShieldCheck, Stethoscope, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import type { RealAdminOrganizationUsage, RealAdminRetentionSnapshot } from '../../../data/admin-usage.types';
import { loadRealAdminOrganizationUsage } from '../../../data/supabase/admin-usage.repository';
import { loadRealAdminRetentionSnapshots } from '../../../data/supabase/admin-retention.repository';
import { RealAdminPlatformRevenue } from './RealAdminPlatformRevenue';

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'success'; rows: RealAdminOrganizationUsage[] };
type RetentionState = { status: 'loading' } | { status: 'error' } | { status: 'success'; rows: RealAdminRetentionSnapshot[] };
type LoadUsage = (from: string, to: string) => Promise<RealAdminOrganizationUsage[]>;

export function RealAdminUsagePage({ loadUsage = loadRealAdminOrganizationUsage }: { loadUsage?: LoadUsage }) {
  const today = localDateValue(new Date());
  const [attempt, setAttempt] = useState(0);
  const [fromDate, setFromDate] = useState(() => localDateValue(addDays(new Date(), -29)));
  const [toDate, setToDate] = useState(today);
  const [query, setQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('attention');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [retentionState, setRetentionState] = useState<RetentionState>({ status: 'loading' });

  const validDates = Boolean(fromDate && toDate && fromDate <= toDate);
  const period = useMemo(() => validDates ? ({ from: localDateStart(fromDate), to: localDateStart(localDateValue(addDays(parseLocalDate(toDate), 1))) }) : ({ from: '', to: '' }), [fromDate, toDate, validDates]);
  useEffect(() => {
    let current = true;
    if (!validDates) { setState({ status: 'success', rows: [] }); return () => { current = false; }; }
    setState({ status: 'loading' });
    void loadUsage(period.from, period.to).then(rows => current && setState({ status: 'success', rows })).catch(() => current && setState({ status: 'error' }));
    return () => { current = false; };
  }, [attempt, loadUsage, period.from, period.to, validDates]);

  useEffect(() => {
    let current = true;
    void loadRealAdminRetentionSnapshots().then(rows => current && setRetentionState({ status: 'success', rows }))
      .catch(() => current && setRetentionState({ status: 'error' }));
    return () => { current = false; };
  }, [attempt]);

  const filteredRows = useMemo(() => {
    if (state.status !== 'success') return [];
    const normalized = query.trim().toLocaleLowerCase('es-AR');
    return state.rows.filter(row => {
      const attention = hasAttention(row);
      return (planFilter === 'all' || row.plan === planFilter || (planFilter === 'unconfigured' && !row.plan))
        && (statusFilter === 'all' || (statusFilter === 'active' && row.organizationStatus === 'active') || (statusFilter === 'suspended' && row.organizationStatus === 'suspended') || (statusFilter === 'attention' && attention) || (statusFilter === 'unconfigured' && !row.plan))
        && (!normalized || `${row.organizationName} ${row.organizationSlug}`.toLocaleLowerCase('es-AR').includes(normalized));
    }).sort((a, b) => compareRows(a, b, sortBy));
  }, [planFilter, query, state, statusFilter, sortBy]);

  const totals = filteredRows.reduce((sum, row) => ({
    patients: sum.patients + row.activePatients,
    professionals: sum.professionals + row.activeProfessionals,
    pdfBytes: sum.pdfBytes + row.storedPdfBytes,
    appointments: sum.appointments + row.appointmentsInPeriod,
    completedAppointments: sum.completedAppointments + row.completedAppointmentsInPeriod,
    checkins: sum.checkins + row.checkinResponsesInPeriod,
    publications: sum.publications + row.publishedMealPlanVersionsInPeriod,
  }), { patients: 0, professionals: 0, pdfBytes: 0, appointments: 0, completedAppointments: 0, checkins: 0, publications: 0 });

  const incomeTotals = useMemo(() => aggregateIncome(filteredRows), [filteredRows]);
  const unconfiguredCount = state.status === 'success' ? state.rows.filter(row => !row.plan).length : 0;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-strong">Platform Admin · Datos numéricos agregados</p>
        <h2 className="mt-2 text-3xl font-bold text-text-primary">Reporte por consultorio</h2>
        <p className="mt-2 max-w-3xl text-sm text-text-secondary">Explorá consumo del plan y actividad operativa directamente en tablas. Los indicadores se agregan por consultorio y no contienen información clínica individual.</p>
      </div>

      <section aria-label="Retención y evolución mensual" className="overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm">
        <div className="border-b border-border-subtle p-4 sm:p-5"><h3 className="font-semibold text-text-primary">Retención y evolución mensual</h3><p className="mt-1 max-w-4xl text-xs leading-5 text-text-secondary">Un consultorio cuenta como cliente activo cuando su estado y su suscripción están vigentes (activa, en prueba o en gracia). La retención compara los clientes activos en dos cortes consecutivos. El primer intervalo puede ser menor a un mes; desde los cortes regulares se compara mes a mes. El seguimiento empieza ahora y no reconstruye meses anteriores.</p></div>
        {retentionState.status === 'loading' && <p role="status" className="p-5 text-sm text-text-secondary">Cargando serie mensual…</p>}
        {retentionState.status === 'error' && <p role="status" className="p-5 text-sm text-semantic-critical">La serie mensual aún no está disponible. Las métricas actuales y de actividad siguen funcionando.</p>}
        {retentionState.status === 'success' && retentionState.rows.length === 0 && <p className="p-5 text-sm text-text-secondary">Todavía no hay cortes guardados.</p>}
        {retentionState.status === 'success' && retentionState.rows.length > 0 && <div className="overflow-x-auto"><table className="w-full min-w-[1180px] border-collapse text-left text-xs"><thead className="bg-surface-subtle"><tr className="text-[10px] uppercase tracking-wide text-text-secondary"><th scope="col" className="table-cell-admin">Corte (UTC)</th><th scope="col" className="table-cell-admin">Clientes activos</th><th scope="col" className="table-cell-admin">Base anterior</th><th scope="col" className="table-cell-admin">Retenidos</th><th scope="col" className="table-cell-admin">Bajas</th><th scope="col" className="table-cell-admin">Retención</th><th scope="col" className="table-cell-admin">Pacientes</th><th scope="col" className="table-cell-admin">Profesionales</th><th scope="col" className="table-cell-admin">PDF almacenados</th><th scope="col" className="table-cell-admin">Citas / completadas</th><th scope="col" className="table-cell-admin">Check-ins</th><th scope="col" className="table-cell-admin">Planes publicados</th></tr></thead><tbody className="divide-y divide-border-subtle">{retentionState.rows.map(row => <tr key={row.snapshotMonth}><th scope="row" className="table-cell-admin whitespace-nowrap font-semibold text-text-primary">{formatSnapshotMonth(row.snapshotMonth)}<span className="mt-1 block text-[10px] font-normal text-text-tertiary">capturado {formatSnapshotDate(row.capturedAt)}</span></th><td className="table-cell-admin">{formatCount(row.activeCustomers)}</td><td className="table-cell-admin">{formatNullableCount(row.previousActiveCustomers)}</td><td className="table-cell-admin">{formatNullableCount(row.retainedCustomers)}</td><td className="table-cell-admin">{formatNullableCount(row.churnedCustomers)}</td><td className="table-cell-admin font-semibold">{row.retentionRate === null ? '—' : `${new Intl.NumberFormat('es-AR',{maximumFractionDigits:2}).format(row.retentionRate)}%`}</td><td className="table-cell-admin">{formatCount(row.activePatients)}</td><td className="table-cell-admin">{formatCount(row.activeProfessionals)}</td><td className="table-cell-admin">{formatBytes(row.storedPdfBytes)}</td><td className="table-cell-admin">{formatCount(row.appointments)} / {formatCount(row.completedAppointments)}</td><td className="table-cell-admin">{formatCount(row.checkinResponses)}</td><td className="table-cell-admin">{formatCount(row.publishedMealPlanVersions)}</td></tr>)}</tbody></table></div>}
        {retentionState.status === 'success' && retentionState.rows.length > 0 && <p className="border-t border-border-subtle p-4 text-[11px] leading-5 text-text-tertiary">El primer intervalo de retención puede ser menor a un mes; la fecha exacta de cada captura aparece en la tabla. La actividad de cada corte cubre el mes calendario UTC anterior. Una base anterior vacía o sin corte comparable se muestra como “—”, no como 0%.</p>}
      </section>

      <section className="rounded-2xl border border-[#C6D4F8] bg-[#EAEFFC] p-4" aria-label="Privacidad del reporte">
        <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#2D3F99]" aria-hidden="true" /><div><h3 className="text-sm font-semibold text-[#2D3F99]">Datos agregados, sin detalle clínico</h3><p className="mt-1 text-xs leading-5 text-text-secondary">Se muestran cantidades y montos registrados por consultorio. No se muestran nombres, fichas, notas, respuestas ni contenido de planes. Los cobros están separados por moneda; Nutrify sólo los registra y no procesa pagos.</p></div></div>
      </section>

      <section className="rounded-2xl border border-[#F4E3B4] bg-[#FDF6E2] p-4" aria-label="Alcance de almacenamiento PDF">
        <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#845712]" aria-hidden="true" /><div><h3 className="text-sm font-semibold text-[#70470C]">Dos referencias de almacenamiento, sin mezclarlas</h3><p className="mt-1 text-xs leading-5 text-[#70470C]">“Plan” compara todos los PDFs del consultorio con el límite comercial. “Cuota técnica” suma los límites individuales de los profesionales que aceptaron la política de biblioteca y además señala cuántos están cerca/sobre su cuota individual. Logos y cabeceras no se cuentan.</p></div></div>
      </section>

      {unconfiguredCount > 0 && <section className="flex flex-col gap-3 rounded-2xl border border-[#F4E3B4] bg-[#FFFAEC] p-4 sm:flex-row sm:items-center sm:justify-between" aria-label="Consultorios sin plan">
        <div><h3 className="text-sm font-semibold text-[#70470C]">{unconfiguredCount} {unconfiguredCount === 1 ? 'consultorio sin plan' : 'consultorios sin plan'}</h3><p className="mt-1 text-xs text-[#70470C]">Sin plan asignado no podemos comparar consumos contra sus límites comerciales.</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setPlanFilter('unconfigured'); setStatusFilter('all'); }} className="min-h-10 rounded-xl border border-[#E8D59E] bg-surface px-3 text-xs font-semibold text-[#70470C]">Ver sin plan</button><Link to="/admin/organizations" className="inline-flex min-h-10 items-center rounded-xl bg-[#70470C] px-3 text-xs font-semibold text-white">Configurar en Consultorios</Link></div>
      </section>}

      <section className="rounded-2xl border border-border-subtle bg-surface p-4 shadow-sm" aria-label="Filtros del reporte">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <label className="text-xs font-semibold text-text-secondary">Desde<input type="date" value={fromDate} max={toDate} onChange={event => setFromDate(event.target.value)} className="mt-1 min-h-10 w-full rounded-xl border border-border-subtle bg-surface px-3 text-sm font-normal text-text-primary" /></label>
          <label className="text-xs font-semibold text-text-secondary">Hasta<input type="date" value={toDate} min={fromDate} max={today} onChange={event => setToDate(event.target.value)} className="mt-1 min-h-10 w-full rounded-xl border border-border-subtle bg-surface px-3 text-sm font-normal text-text-primary" /></label>
          <label className="relative text-xs font-semibold text-text-secondary">Buscar consultorio<span className="sr-only"> por nombre o identificador</span><Search className="pointer-events-none absolute left-3 top-[2.45rem] h-4 w-4 -translate-y-1/2 text-text-tertiary" aria-hidden="true" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Nombre o identificador" className="mt-1 min-h-10 w-full rounded-xl border border-border-subtle bg-surface pl-9 pr-3 text-sm font-normal text-text-primary outline-none focus:border-brand-strong" /></label>
          <label className="text-xs font-semibold text-text-secondary">Plan<select value={planFilter} onChange={event => setPlanFilter(event.target.value)} className="mt-1 min-h-10 w-full rounded-xl border border-border-subtle bg-surface px-3 text-sm font-normal text-text-primary"><option value="all">Todos</option><option value="pro">PRO</option><option value="ultra">ULTRA</option><option value="custom">CUSTOM</option><option value="unconfigured">Sin configurar</option></select></label>
          <label className="text-xs font-semibold text-text-secondary">Consultorio<select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="mt-1 min-h-10 w-full rounded-xl border border-border-subtle bg-surface px-3 text-sm font-normal text-text-primary"><option value="all">Todos los estados</option><option value="active">Activo</option><option value="suspended">Suspendido</option><option value="attention">Requiere atención</option><option value="unconfigured">Sin plan configurado</option></select></label>
          <label className="text-xs font-semibold text-text-secondary">Ordenar por<select value={sortBy} onChange={event => setSortBy(event.target.value)} className="mt-1 min-h-10 w-full rounded-xl border border-border-subtle bg-surface px-3 text-sm font-normal text-text-primary"><option value="attention">Atención primero</option><option value="patients">Mayor uso de pacientes</option><option value="storage">Mayor uso de almacenamiento</option><option value="professionals">Mayor uso de profesionales</option><option value="activity">Más actividad del período</option><option value="name">Nombre A–Z</option></select></label>
        </div>
        {!validDates && <p role="alert" className="mt-3 text-xs text-semantic-critical">Elegí ambas fechas y verificá que la fecha inicial no sea posterior a la final.</p>}
      </section>

      {state.status === 'loading' && <div role="status" className="rounded-2xl border border-border-subtle bg-surface p-8 text-sm text-text-secondary">Actualizando indicadores del período…</div>}
      {state.status === 'error' && <section role="alert" className="rounded-2xl border border-[#F8C4C1] bg-[#FCEBEA] p-5"><h3 className="font-semibold text-[#902A24]">No pudimos cargar el reporte</h3><p className="mt-1 text-sm text-text-secondary">Intentá nuevamente. Si el problema persiste, verificá la conexión de Supabase.</p><Button type="button" variant="secondary" className="mt-4 gap-2" onClick={() => setAttempt(value => value + 1)}><RefreshCw className="h-4 w-4" aria-hidden="true" /> Reintentar</Button></section>}

      {state.status === 'success' && validDates && <>
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Totales de consultorios filtrados">
          <SummaryCard icon={Building2} label="Consultorios" value={filteredRows.length.toLocaleString('es-AR')} note="Coinciden con los filtros" />
          <SummaryCard icon={AlertTriangle} label="Sin plan configurado" value={filteredRows.filter(row => !row.plan).length.toLocaleString('es-AR')} note="Asignación pendiente en Consultorios" />
          <SummaryCard icon={Users} label="Pacientes activos" value={totals.patients.toLocaleString('es-AR')} note="Acceso al portal vigente" />
          <SummaryCard icon={Stethoscope} label="Profesionales activos" value={totals.professionals.toLocaleString('es-AR')} note="Owners y nutricionistas" />
          <SummaryCard icon={HardDrive} label="PDF almacenados" value={formatBytes(totals.pdfBytes)} note="Uso agregado actual" />
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Actividad agregada del período">
          <MiniMetric label="Citas" value={totals.appointments} detail={`${totals.completedAppointments.toLocaleString('es-AR')} completadas`} />
          <MiniMetric label="Respuestas de check-in" value={totals.checkins} detail="Sin respuestas ni contenido" />
          <MiniMetric label="Versiones de plan publicadas" value={totals.publications} detail="En el período seleccionado" />
          <MiniMetric label="Movimientos de cobro" value={incomeTotals.reduce((sum, item) => sum + item.paymentCount + item.refundCount, 0)} detail="Cobros y devoluciones manuales" />
        </section>

        <section className="overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm" aria-label="Totales de ingresos del período por moneda">
          <div className="border-b border-border-subtle p-4 sm:p-5"><h3 className="font-semibold text-text-primary">Cobros registrados por moneda</h3><p className="mt-1 text-xs text-text-secondary">Totales de los consultorios filtrados; monedas separadas, sin conversión.</p></div>
          {incomeTotals.length ? <div className="overflow-x-auto"><table className="w-full min-w-[580px] text-left text-sm"><thead className="bg-surface-subtle text-[11px] uppercase text-text-secondary"><tr><th className="table-cell-admin">Moneda</th><th className="table-cell-admin">Cobros</th><th className="table-cell-admin">Devoluciones</th><th className="table-cell-admin">Neto registrado</th><th className="table-cell-admin">Cantidad de movimientos</th></tr></thead><tbody className="divide-y divide-border-subtle">{incomeTotals.map(item => <tr key={item.currency}><td className="table-cell-admin font-semibold">{item.currency}</td><td className="table-cell-admin">{formatMoney(item.payments, item.currency)}</td><td className="table-cell-admin">{formatMoney(item.refunds, item.currency)}</td><td className="table-cell-admin font-semibold">{formatMoney(item.net, item.currency)}</td><td className="table-cell-admin">{(item.paymentCount + item.refundCount).toLocaleString('es-AR')}</td></tr>)}</tbody></table></div> : <p className="p-5 text-sm text-text-tertiary">No hay cobros ni devoluciones registrados en este período.</p>}
        </section>

        <RealAdminPlatformRevenue from={fromDate} to={toDate} />

        <section className="overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm">
          <div className="flex flex-col gap-2 border-b border-border-subtle p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div><h3 className="font-semibold text-text-primary">Detalle numérico por consultorio</h3><p className="mt-1 text-xs text-text-secondary">Estado actual y actividad entre {fromDate} y {toDate} · {filteredRows.length} consultorios</p></div><p className="text-[11px] text-text-tertiary">Tocá “Ver métricas” para ampliar el detalle</p></div>
          {filteredRows.length === 0 ? <div className="p-10 text-center"><Building2 className="mx-auto h-8 w-8 text-text-tertiary" aria-hidden="true" /><p className="mt-3 text-sm font-semibold text-text-primary">No hay consultorios para mostrar</p><p className="mt-1 text-xs text-text-secondary">Cambiá los filtros para ver otros resultados.</p></div> : <>
            <div className="space-y-3 p-3 xl:hidden">{filteredRows.map(row => <MobileUsageCard key={row.organizationId} row={row} expanded={expandedId === row.organizationId} onToggle={() => setExpandedId(expandedId === row.organizationId ? null : row.organizationId)} />)}</div>
            <div className="hidden overflow-x-auto xl:block"><table className="w-full min-w-[1150px] border-collapse text-left"><thead className="bg-surface-subtle"><tr className="text-[11px] uppercase tracking-wide text-text-secondary"><th scope="col" className="table-cell-admin">Consultorio</th><th scope="col" className="table-cell-admin">Plan</th><th scope="col" className="table-cell-admin">Pacientes</th><th scope="col" className="table-cell-admin">Profesionales</th><th scope="col" className="table-cell-admin">Almacenamiento</th><th scope="col" className="table-cell-admin">Actividad</th><th scope="col" className="table-cell-admin">Ingresos registrados</th><th scope="col" className="table-cell-admin">Estado</th><th scope="col" className="table-cell-admin"><span className="sr-only">Detalle</span></th></tr></thead><tbody className="divide-y divide-border-subtle text-xs">{filteredRows.map(row => <UsageRow key={row.organizationId} row={row} expanded={expandedId === row.organizationId} onToggle={() => setExpandedId(expandedId === row.organizationId ? null : row.organizationId)} />)}</tbody></table></div>
          </>}
        </section>
        <p className="text-[11px] text-text-tertiary">Citas cuentan por fecha/hora de inicio; check-ins por fecha de respuesta; publicaciones por fecha de publicación. Montos separados por moneda y mostrados como registros manuales, no procesamiento de pagos.</p>
      </>}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, note }: { icon: typeof Users; label: string; value: string; note: string }) {
  return <article className="rounded-2xl border border-border-subtle bg-surface p-5 shadow-sm"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand-strong"><Icon className="h-5 w-5" aria-hidden="true" /></div><p className="mt-5 text-sm text-text-secondary">{label}</p><p className="mt-1 text-3xl font-bold text-text-primary">{value}</p><p className="mt-1 text-xs text-text-tertiary">{note}</p></article>;
}

function MiniMetric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <article className="rounded-2xl border border-border-subtle bg-surface p-4"><div className="flex items-center gap-2 text-text-secondary"><Activity className="h-4 w-4 text-brand-strong" aria-hidden="true" /><p className="text-xs font-semibold">{label}</p></div><p className="mt-3 text-2xl font-bold text-text-primary">{value.toLocaleString('es-AR')}</p><p className="mt-1 text-[11px] text-text-tertiary">{detail}</p></article>;
}

function UsageRow({ row, expanded, onToggle }: { row: RealAdminOrganizationUsage; expanded: boolean; onToggle: () => void }) {
  const attention = hasAttention(row);
  const overLimit = row.professionalsOverLibraryQuota > 0 || [usageRatio(row.activePatients, row.maxActivePatients), usageRatio(row.activeProfessionals, row.professionalCapacity), usageRatio(row.storedPdfBytes, row.planStorageLimitBytes)].some(ratio => ratio !== null && ratio > 1);
  return <>
    <tr className="align-top"><td className="table-cell-admin"><p className="font-semibold text-text-primary">{row.organizationName}</p><p className="mt-1 text-[11px] text-text-tertiary">{row.organizationSlug}</p></td><td className="table-cell-admin"><Badge variant={row.plan ? 'info' : 'pending'}>{row.plan?.toUpperCase() ?? 'Sin plan'}</Badge>{row.subscriptionStatus && <p className="mt-1 text-[11px] capitalize text-text-tertiary">{statusLabel(row.subscriptionStatus)}</p>}</td><td className="table-cell-admin"><UsageValue value={row.activePatients} limit={row.maxActivePatients} noun="pacientes" configured={Boolean(row.plan)} /></td><td className="table-cell-admin"><UsageValue value={row.activeProfessionals} limit={row.professionalCapacity} noun="profesionales" configured={Boolean(row.plan)} /></td><td className="table-cell-admin"><PlanStorageValue row={row} /></td><td className="table-cell-admin"><p className="font-semibold text-text-primary">{row.appointmentsInPeriod.toLocaleString('es-AR')} citas</p><p className="mt-1 text-[11px] text-text-secondary">{row.checkinResponsesInPeriod} check-ins · {row.publishedMealPlanVersionsInPeriod} publicaciones</p></td><td className="table-cell-admin"><IncomeSummary entries={row.incomeByCurrency} /></td><td className="table-cell-admin"><Badge variant={overLimit ? 'high' : attention ? 'medium' : 'normal'}>{!row.plan ? 'Plan pendiente' : overLimit ? 'Superado' : attention ? 'Atención' : 'En rango'}</Badge><p className="mt-1 text-[11px] text-text-tertiary">{row.organizationStatus === 'active' ? 'Activo' : 'Suspendido'}</p>{row.professionalsNearLibraryQuota > 0 && <p className="mt-1 text-[11px] text-[#845712]">{row.professionalsNearLibraryQuota} cuota(s) PDF cerca</p>}</td><td className="table-cell-admin"><button type="button" onClick={onToggle} aria-expanded={expanded} className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-brand-strong hover:bg-surface-subtle">{expanded ? 'Ocultar' : 'Ver métricas'}{expanded ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}</button></td></tr>
    {expanded && <tr><td colSpan={9} className="bg-surface-subtle px-4 py-5 sm:px-6"><ExpandedMetrics row={row} /></td></tr>}
  </>;
}

function MobileUsageCard({ row, expanded, onToggle }: { row: RealAdminOrganizationUsage; expanded: boolean; onToggle: () => void }) {
  const issue = hasAttention(row);
  return <article className="rounded-2xl border border-border-subtle bg-surface p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h4 className="truncate font-semibold text-text-primary">{row.organizationName}</h4><p className="mt-0.5 truncate text-[11px] text-text-tertiary">{row.organizationSlug}</p></div><Badge variant={!row.plan ? 'pending' : issue ? 'medium' : 'normal'}>{!row.plan ? 'Sin plan' : issue ? 'Atención' : 'En rango'}</Badge></div>
    <div className="mt-3 flex flex-wrap items-center gap-2"><Badge variant={row.plan ? 'info' : 'neutral'}>{row.plan?.toUpperCase() ?? 'Asignación pendiente'}</Badge><Badge variant={row.organizationStatus === 'active' ? 'active' : 'suspended'}>{row.organizationStatus === 'active' ? 'Activo' : 'Suspendido'}</Badge></div>
    <dl className="mt-4 grid grid-cols-2 gap-3"><Metric label="Pacientes" value={`${row.activePatients} / ${limitLabel(row.maxActivePatients, row.plan)}`} /><Metric label="Profesionales" value={`${row.activeProfessionals} / ${limitLabel(row.professionalCapacity, row.plan)}`} /><Metric label="PDF actual" value={formatBytes(row.storedPdfBytes)} /><Metric label="Citas en período" value={row.appointmentsInPeriod.toLocaleString('es-AR')} /></dl>
    <button type="button" onClick={onToggle} aria-expanded={expanded} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-border-subtle text-sm font-semibold text-brand-strong">{expanded ? 'Ocultar métricas' : 'Ver todas las métricas'}{expanded ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}</button>
    {expanded && <div className="mt-4 border-t border-border-subtle pt-4"><ExpandedMetrics row={row} /></div>}
  </article>;
}

function ExpandedMetrics({ row }: { row: RealAdminOrganizationUsage }) {
  return <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
    <section><h4 className="text-sm font-bold text-text-primary">Capacidad y funciones del plan</h4><dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2"> <Metric label="Pacientes activos / máximo" value={`${row.activePatients.toLocaleString('es-AR')} / ${limitLabel(row.maxActivePatients, row.plan)}`} /><Metric label="Profesionales / capacidad" value={`${row.activeProfessionals.toLocaleString('es-AR')} / ${limitLabel(row.professionalCapacity, row.plan)}`} /><Metric label="Asignaciones de plan alimentario activas" value={row.activeMealPlanAssignments.toLocaleString('es-AR')} /><Metric label="Personalización CUSTOM" value={row.plan === 'custom' ? `${row.brandingSettingsFieldsCount} / 6 campos · ${row.brandingAssetsCount} / 3 imágenes` : 'No incluido en este plan'} /><Metric label="Google Calendar conectados" value={row.connectedGoogleCalendars.toLocaleString('es-AR')} /></dl></section>
    <section><h4 className="text-sm font-bold text-text-primary">Almacenamiento: consumo y cuotas</h4><dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2"><Metric label="PDF usados / límite comercial" value={`${formatBytes(row.storedPdfBytes)} / ${row.planStorageLimitBytes === null ? (row.plan ? 'Sin límite' : 'No configurado') : formatBytes(row.planStorageLimitBytes)}`} /><Metric label="Cuota técnica total de perfiles habilitados" value={`${formatBytes(row.effectiveLibraryQuotaBytes)} · ${row.uploadEnabledProfessionals} profesionales`} /><Metric label="Profesionales cerca de su cuota individual" value={row.professionalsNearLibraryQuota.toLocaleString('es-AR')} /><Metric label="Profesionales por encima de cuota individual" value={row.professionalsOverLibraryQuota.toLocaleString('es-AR')} /></dl><p className="mt-2 text-[11px] leading-5 text-text-tertiary">La cuota técnica se impone por profesional; su suma sólo da contexto y no funciona como límite compartido del consultorio.</p></section>
    <section><h4 className="text-sm font-bold text-text-primary">Actividad del período</h4><dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2"><Metric label="Citas iniciadas" value={row.appointmentsInPeriod.toLocaleString('es-AR')} /><Metric label="Citas completadas" value={row.completedAppointmentsInPeriod.toLocaleString('es-AR')} /><Metric label="Respuestas de check-in" value={row.checkinResponsesInPeriod.toLocaleString('es-AR')} /><Metric label="Versiones de plan publicadas" value={row.publishedMealPlanVersionsInPeriod.toLocaleString('es-AR')} /></dl><h5 className="mt-4 text-xs font-bold uppercase tracking-wide text-text-secondary">Cobros y devoluciones por moneda</h5><div className="mt-2 overflow-x-auto"><table className="w-full min-w-[520px] text-left text-xs"><thead><tr className="text-text-tertiary"><th className="py-2 pr-3">Moneda</th><th className="py-2 pr-3">Cobros</th><th className="py-2 pr-3">Devoluciones</th><th className="py-2 pr-3">Neto</th><th className="py-2">Movimientos</th></tr></thead><tbody className="divide-y divide-border-subtle">{row.incomeByCurrency.length ? row.incomeByCurrency.map(item => <tr key={item.currency}><td className="py-2 pr-3 font-semibold">{item.currency}</td><td className="py-2 pr-3">{formatMoney(item.payments, item.currency)}</td><td className="py-2 pr-3">{formatMoney(item.refunds, item.currency)}</td><td className="py-2 pr-3 font-semibold">{formatMoney(item.net, item.currency)}</td><td className="py-2">{item.paymentCount + item.refundCount}</td></tr>) : <tr><td colSpan={5} className="py-3 text-text-tertiary">Sin movimientos en el período</td></tr>}</tbody></table></div></section>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-border-subtle bg-surface p-3"><dt className="text-[11px] text-text-secondary">{label}</dt><dd className="mt-1 text-sm font-bold text-text-primary">{value}</dd></div>; }
function IncomeSummary({ entries }: { entries: RealAdminOrganizationUsage['incomeByCurrency'] }) { return entries.length ? <div className="space-y-1">{entries.map(item => <p key={item.currency} className="whitespace-nowrap font-semibold text-text-primary">{formatMoney(item.net, item.currency)} <span className="font-normal text-text-tertiary">{item.currency}</span></p>)}</div> : <span className="text-text-tertiary">—</span>; }
function PlanStorageValue({ row }: { row: RealAdminOrganizationUsage }) {
  return <div><UsageValue value={row.storedPdfBytes} limit={row.planStorageLimitBytes} bytes configured={Boolean(row.plan)} /><p className="mt-2 max-w-44 text-[10px] leading-4 text-text-tertiary">Cuota técnica: {formatBytes(row.effectiveLibraryQuotaBytes)} en {row.uploadEnabledProfessionals} perfiles habilitados</p>{row.professionalsNearLibraryQuota > 0 && <p className="mt-1 text-[10px] font-semibold text-[#845712]">{row.professionalsNearLibraryQuota} cerca de su límite individual</p>}</div>;
}
function UsageValue({ value, limit, noun, bytes = false, configured = true }: { value: number; limit: number | null; noun?: string; bytes?: boolean; configured?: boolean }) {
  const displayValue = bytes ? formatBytes(value) : value.toLocaleString('es-AR');
  const displayLimit = limit === null ? (configured ? 'Sin límite' : 'No configurado') : bytes ? formatBytes(limit) : limit.toLocaleString('es-AR');
  const ratio = usageRatio(value, limit);
  const percent = ratio === null ? null : Math.round(ratio * 100);
  return <div className="min-w-36"><p className="whitespace-nowrap font-semibold text-text-primary">{displayValue}<span className="font-normal text-text-secondary"> / {displayLimit}{noun ? ` ${noun}` : ''}</span></p>{percent !== null && <><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-subtle"><div className={`h-full rounded-full ${percent > 100 ? 'bg-[#B83B33]' : percent >= 80 ? 'bg-[#C58A27]' : 'bg-[#3A9A67]'}`} style={{ width: `${Math.min(percent, 100)}%` }} /></div><p className="mt-1 text-[10px] text-text-tertiary">{percent}% utilizado</p></>}</div>;
}

function aggregateIncome(rows: RealAdminOrganizationUsage[]) {
  const grouped = new Map<string, RealAdminOrganizationUsage['incomeByCurrency'][number]>();
  for (const item of rows.flatMap(row => row.incomeByCurrency)) {
    const previous = grouped.get(item.currency);
    grouped.set(item.currency, { currency: item.currency, payments: (previous?.payments ?? 0) + item.payments, refunds: (previous?.refunds ?? 0) + item.refunds, net: (previous?.net ?? 0) + item.net, paymentCount: (previous?.paymentCount ?? 0) + item.paymentCount, refundCount: (previous?.refundCount ?? 0) + item.refundCount });
  }
  return [...grouped.values()];
}
function hasAttention(row: RealAdminOrganizationUsage) { return !row.plan || row.professionalsNearLibraryQuota > 0 || row.professionalsOverLibraryQuota > 0 || [usageRatio(row.activePatients, row.maxActivePatients), usageRatio(row.activeProfessionals, row.professionalCapacity), usageRatio(row.storedPdfBytes, row.planStorageLimitBytes)].some(ratio => ratio !== null && ratio >= 0.8); }
function compareRows(a: RealAdminOrganizationUsage, b: RealAdminOrganizationUsage, sortBy: string) {
  if (!a.plan && b.plan) return -1;
  if (a.plan && !b.plan) return 1;
  if (sortBy === 'name') return a.organizationName.localeCompare(b.organizationName, 'es-AR');
  if (sortBy === 'patients') return (usageRatio(b.activePatients, b.maxActivePatients) ?? -1) - (usageRatio(a.activePatients, a.maxActivePatients) ?? -1) || a.organizationName.localeCompare(b.organizationName, 'es-AR');
  if (sortBy === 'professionals') return (usageRatio(b.activeProfessionals, b.professionalCapacity) ?? -1) - (usageRatio(a.activeProfessionals, a.professionalCapacity) ?? -1) || a.organizationName.localeCompare(b.organizationName, 'es-AR');
  if (sortBy === 'storage') return (usageRatio(b.storedPdfBytes, b.planStorageLimitBytes) ?? -1) - (usageRatio(a.storedPdfBytes, a.planStorageLimitBytes) ?? -1) || b.professionalsNearLibraryQuota - a.professionalsNearLibraryQuota || a.organizationName.localeCompare(b.organizationName, 'es-AR');
  if (sortBy === 'activity') return (b.appointmentsInPeriod + b.checkinResponsesInPeriod + b.publishedMealPlanVersionsInPeriod) - (a.appointmentsInPeriod + a.checkinResponsesInPeriod + a.publishedMealPlanVersionsInPeriod) || a.organizationName.localeCompare(b.organizationName, 'es-AR');
  return attentionScore(b) - attentionScore(a) || a.organizationName.localeCompare(b.organizationName, 'es-AR');
}
function attentionScore(row: RealAdminOrganizationUsage) {
  const ratios = [usageRatio(row.activePatients, row.maxActivePatients), usageRatio(row.activeProfessionals, row.professionalCapacity), usageRatio(row.storedPdfBytes, row.planStorageLimitBytes)].filter((ratio): ratio is number => ratio !== null);
  return (row.plan ? 0 : 1000) + row.professionalsOverLibraryQuota * 100 + row.professionalsNearLibraryQuota * 20 + ratios.filter(ratio => ratio > 1).length * 50 + ratios.filter(ratio => ratio >= 0.8).length * 10;
}
function usageRatio(value: number, limit: number | null) { return limit === null || limit <= 0 ? null : value / limit; }
function limitLabel(limit: number | null, plan: RealAdminOrganizationUsage['plan']) { return limit === null ? (plan ? 'Sin límite' : 'No configurado') : limit.toLocaleString('es-AR'); }
function formatBytes(bytes: number) { if (bytes === 0) return '0 MB'; const units = ['B', 'KB', 'MB', 'GB', 'TB']; const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1); return `${(bytes / 1024 ** index).toLocaleString('es-AR', { maximumFractionDigits: index >= 2 ? 1 : 0 })} ${units[index]}`; }
function formatMoney(amount: number, currency: string) { return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount); }
function statusLabel(status: NonNullable<RealAdminOrganizationUsage['subscriptionStatus']>) { return ({ trialing: 'En prueba', active: 'Activa', grace: 'En gracia', suspended: 'Suspendida', cancelled: 'Cancelada' })[status]; }
function formatCount(value: number) { return value.toLocaleString('es-AR'); }
function formatNullableCount(value: number | null) { return value === null ? '—' : formatCount(value); }
function formatSnapshotMonth(value: string) { return new Intl.DateTimeFormat('es-AR',{month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(`${value}T00:00:00Z`)); }
function formatSnapshotDate(value: string) { return new Intl.DateTimeFormat('es-AR',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'UTC'}).format(new Date(value)); }
function localDateValue(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function parseLocalDate(value: string) { const [year = 1970, month = 1, day = 1] = value.split('-').map(Number); return new Date(year, month - 1, day); }
function addDays(date: Date, days: number) { const result = new Date(date); result.setDate(result.getDate() + days); return result; }
function localDateStart(value: string) { return parseLocalDate(value).toISOString(); }
