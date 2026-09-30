import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CalendarCheck2, CheckCircle2, CircleDollarSign, Loader2, MapPin, NotebookPen, Search, Video, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../auth/AuthProvider';
import { getSupabaseClient } from '../../../auth/supabase-client';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Dialog } from '../../../components/ui/Dialog';
import { useRealBranding } from '../../../components/domain/RealBranding';
import { publicEnvironment } from '../../../config/environment';

type Appointment = {
  id: string; patient_id: string; starts_at: string; time_zone: string; duration_minutes: number;
  modality: 'virtual' | 'in_person'; status: string; payment_status: string;
  billing_disposition: 'chargeable' | 'no_charge'; currency: string; quoted_amount: number;
  virtual_meeting_url: string | null;
};
type Patient = { id: string; first_name: string; last_name: string };
type PrivateNote = { appointment_id: string; note: string; updated_at: string };
type Period = 'all' | 'today' | 'week' | 'month' | 'custom';
type BillingDecision = 'no_charge' | 'pending';

const statusLabels: Record<string, string> = { requested: 'Solicitada', confirmed: 'Confirmada', completed: 'Completada', cancelled_by_patient: 'Cancelada por paciente', cancelled_by_professional: 'Cancelada por profesional', rescheduled: 'Reprogramada', no_show: 'Ausente' };
const paymentLabels: Record<string, string> = { pending: 'Pendiente', partial: 'Parcial', paid: 'Pagado', no_charge: 'Sin cargo', refunded: 'Reembolsado' };
const money = (amount: number, currency: string) => new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
const dayKey = (value: string, timeZone: string) => new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
const localDateKey = (value: Date) => new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(value);
const isTerminalWithBilling = (status: string) => ['cancelled_by_patient', 'cancelled_by_professional', 'no_show'].includes(status);

