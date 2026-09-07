import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, ClipboardCheck, Clock3, Search, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMock } from '../../provider';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';
import { buildCheckInOverviewRows, isResponseInDateRange, sortCheckInRows, type CheckInDateRange, type CheckInPriority, type CheckInSort } from '../../../lib/checkInOverview';
import { formatFullDateTime, formatRelativeTime } from '../../../lib/dateUtils';

const rangeOptions: Array<[CheckInDateRange, string]> = [['all', 'Todos'], ['today', 'Hoy'], ['7days', 'Últimos 7 días'], ['15days', 'Últimos 15 días'], ['month', 'Mes'], ['custom', 'Personalizado']];

const priorityCopy: Record<CheckInPriority, { label: string; variant: 'high' | 'medium' | 'normal' | 'neutral' }> = {
  high: { label: 'Alta', variant: 'high' },
  medium: { label: 'Media', variant: 'medium' },
  normal: { label: 'Normal', variant: 'normal' },
  none: { label: 'Sin respuesta', variant: 'neutral' },
};

export function CheckInsPage() {
  const { professionalPatients, professionalAssignments, checkInResponses } = useMock();
  const [search, setSearch] = useState('');
  const [patientId, setPatientId] = useState('all');
  const [priority, setPriority] = useState<'all' | CheckInPriority>('all');
  const [range, setRange] = useState<CheckInDateRange>('all');
  const [sort, setSort] = useState<CheckInSort>('date-desc');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const allRows = useMemo(() => buildCheckInOverviewRows(professionalPatients, professionalAssignments, checkInResponses), [checkInResponses, professionalAssignments, professionalPatients]);
  const rows = useMemo(() => sortCheckInRows(allRows.filter(row => {
    const name = `${row.patient.firstName} ${row.patient.lastName}`.toLowerCase();
    return name.includes(search.trim().toLowerCase()) &&
      (patientId === 'all' || row.patient.id === patientId) &&
      (priority === 'all' || row.priority === priority) &&
      isResponseInDateRange(row.latestResponse, range, customStart, customEnd);
  }), sort), [allRows, customEnd, customStart, patientId, priority, range, search, sort]);

  const responded = allRows.filter(row => row.latestResponse).length;
  const highPriority = allRows.filter(row => row.priority === 'high').length;
  const withoutResponse = allRows.filter(row => !row.latestResponse).length;
  const inactivityRows = useMemo(() => allRows.map(row => {
    const reference = row.latestResponse?.submittedAt ?? row.latestAssignment?.createdAt;
    const days = reference ? Math.max(0, Math.floor((Date.now() - new Date(reference).getTime()) / 86_400_000)) : null;
    return { ...row, inactivityDays: days };
  }).filter(row => row.inactivityDays !== null && row.inactivityDays >= 3).sort((left, right) => (right.inactivityDays ?? 0) - (left.inactivityDays ?? 0)), [allRows]);
  const inactive3to4 = inactivityRows.filter(row => (row.inactivityDays ?? 0) >= 3 && (row.inactivityDays ?? 0) < 5).length;
  const inactive5to9 = inactivityRows.filter(row => (row.inactivityDays ?? 0) >= 5 && (row.inactivityDays ?? 0) < 10).length;
  const inactive10plus = inactivityRows.filter(row => (row.inactivityDays ?? 0) >= 10).length;
  const invalidCustomRange = range === 'custom' && customStart && customEnd && customStart > customEnd;

  return <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
    <header><h2 className="text-2xl font-bold text-text-primary flex items-center gap-2"><ClipboardCheck className="w-6 h-6 text-brand-strong" />Check-ins</h2><p className="text-xs text-text-secondary mt-1">Última respuesta de cada paciente y acceso a su historial completo.</p></header>

    <section aria-label="Resumen de check-ins" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <Card className="p-4"><CheckCircle2 className="w-4 h-4 text-semantic-success" /><p className="text-[11px] text-text-secondary mt-3">Con respuestas</p><p className="text-xl font-bold mt-1">{responded}</p></Card>
      <Card className="p-4"><AlertTriangle className="w-4 h-4 text-semantic-critical" /><p className="text-[11px] text-text-secondary mt-3">Prioridad alta</p><p className="text-xl font-bold mt-1">{highPriority}</p></Card>
      <Card className="p-4"><Clock3 className="w-4 h-4 text-text-tertiary" /><p className="text-[11px] text-text-secondary mt-3">Sin respuestas todavía</p><p className="text-xl font-bold mt-1">{withoutResponse}</p></Card>
    </section>

    <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_19rem] gap-4" aria-labelledby="checkin-weekly-title">
      <Card className="space-y-4"><div><h3 id="checkin-weekly-title" className="text-base font-bold text-text-primary">Seguimiento semanal</h3><p className="text-xs text-text-secondary mt-1">Priorizá pacientes sin actividad. Es una señal operativa, no un diagnóstico.</p></div>{inactivityRows.length === 0 ? <div className="rounded-xl bg-surface-subtle p-5 text-sm text-text-secondary">No hay pacientes con 3 o más días sin actividad registrada.</div> : <div className="divide-y divide-border-subtle">{inactivityRows.slice(0, 5).map(row => <div key={row.patient.id} className="py-3 flex items-center justify-between gap-3"><div><p className="text-sm font-bold text-text-primary">{row.patient.firstName} {row.patient.lastName}</p><p className="text-xs text-text-secondary mt-0.5">{row.inactivityDays} días sin actividad registrada</p></div><Link to={`/professional/patients/${row.patient.id}?tab=checkins`} className="min-h-10 shrink-0 inline-flex items-center gap-1 rounded-xl px-3 text-xs font-semibold text-brand-strong hover:bg-surface-tinted">Ver <ArrowRight className="w-3.5 h-3.5" /></Link></div>)}</div>}</Card>
      <Card className="space-y-3"><p className="text-sm font-bold text-text-primary">Alertas de inactividad</p><div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-surface-subtle p-2"><p className="text-lg font-bold text-text-primary">{inactive3to4}</p><p className="text-[10px] text-text-secondary">3–4 días</p></div><div className="rounded-xl bg-semantic-warning/10 p-2"><p className="text-lg font-bold text-text-primary">{inactive5to9}</p><p className="text-[10px] text-text-secondary">5–9 días</p></div><div className="rounded-xl bg-semantic-critical/10 p-2"><p className="text-lg font-bold text-text-primary">{inactive10plus}</p><p className="text-[10px] text-text-secondary">10+ días</p></div></div><p className="text-[11px] text-text-tertiary">Las alertas se agrupan para evitar duplicar a una misma persona en varios conteos.</p></Card>
    </section>

    <Card className="space-y-4">
      <div className="flex flex-wrap gap-1 rounded-xl bg-surface-subtle p-1" aria-label="Filtrar por fecha">{rangeOptions.map(([value, label]) => <button key={value} type="button" aria-pressed={range === value} onClick={() => setRange(value)} className={`min-h-11 px-3 rounded-lg text-xs font-semibold transition-colors ${range === value ? 'bg-white text-brand-strong shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>{label}</button>)}</div>
      {range === 'custom' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl bg-surface-subtle p-3"><div><label htmlFor="checkins-start" className="form-label">Desde</label><input id="checkins-start" type="date" value={customStart} max={customEnd || undefined} onChange={event => setCustomStart(event.target.value)} className="form-control" /></div><div><label htmlFor="checkins-end" className="form-label">Hasta</label><input id="checkins-end" type="date" value={customEnd} min={customStart || undefined} onChange={event => setCustomEnd(event.target.value)} className="form-control" /></div>{invalidCustomRange && <p className="text-xs font-semibold text-semantic-critical sm:col-span-2">La fecha inicial debe ser anterior o igual a la final.</p>}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="relative"><label htmlFor="checkins-search" className="sr-only">Buscar paciente</label><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" /><input id="checkins-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar paciente..." className="form-control pl-11" /></div>
        <div><label htmlFor="checkins-patient" className="sr-only">Filtrar por paciente</label><select id="checkins-patient" value={patientId} onChange={event => setPatientId(event.target.value)} className="form-control"><option value="all">Todos los pacientes</option>{professionalPatients.map(patient => <option key={patient.id} value={patient.id}>{patient.firstName} {patient.lastName}</option>)}</select></div>
        <div><label htmlFor="checkins-priority" className="sr-only">Filtrar por prioridad</label><select id="checkins-priority" value={priority} onChange={event => setPriority(event.target.value as 'all' | CheckInPriority)} className="form-control"><option value="all">Todas las prioridades</option><option value="high">Prioridad alta</option><option value="medium">Prioridad media</option><option value="normal">Prioridad normal</option><option value="none">Sin respuesta</option></select></div>
        <div><label htmlFor="checkins-sort" className="sr-only">Ordenar check-ins</label><select id="checkins-sort" value={sort} onChange={event => setSort(event.target.value as CheckInSort)} className="form-control"><option value="date-desc">Fecha: más reciente</option><option value="date-asc">Fecha: más antigua</option><option value="patient-asc">Paciente: A–Z</option></select></div>
      </div>
    </Card>

    <Card className="p-0 overflow-hidden">
      <div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left"><thead className="bg-surface-subtle border-b border-border-subtle"><tr>{['Paciente', 'Último check-in', 'Energía', 'Adherencia', 'Ayuda', 'Prioridad', 'Acción'].map(label => <th key={label} scope="col" className="px-4 py-3 text-[11px] font-bold text-text-secondary">{label}</th>)}</tr></thead><tbody className="divide-y divide-border-subtle">{rows.map(row => {
        const response = row.latestResponse;
        const priorityInfo = priorityCopy[row.priority];
        return <tr key={row.patient.id} className="hover:bg-surface-subtle/70"><td className="px-4 py-3"><div className="flex items-center gap-2"><span className="w-8 h-8 rounded-xl bg-brand-soft text-brand-strong flex items-center justify-center font-bold text-[10px] shrink-0">{row.patient.firstName[0]}{row.patient.lastName[0]}</span><div><p className="text-xs font-bold text-text-primary">{row.patient.firstName} {row.patient.lastName}</p><p className="text-[10px] text-text-tertiary">{row.patient.objective}</p></div></div></td><td className="px-4 py-3">{response ? <><p className="text-xs font-semibold text-text-primary">{formatFullDateTime(response.submittedAt)}</p><p className="text-[10px] text-text-tertiary mt-0.5">{formatRelativeTime(response.submittedAt)}</p></> : <><p className="text-xs text-text-secondary">Todavía sin respuestas</p>{row.latestAssignment?.status === 'pending' && <Badge variant="pending" className="mt-1">Check-in pendiente</Badge>}</>}</td><td className="px-4 py-3 text-xs font-semibold text-text-primary">{response ? `${response.energyScore}/5` : '—'}</td><td className="px-4 py-3 text-xs font-semibold text-text-primary">{response ? `${response.adherenceScore}/5` : '—'}</td><td className="px-4 py-3">{response ? <span className={`text-xs font-semibold ${response.helpRequested ? 'text-semantic-critical' : 'text-text-secondary'}`}>{response.helpRequested ? 'Sí' : 'No'}</span> : '—'}</td><td className="px-4 py-3"><Badge variant={priorityInfo.variant}>{priorityInfo.label}</Badge></td><td className="px-4 py-3"><Link to={`/professional/patients/${row.patient.id}?tab=checkins`} className="min-h-11 inline-flex items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-brand-strong hover:bg-surface-tinted">Ver historial <ArrowRight className="w-3.5 h-3.5" /></Link></td></tr>;
      })}</tbody></table></div>
      {rows.length === 0 && <div className="py-12 text-center"><UserRound className="w-7 h-7 text-text-tertiary mx-auto" /><p className="text-sm font-semibold text-text-primary mt-2">No encontramos check-ins</p><p className="text-xs text-text-secondary mt-1">Ajustá los filtros o ampliá el período seleccionado.</p></div>}
    </Card>
    <p className="text-[11px] text-text-tertiary flex items-start gap-1.5"><CalendarDays className="w-3.5 h-3.5 shrink-0" />La prioridad es orientativa y se deriva de reglas visibles; no constituye un diagnóstico.</p>
  </div>;
}
