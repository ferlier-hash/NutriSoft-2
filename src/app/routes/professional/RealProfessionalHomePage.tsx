import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, CalendarDays, CheckCircle2, ChevronRight, ClipboardCheck, ClipboardList, Inbox, Scale, Users } from 'lucide-react';
import { loadDaily, type DailyData } from '../../../data/supabase/daily-followup.repository';
import { getSupabaseClient } from '../../../auth/supabase-client';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';

const empty: DailyData = { patients: [], weights: [], checkins: [], lists: [], tasks: [], phrases: [], assignments: [] };
type Appointment = { id: string; patient_id: string; starts_at: string; modality: string; status: string };
type Attention = { id: string; patient_id: string | null; patient_first_name: string | null; patient_last_name: string | null; priority: string | null; rule_code: string | null; created_at: string | null };
type RecentItem = { id: string; patientId: string; title: string; detail: string; date: string; icon: typeof Activity };

const alertReasons: Record<string, string> = {
  CUSTOM_CHECKIN: 'Respuesta señalada por tus reglas', LOW_ENERGY: 'Energía baja registrada',
  LOW_ADHERENCE: 'Dificultad para seguir el plan', HELP_REQUESTED: 'Solicitó ayuda', DELAYED_CHECKIN: 'Check-in pendiente',
};
const formatDate = (value: string) => new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export function RealProfessionalHomePage() {
  const [daily, setDaily] = useState<DailyData>(empty);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentCount, setAppointmentCount] = useState(0);
  const [attention, setAttention] = useState<Attention[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const api = getSupabaseClient().schema('api');
    void Promise.all([
      loadDaily(),
      api.from('appointments').select('id,patient_id,starts_at,modality,status', { count: 'exact' }).in('status', ['requested', 'confirmed']).gte('starts_at', new Date().toISOString()).order('starts_at').limit(3),
      api.from('attention_inbox').select('id,patient_id,patient_first_name,patient_last_name,priority,rule_code,created_at').in('status', ['unresolved', 'acknowledged']).order('created_at', { ascending: false }).limit(12),
    ]).then(([dailyResult, appointmentResult, attentionResult]) => {
      if (!active) return;
      if (appointmentResult.error || attentionResult.error) throw appointmentResult.error ?? attentionResult.error;
      setDaily(dailyResult);
      setAppointments((appointmentResult.data ?? []) as Appointment[]);
      setAppointmentCount(appointmentResult.count ?? appointmentResult.data?.length ?? 0);
      setAttention((attentionResult.data ?? []) as Attention[]);
    }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const patientName = (id: string) => {
    const patient = daily.patients.find(item => item.id === id);
    return patient ? `${patient.first_name} ${patient.last_name}` : 'Paciente';
  };
  const patientsToReview = useMemo(() => Array.from(new Map(attention.filter(item => item.patient_id).map(item => [item.patient_id, item])).values()).slice(0, 4), [attention]);
  const helpRequests = attention.filter(item => item.rule_code === 'HELP_REQUESTED').length;
  const recent = useMemo<RecentItem[]>(() => [
    ...daily.checkins.filter(item => item.submitted_at).map(item => ({ id: `checkin-${item.id}`, patientId: item.patient_id, title: 'Respondió un check-in', detail: item.help_requested ? 'Incluye un pedido de ayuda' : 'Nueva respuesta disponible', date: item.submitted_at!, icon: ClipboardCheck })),
    ...daily.weights.map(item => ({ id: `weight-${item.id}`, patientId: item.patient_id, title: 'Registró su peso', detail: `${item.weight_kg.toLocaleString('es-AR')} kg`, date: item.created_at, icon: Scale })),
    ...daily.tasks.map(item => ({ id: `task-${item.list_id}-${item.task_id}`, patientId: item.patient_id, title: item.completed ? 'Completó un próximo paso' : 'Actualizó un próximo paso', detail: item.comment ? 'Agregó un comentario' : 'Actividad en su lista', date: item.updated_at, icon: CheckCircle2 })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5), [daily]);

  return <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6 lg:p-8">
    <header><p className="text-xs font-semibold uppercase tracking-wide text-brand-strong">Espacio profesional</p><h1 className="mt-1 text-2xl font-bold">Inicio</h1><p className="mt-1 text-sm text-text-secondary">Lo más importante para organizar tu jornada.</p></header>
    {error && <Card className="border-semantic-warning/30 bg-semantic-warning/5"><p role="alert" className="text-sm">Parte del resumen no pudo actualizarse. Las secciones individuales siguen disponibles.</p></Card>}
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumen del día">
      {[{ label: 'Pacientes activos', value: daily.patients.length, Icon: Users, to: '/professional/patients' }, { label: 'Requieren atención', value: patientsToReview.length, Icon: AlertTriangle, to: '/professional/inbox' }, { label: 'Pedidos de ayuda', value: helpRequests, Icon: Activity, to: '/professional/inbox' }, { label: 'Próximas citas', value: appointmentCount, Icon: CalendarDays, to: '/professional/agenda' }].map(({ label, value, Icon, to }) => <Link key={label} to={to} className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong"><Card className="h-full !p-4"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand-strong"><Icon className="h-4 w-4"/></span><strong className="mt-3 block text-2xl">{loading ? '—' : value}</strong><span className="text-xs text-text-secondary">{label}</span></Card></Link>)}
    </section>

    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
      <Card className="space-y-3"><div className="flex items-center justify-between gap-3"><div><h2 className="font-bold">Pacientes que requieren atención</h2><p className="text-xs text-text-secondary">Avisos pendientes o en revisión.</p></div><Link className="inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-brand-strong" to="/professional/inbox">Ver bandeja</Link></div>
        {patientsToReview.length ? patientsToReview.map(item => <Link key={item.patient_id} to={`/professional/patients/${item.patient_id}?tab=checkins`} className="flex min-h-14 items-center justify-between gap-3 border-t border-border-subtle py-2"><span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><b className="truncate text-sm">{item.patient_first_name} {item.patient_last_name}</b>{item.priority === 'high' && <Badge variant="high">Prioridad alta</Badge>}</span><span className="mt-0.5 block text-xs text-text-secondary">{alertReasons[item.rule_code ?? ''] ?? 'Tiene un aviso para revisar'}</span></span><ChevronRight className="h-4 w-4 shrink-0 text-text-tertiary"/></Link>) : <p className="rounded-xl bg-surface-subtle p-4 text-sm text-text-secondary">No hay pacientes con avisos pendientes.</p>}
      </Card>

      <Card className="space-y-3"><div className="flex items-center justify-between gap-3"><div><h2 className="font-bold">Próxima cita</h2><p className="text-xs text-text-secondary">Solicitadas y confirmadas.</p></div><Link className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-strong" to="/professional/agenda">Ver agenda</Link></div>{appointments.length ? appointments.map(item => <Link key={item.id} to="/professional/agenda" className="flex min-h-14 items-center justify-between gap-3 border-t border-border-subtle py-2"><span><b className="block text-sm">{patientName(item.patient_id)}</b><span className="text-xs text-text-secondary">{formatDate(item.starts_at)} · {item.modality === 'virtual' ? 'Virtual' : 'Presencial'}</span></span><ChevronRight className="h-4 w-4 shrink-0 text-text-tertiary"/></Link>) : <p className="rounded-xl bg-surface-subtle p-4 text-sm text-text-secondary">No hay citas próximas.</p>}</Card>
    </div>

    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <Card className="space-y-3"><div className="flex items-center justify-between gap-3"><div><h2 className="font-bold">Actividad reciente</h2><p className="text-xs text-text-secondary">Últimos registros de tus pacientes.</p></div><Link className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-strong" to="/professional/followup">Ver seguimiento</Link></div>
        {recent.length ? recent.map(item => { const Icon = item.icon; return <Link key={item.id} to={`/professional/patients/${item.patientId}`} className="flex min-h-14 items-center gap-3 border-t border-border-subtle py-2"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-subtle text-brand-strong"><Icon className="h-4 w-4"/></span><span className="min-w-0 flex-1"><b className="block truncate text-sm">{patientName(item.patientId)} · {item.title}</b><span className="block truncate text-xs text-text-secondary">{item.detail} · {formatDate(item.date)}</span></span><ChevronRight className="h-4 w-4 shrink-0 text-text-tertiary"/></Link>; }) : <p className="rounded-xl bg-surface-subtle p-4 text-sm text-text-secondary">Todavía no hay actividad reciente.</p>}
      </Card>
      <Card className="space-y-3"><h2 className="font-bold">Acciones rápidas</h2>{[{ label: 'Revisar seguimiento', to: '/professional/followup', Icon: Activity }, { label: 'Invitar paciente', to: '/professional/patients', Icon: Users }, { label: 'Crear plan alimentario', to: '/professional/meal-plans', Icon: ClipboardList }, { label: 'Abrir bandeja', to: '/professional/inbox', Icon: Inbox }].map(({ label, to, Icon }) => <Link key={label} to={to} className="flex min-h-12 items-center justify-between rounded-xl px-3 text-sm font-semibold hover:bg-surface-subtle"><span className="flex items-center gap-3"><Icon className="h-4 w-4 text-brand-strong"/>{label}</span><ChevronRight className="h-4 w-4 text-text-tertiary"/></Link>)}</Card>
    </div>
  </main>;
}