export function RealAppointmentsPage() {
  const { accessContext } = useAuth();
  const { activeOrganizationId } = useRealBranding();
  const organization = useMemo(() => accessContext?.memberships.find(m => m.organization_id === activeOrganizationId && m.role === 'nutritionist' && m.membership_status === 'active' && m.organization_status === 'active') ?? accessContext?.memberships.find(m => m.role === 'nutritionist' && m.membership_status === 'active' && m.organization_status === 'active') ?? null, [accessContext, activeOrganizationId]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [notes, setNotes] = useState<PrivateNote[]>([]);
  const [query, setQuery] = useState('');
  const [patientFilter, setPatientFilter] = useState('all');
  const [status, setStatus] = useState('all');
  const [payment, setPayment] = useState('all');
  const [modality, setModality] = useState('all');
  const [period, setPeriod] = useState<Period>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [noteAppointment, setNoteAppointment] = useState<Appointment | null>(null);
  const [noteText, setNoteText] = useState('');
  const [noteRevision, setNoteRevision] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);
  const [actionAppointment, setActionAppointment] = useState<Appointment | null>(null);
  const [actionDecision, setActionDecision] = useState<BillingDecision>('no_charge');
  const [actionAmount, setActionAmount] = useState('0');
  const [actionBusy, setActionBusy] = useState(false);

  const load = useCallback(async () => {
    if (!organization) { setLoading(false); return; }
    setLoading(true); setError('');
    const client = getSupabaseClient();
    const [appointmentResult, patientResult, noteResult] = await Promise.all([
      client.schema('api').from('appointments').select('id,patient_id,starts_at,time_zone,duration_minutes,modality,status,payment_status,billing_disposition,currency,quoted_amount,virtual_meeting_url').eq('organization_id', organization.organization_id).order('starts_at', { ascending: false }),
      client.schema('api').from('patient_directory').select('id,first_name,last_name').eq('organization_id', organization.organization_id).eq('status', 'active'),
      client.schema('api').from('professional_appointment_notes').select('appointment_id,note,updated_at').eq('organization_id', organization.organization_id),
    ]);
    if (appointmentResult.error || patientResult.error || noteResult.error) setError('No pudimos cargar las citas y sus notas privadas. Reintentá.');
    else {
      setAppointments((appointmentResult.data ?? []) as Appointment[]);
      setPatients((patientResult.data ?? []) as Patient[]);
      setNotes((noteResult.data ?? []) as PrivateNote[]);
    }
    setLoading(false);
  }, [organization]);
  useEffect(() => { void load(); }, [load]);

  const names = useMemo(() => new Map(patients.map(patient => [patient.id, `${patient.first_name} ${patient.last_name}`])), [patients]);
  const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const filtered = useMemo(() => {
    const now = new Date();
    const today = localDateKey(now);
    const weekStart = new Date(now.getTime() - 7 * 86_400_000);
    const weekEnd = new Date(now.getTime() + 7 * 86_400_000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return appointments.filter(item => {
      const name = (names.get(item.patient_id) ?? 'Paciente').toLowerCase();
      const appointmentDay = dayKey(item.starts_at, item.time_zone || localZone);
      const date = new Date(item.starts_at);
      const inPeriod = period === 'all'
        || (period === 'today' && appointmentDay === today)
        || (period === 'week' && date >= weekStart && date <= weekEnd)
        || (period === 'month' && date >= monthStart && date < monthEnd)
        || (period === 'custom' && (!from || appointmentDay >= from) && (!to || appointmentDay <= to));
      return (!query.trim() || name.includes(query.trim().toLowerCase()))
        && (patientFilter === 'all' || item.patient_id === patientFilter)
        && (status === 'all' || item.status === status)
        && (payment === 'all' || item.payment_status === payment)
        && (modality === 'all' || item.modality === modality)
        && inPeriod;
    });
  }, [appointments, from, localZone, modality, names, patientFilter, payment, period, query, status, to]);

  const openNote = (appointment: Appointment) => {
    const existing = notes.find(note => note.appointment_id === appointment.id);
    setNoteAppointment(appointment); setNoteText(existing?.note ?? ''); setNoteRevision(existing?.updated_at ?? null);
  };
  const saveNote = async () => {
    if (!noteAppointment) return;
    setSavingNote(true); setError('');
    const { error: saveError } = await getSupabaseClient().schema('api').rpc('save_appointment_private_note', { p_appointment_id: noteAppointment.id, p_note: noteText, ...(noteRevision ? { p_expected_updated_at: noteRevision } : {}) });
    if (saveError) setError('No pudimos guardar la nota. Actualizá las citas y volvé a intentar.');
    else { setNoteAppointment(null); await load(); }
    setSavingNote(false);
  };
  const openActions = (appointment: Appointment) => {
    setActionAppointment(appointment);
    setActionDecision(appointment.billing_disposition === 'no_charge' ? 'no_charge' : 'pending');
    setActionAmount(String(appointment.quoted_amount));
  };
  const syncCalendar = async (appointmentId: string) => {
    if (!publicEnvironment.supabaseUrl) return;
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session) throw new Error('Sesión vencida');
      const response = await fetch(new URL('/functions/v1/google-calendar-events', publicEnvironment.supabaseUrl), { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ appointment_id: appointmentId }) });
      if (!response.ok) throw new Error('Sincronización fallida');
    } catch { setError('La cita se guardó en Nutrify, pero no pudimos actualizar Google Calendar. Revisá Agenda para reintentar.'); }
  };
  const runAction = async (action: 'complete' | 'no_show' | 'cancel' | 'resolve_billing') => {
    if (!actionAppointment) return;
    setActionBusy(true); setError('');
    const api = getSupabaseClient().schema('api');
    let operation;
    if (action === 'cancel') operation = api.rpc('cancel_professional_appointment', { p_appointment_id: actionAppointment.id, p_billing_decision: actionDecision, ...(actionDecision === 'pending' ? { p_amount: Number(actionAmount) } : {}) });
    else if (action === 'resolve_billing') operation = api.rpc('resolve_appointment_billing', { p_appointment_id: actionAppointment.id, p_decision: actionDecision, ...(actionDecision === 'pending' ? { p_amount: Number(actionAmount) } : {}) });
    else operation = api.rpc('set_professional_appointment_outcome', { p_appointment_id: actionAppointment.id, p_status: action === 'complete' ? 'completed' : 'no_show', ...(action === 'no_show' ? { p_billing_decision: actionDecision, ...(actionDecision === 'pending' ? { p_amount: Number(actionAmount) } : {}) } : {}) });
    const { error: actionError } = await operation;
    if (actionError) { setError(actionError.message); setActionBusy(false); return; }
    const appointmentId = actionAppointment.id;
    setActionAppointment(null);
    await syncCalendar(appointmentId);
    await load();
    setActionBusy(false);
  };
  const clearFilters = () => { setQuery(''); setPatientFilter('all'); setStatus('all'); setPayment('all'); setModality('all'); setPeriod('all'); setFrom(''); setTo(''); };

  return <main className="mx-auto max-w-7xl space-y-5 p-4 sm:p-8">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><CalendarCheck2 className="h-6 w-6 text-brand-strong"/><h1 className="text-2xl font-bold">Citas</h1></div><p className="mt-1 text-sm text-text-secondary">Historial, cierre de citas, importe y notas privadas. Los horarios se gestionan desde Agenda.</p></div><Button asChild><Link to="/professional/agenda">Abrir Agenda <ArrowRight className="h-4 w-4"/></Link></Button></header>
    {error && <p role="alert" className="rounded-xl border border-critical/20 bg-critical/10 p-3 text-sm text-critical">{error}</p>}
    <Card className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_14rem_14rem]"><label className="relative"><span className="sr-only">Buscar paciente</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary"/><input className="form-control pl-10" placeholder="Buscar por paciente…" value={query} onChange={event => setQuery(event.target.value)}/></label>
        <select aria-label="Filtrar por paciente" className="form-control" value={patientFilter} onChange={event => setPatientFilter(event.target.value)}><option value="all">Todos los pacientes</option>{patients.toSorted((a,b) => a.last_name.localeCompare(b.last_name,'es')).map(patient => <option key={patient.id} value={patient.id}>{patient.first_name} {patient.last_name}</option>)}</select>
        <div className="flex flex-wrap gap-1 rounded-xl border border-border-subtle bg-surface-subtle p-1" aria-label="Período">{([['today','Hoy'],['week','7 días'],['month','Mes'],['custom','Personalizado'],['all','Todo']] as const).map(([value,label]) => <button key={value} type="button" aria-pressed={period===value} onClick={() => setPeriod(value)} className={`min-h-10 flex-1 rounded-lg px-2 text-xs font-semibold ${period===value?'bg-surface text-text-primary shadow-xs':'text-text-secondary'}`}>{label}</button>)}</div>
      </div>
      {period === 'custom' && <div className="grid gap-3 sm:grid-cols-2 sm:max-w-xl"><label className="form-label">Desde<input className="form-control mt-1" type="date" value={from} max={to||undefined} onChange={event=>setFrom(event.target.value)}/></label><label className="form-label">Hasta<input className="form-control mt-1" type="date" value={to} min={from||undefined} onChange={event=>setTo(event.target.value)}/></label></div>}
      <div className="grid gap-3 sm:grid-cols-3"><label className="form-label">Estado<select aria-label="Filtrar por estado" className="form-control mt-1" value={status} onChange={event=>setStatus(event.target.value)}><option value="all">Todos los estados</option>{Object.entries(statusLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label className="form-label">Pago<select aria-label="Filtrar por pago" className="form-control mt-1" value={payment} onChange={event=>setPayment(event.target.value)}><option value="all">Todos los pagos</option>{Object.entries(paymentLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label className="form-label">Modalidad<select aria-label="Filtrar por modalidad" className="form-control mt-1" value={modality} onChange={event=>setModality(event.target.value)}><option value="all">Todas las modalidades</option><option value="virtual">Virtual</option><option value="in_person">Presencial</option></select></label></div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-3"><p className="text-xs text-text-secondary">Fechas por zona horaria de cada cita · Mostrando {filtered.length} de {appointments.length}</p><Button variant="ghost" size="sm" onClick={clearFilters}>Limpiar filtros</Button></div>
    </Card>
    <Card className="overflow-hidden p-0"><div className="border-b border-border-subtle px-4 py-4 sm:px-5"><h2 className="font-bold">{filtered.length} {filtered.length===1?'cita':'citas'}</h2></div>
      {loading ? <div className="flex justify-center p-12"><Loader2 className="h-5 w-5 animate-spin text-text-secondary"/></div> : filtered.length===0 ? <p className="p-10 text-center text-sm text-text-secondary">No encontramos citas con estos filtros.</p> : <div className="divide-y divide-border-subtle">{filtered.map(item => <div key={item.id} className="flex flex-col gap-3 p-4 sm:p-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><p className="font-semibold">{names.get(item.patient_id)??'Paciente'}</p><p className="mt-1 text-xs text-text-secondary">{new Intl.DateTimeFormat('es-AR',{dateStyle:'medium',timeStyle:'short',timeZone:item.time_zone}).format(new Date(item.starts_at))} · {item.duration_minutes} min</p></div><div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">{item.modality==='virtual'?<Video className="h-4 w-4"/>:<MapPin className="h-4 w-4"/>}{item.modality==='virtual'?'Virtual':'Presencial'}<Badge variant={item.status==='confirmed'?'active':item.status==='completed'?'info':'neutral'}>{statusLabels[item.status]??item.status}</Badge><Badge variant={item.payment_status==='paid'?'active':item.payment_status==='no_charge'?'neutral':'pending'}>{paymentLabels[item.payment_status]??item.payment_status} · {money(item.quoted_amount,item.currency)}</Badge>{item.virtual_meeting_url&&<a className="text-brand-strong underline" href={item.virtual_meeting_url} target="_blank" rel="noreferrer">Meet</a>}</div></div><div className="flex flex-col gap-2 sm:flex-row sm:justify-end"><Button className="w-full sm:w-auto" size="sm" variant="secondary" onClick={()=>openActions(item)}><CircleDollarSign className="h-4 w-4"/>Acciones</Button><Button className="w-full sm:w-auto" size="sm" variant="secondary" onClick={()=>openNote(item)}><NotebookPen className="h-4 w-4"/>{notes.some(note=>note.appointment_id===item.id)?'Ver nota privada':'Agregar nota privada'}</Button></div></div>)}</div>}
    </Card>
    <Dialog isOpen={Boolean(actionAppointment)} onClose={()=>{if(!actionBusy)setActionAppointment(null);}} title="Acciones de la cita" description="Citas concentra el cierre y el importe. Agenda conserva la gestión de horarios."><div className="space-y-4">{actionAppointment&&<><div className="rounded-xl bg-surface-subtle p-3"><p className="font-semibold">{names.get(actionAppointment.patient_id)??'Paciente'}</p><p className="mt-1 text-xs text-text-secondary">{new Intl.DateTimeFormat('es-AR',{dateStyle:'medium',timeStyle:'short',timeZone:actionAppointment.time_zone}).format(new Date(actionAppointment.starts_at))} · {statusLabels[actionAppointment.status]??actionAppointment.status}</p></div>
      {actionAppointment.status==='requested'&&<div className="rounded-xl border border-border-subtle p-3 text-sm">Esta solicitud se confirma desde Agenda. Si la vas a cancelar, definí el importe abajo.<Link className="ml-1 font-semibold text-brand-strong underline" to="/professional/agenda">Abrir Agenda</Link></div>}
      {actionAppointment.status==='confirmed'&&<>{new Date(actionAppointment.starts_at)>new Date()&&<p className="text-xs text-text-secondary">Completar o marcar ausencia estará disponible cuando comience la cita.</p>}<div className="grid gap-2 sm:grid-cols-2"><Button disabled={actionBusy||new Date(actionAppointment.starts_at)>new Date()} onClick={()=>void runAction('complete')}><CheckCircle2 className="h-4 w-4"/>Marcar completada</Button><Button variant="secondary" disabled={actionBusy||new Date(actionAppointment.starts_at)>new Date()} onClick={()=>void runAction('no_show')}><AlertTriangle className="h-4 w-4"/>Marcar ausencia</Button></div></>}
      {['confirmed','requested'].includes(actionAppointment.status)&&<fieldset className="space-y-3 rounded-xl border border-border-subtle p-3"><legend className="px-1 text-sm font-semibold">Cancelar · decisión de importe</legend><label className="flex min-h-11 items-center gap-2 text-sm"><input type="radio" name="citas-cancel-billing" checked={actionDecision==='no_charge'} onChange={()=>setActionDecision('no_charge')}/>Sin cargo</label><label className="flex min-h-11 items-center gap-2 text-sm"><input type="radio" name="citas-cancel-billing" checked={actionDecision==='pending'} onChange={()=>setActionDecision('pending')}/>Dejar pendiente</label>{actionDecision==='pending'&&<label className="form-label">Importe pendiente ({actionAppointment.currency})<input className="form-control mt-1" type="number" min="0" value={actionAmount} onChange={event=>setActionAmount(event.target.value)}/></label>}<Button variant="destructive" className="w-full" disabled={actionBusy||actionDecision==='pending'&&(!actionAmount||Number(actionAmount)<0)} onClick={()=>void runAction('cancel')}><XCircle className="h-4 w-4"/>Cancelar cita</Button></fieldset>}
      {isTerminalWithBilling(actionAppointment.status)&&<fieldset className="space-y-3 rounded-xl border border-border-subtle p-3"><legend className="px-1 text-sm font-semibold">Resolver el importe</legend><p className="text-xs text-text-secondary">Estado actual: {actionAppointment.billing_disposition==='no_charge'?'Sin cargo':`Pendiente · ${money(actionAppointment.quoted_amount,actionAppointment.currency)}`}. Nutrify sólo registra la decisión.</p><label className="flex min-h-11 items-center gap-2 text-sm"><input type="radio" name="citas-resolve-billing" checked={actionDecision==='no_charge'} onChange={()=>setActionDecision('no_charge')}/>Sin cargo</label><label className="flex min-h-11 items-center gap-2 text-sm"><input type="radio" name="citas-resolve-billing" checked={actionDecision==='pending'} onChange={()=>setActionDecision('pending')}/>Dejar pendiente</label>{actionDecision==='pending'&&<label className="form-label">Importe pendiente ({actionAppointment.currency})<input className="form-control mt-1" type="number" min="0" value={actionAmount} onChange={event=>setActionAmount(event.target.value)}/></label>}<Button variant="secondary" className="w-full" disabled={actionBusy} onClick={()=>void runAction('resolve_billing')}><CircleDollarSign className="h-4 w-4"/>Guardar decisión</Button></fieldset>}
      {actionAppointment.status==='completed'&&<p className="text-sm text-text-secondary">La cita está completada. El estado ya no se puede modificar aquí.</p>}{actionAppointment.status==='rescheduled'&&<p className="text-sm text-text-secondary">Esta cita fue sustituida por una reprogramación. El historial se conserva y el nuevo horario se gestiona desde Agenda.</p>}</>}{error&&<p role="alert" className="text-sm text-critical">{error}</p>}<Button className="w-full" variant="ghost" disabled={actionBusy} onClick={()=>setActionAppointment(null)}>Cerrar</Button></div></Dialog>
    <Dialog isOpen={Boolean(noteAppointment)} onClose={()=>setNoteAppointment(null)} title="Nota clínica privada" description="Sólo vos, como profesional asignado, podés consultar esta nota. No es visible para el paciente ni para el administrador global."><div className="space-y-4"><p className="text-sm font-semibold">{noteAppointment&&names.get(noteAppointment.patient_id)} · {noteAppointment&&new Intl.DateTimeFormat('es-AR',{dateStyle:'medium',timeStyle:'short',timeZone:noteAppointment.time_zone}).format(new Date(noteAppointment.starts_at))}</p><label className="form-label">Nota de consulta<textarea className="form-control mt-1 min-h-40 resize-y" maxLength={5000} value={noteText} onChange={event=>setNoteText(event.target.value)} placeholder="Escribí una nota clínica privada…"/><span className="mt-1 block text-right text-xs text-text-secondary">{noteText.length}/5000</span></label><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={()=>setNoteAppointment(null)}>Cancelar</Button><Button disabled={savingNote||!noteText.trim()} onClick={()=>void saveNote()}>{savingNote?'Guardando…':'Guardar nota privada'}</Button></div></div></Dialog>
  </main>;
}
