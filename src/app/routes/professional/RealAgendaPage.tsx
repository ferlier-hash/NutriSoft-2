import { RealScheduleSettings } from '../../../components/domain/RealScheduleSettings';
import { CalendarDays, CheckCircle2, ExternalLink, Loader2, Pencil, Plus, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../auth/AuthProvider';
import { getSupabaseClient } from '../../../auth/supabase-client';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Dialog } from '../../../components/ui/Dialog';
import { publicEnvironment } from '../../../config/environment';
import { useRealBranding } from '../../../components/domain/RealBranding';

type Appointment = { id: string; patient_id: string; starts_at: string; ends_at: string; duration_minutes: number; time_zone: string; modality: 'virtual' | 'in_person'; status: string; quoted_amount: number; currency: string; payment_status: string; virtual_meeting_url: string | null; google_calendar_conflict_detected_at: string | null };
type Patient = { id: string; first_name: string; last_name: string; status: string };
type ChangeRequest = { is_late: boolean; notice_hours: number; id: string; appointment_id: string; patient_id: string; kind: 'cancel' | 'reschedule'; requested_starts_at: string | null; requested_duration_minutes: number | null; requested_modality: string | null; created_at: string; quoted_amount: number; currency: string };
type FormState = { patientId: string; startsAt: string; duration: number; modality: 'virtual' | 'in_person'; amount: string };
type AppointmentPreferences = { currency: string; durationMinutes: number; virtualPrice: number; inPersonPrice: number };
const durations = [15, 30, 45, 60, 75, 90];
const timeZone = 'America/Argentina/Cordoba';
const fallbackPreferences: AppointmentPreferences = { currency: 'ARS', durationMinutes: 45, virtualPrice: 0, inPersonPrice: 0 };
const localValue = (value: Date) => new Date(value.getTime() - value.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
const dateText = (value: string) => new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export function RealAgendaPage() {
  const { accessContext } = useAuth();
  const { activeOrganizationId } = useRealBranding();
  const organization = useMemo(() => accessContext?.memberships.find((item) => item.organization_id === activeOrganizationId && item.role === 'nutritionist' && item.membership_status === 'active' && item.organization_status === 'active') ?? accessContext?.memberships.find((item) => item.role === 'nutritionist' && item.membership_status === 'active' && item.organization_status === 'active') ?? null, [accessContext, activeOrganizationId]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'create' | 'edit' | null>(null);
  const [active, setActive] = useState<Appointment | null>(null);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<AppointmentPreferences>(fallbackPreferences);
  const [form, setForm] = useState<FormState>({ patientId: '', startsAt: localValue(new Date(Date.now() + 86_400_000)), duration: 45, modality: 'virtual', amount: '0' });

  const patientName = (id: string) => { const patient = patients.find((item) => item.id === id); return patient ? `${patient.first_name} ${patient.last_name}` : 'Paciente'; };
  const load = useCallback(async () => {
    if (!organization) return;
    setLoading(true); setError(null);
    const client = getSupabaseClient();
    const [appointmentResult, patientResult, requestResult, preferenceResult] = await Promise.all([
      client.schema('api').from('appointments').select('id,patient_id,starts_at,ends_at,duration_minutes,time_zone,modality,status,quoted_amount,currency,payment_status,virtual_meeting_url,google_calendar_conflict_detected_at').eq('organization_id', organization.organization_id).order('starts_at', { ascending: true }),
      client.schema('api').from('patient_directory').select('id,first_name,last_name,status').eq('organization_id', organization.organization_id).eq('status', 'active').order('last_name'),
      client.schema('api').from('professional_pending_appointment_changes').select('*').order('created_at', { ascending: false }),
      client.schema('api').rpc('get_my_appointment_preferences', { p_org: organization.organization_id }),
    ]);
    if (appointmentResult.error || patientResult.error || requestResult.error) setError('No pudimos cargar Agenda. Actualizá la página o reintentá.');
    else {
      setAppointments((appointmentResult.data ?? []) as Appointment[]); setPatients((patientResult.data ?? []) as Patient[]); setChangeRequests((requestResult.data ?? []) as ChangeRequest[]);
      const value = preferenceResult.data as Partial<AppointmentPreferences> | null;
      if (!preferenceResult.error && value && typeof value.currency === 'string' && typeof value.durationMinutes === 'number' && typeof value.virtualPrice === 'number' && typeof value.inPersonPrice === 'number') setPreferences(value as AppointmentPreferences);
    }
    setLoading(false);
  }, [organization]);
  useEffect(() => { void load(); }, [load]);

  const sync = async (appointmentId: string) => {
    if (!publicEnvironment.supabaseUrl) return;
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session) throw new Error('Sesión vencida');
      const response = await fetch(new URL('/functions/v1/google-calendar-events', publicEnvironment.supabaseUrl), { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ appointment_id: appointmentId }) });
      const payload = await response.json() as { message?: string; state?: string };
      if (!response.ok) throw new Error(payload.message || 'No pudimos sincronizar con Google.');
      if (payload.state === 'not_configured') throw new Error(payload.message || 'Elegí un calendario en Configuración.');
      if (payload.state === 'synced_with_conflict') setError('Esta cita coincide con una ocupación de Google Calendar. La cita de Nutrify se conserva: revisá tu calendario para decidir cómo continuar.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos sincronizar con Google.'); }
    finally { /* La interfaz conserva la cita local aun si Google no responde. */ }
  };
  const openCreate = () => { setActive(null); setForm({ patientId: patients[0]?.id ?? '', startsAt: localValue(new Date(Date.now() + 86_400_000)), duration: preferences.durationMinutes, modality: 'virtual', amount: String(preferences.virtualPrice) }); setDialog('create'); };
  const openEdit = (appointment: Appointment) => { setActive(appointment); setForm({ patientId: appointment.patient_id, startsAt: localValue(new Date(appointment.starts_at)), duration: appointment.duration_minutes, modality: appointment.modality, amount: String(appointment.quoted_amount) }); setDialog('edit'); };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!organization) return; setSaving(true); setError(null);
    const args = { p_starts_at: new Date(form.startsAt).toISOString(), p_duration_minutes: form.duration, p_time_zone: timeZone, p_modality: form.modality, p_quoted_amount: Number(form.amount) };
    const client = getSupabaseClient();
    const result = active ? await client.schema('api').rpc('update_professional_appointment', { p_appointment_id: active.id, ...args }) : await client.schema('api').rpc('create_professional_appointment', { p_org_id: organization.organization_id, p_patient_id: form.patientId, ...args, p_currency: preferences.currency });
    if (result.error || !result.data) { setError(result.error?.message || 'No pudimos guardar la cita.'); setSaving(false); return; }
    const id = active ? active.id : result.data as string; setDialog(null); setSaving(false); await sync(id); await load();
  };
  const submitReprogram = async (event: React.FormEvent) => {
    event.preventDefault(); if (!active) return; setSaving(true); setError(null);
    const { data, error: rpcError } = await getSupabaseClient().schema('api').rpc('reschedule_professional_appointment', { p_appointment_id: active.id, p_starts_at: new Date(form.startsAt).toISOString(), p_duration_minutes: form.duration, p_modality: form.modality, p_quoted_amount: Number(form.amount) });
    if (rpcError || !data) setError(rpcError?.message || 'No pudimos reprogramar la cita.'); else { setDialog(null); await sync(active.id); await sync(data as string); await load(); }
    setSaving(false);
  };
  const resolveChange = async (request: ChangeRequest, decision: 'approved' | 'rejected', billingDecision?: 'no_charge' | 'pending') => {
    setSaving(true); setError(null);
    const { data: resultingId, error: rpcError } = await getSupabaseClient().schema('api').rpc('resolve_patient_appointment_change', { p_request_id: request.id, p_decision: decision, ...(billingDecision ? { p_billing_decision: billingDecision } : {}) });
    if (rpcError) setError(rpcError.message); else { await sync(request.appointment_id); if (typeof resultingId === 'string' && resultingId !== request.appointment_id) await sync(resultingId); await load(); }
    setSaving(false);
  };
  const confirmRequest = async () => {
    if (!active || active.status !== 'requested') return;
    setSaving(true); setError(null);
    const { error: rpcError } = await getSupabaseClient().schema('api').rpc('confirm_patient_requested_appointment', { p_appointment_id: active.id, p_quoted_amount: Number(form.amount) });
    if (rpcError) setError('No pudimos confirmar la cita. Actualizá Agenda e intentá de nuevo.');
    else { setDialog(null); await sync(active.id); await load(); }
    setSaving(false);
  };

  const activeAppointments = appointments.filter((appointment) => ['requested', 'confirmed'].includes(appointment.status));
  const requestedScheduleChanged = Boolean(active?.status === 'requested' && (form.startsAt !== localValue(new Date(active.starts_at)) || form.duration !== active.duration_minutes || form.modality !== active.modality));
  return <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="flex items-center gap-2"><CalendarDays className="h-6 w-6 text-brand-strong" /><h1 className="text-2xl font-bold text-text-primary">Agenda</h1></div><p className="mt-1 text-sm text-text-secondary">Tus turnos se guardan primero en Nutrify y se reflejan en Google Calendar.</p></div><Button className="w-full sm:w-auto" onClick={openCreate} disabled={loading || patients.length === 0} title={patients.length === 0 ? 'Primero necesitás un paciente activo asignado.' : undefined}><Plus className="h-4 w-4" />Nueva cita</Button></div>
    {organization && <details className="rounded-2xl border border-border-subtle bg-surface p-4"><summary className="cursor-pointer min-h-11 font-semibold text-sm">Horarios, bloqueos y vacaciones</summary><RealScheduleSettings organizationId={organization.organization_id}/></details>}
    <Card highlighted className="flex gap-3 text-sm text-text-secondary"><CheckCircle2 className="h-5 w-5 shrink-0 text-success" /><p><b className="text-text-primary">Sincronización segura.</b> Los eventos de Google no incluyen nombre del paciente ni notas clínicas. Las ocupaciones externas bloquean la disponibilidad y, si coinciden con una cita ya guardada, te lo indicamos sin modificarla. Si Google falla, tu cita queda guardada y podés reintentar.</p></Card>
    {error && <p role="alert" className="rounded-xl border border-critical/20 bg-critical/10 p-3 text-sm text-critical">{error}</p>}
    {changeRequests.length > 0 && <Card className="space-y-3"><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold text-text-primary">Solicitudes de pacientes</h2><p className="mt-1 text-xs text-text-secondary">La cita original se conserva hasta que tomes una decisión.</p></div><Badge variant="info">{changeRequests.length}</Badge></div><div className="divide-y divide-border-subtle">{changeRequests.map((request) => <div key={request.id} className="space-y-2 py-3"><p className="text-sm font-semibold text-text-primary">{patientName(request.patient_id)} · {request.kind === 'cancel' ? 'Solicita cancelación' : 'Solicita reprogramación'}</p>{request.is_late && <Badge variant="medium">Fuera de plazo · {request.notice_hours} h</Badge>}<p className="text-xs text-text-secondary">{request.kind === 'cancel' ? 'La cancelación requiere definir el cobro.' : `Propone ${request.requested_starts_at ? dateText(request.requested_starts_at) : 'un nuevo horario'} · ${request.requested_modality === 'virtual' ? 'Virtual' : 'Presencial'}.`}</p><div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">{request.kind === 'cancel' ? <><Button size="sm" className="w-full sm:w-auto" variant="secondary" disabled={saving} onClick={() => void resolveChange(request, 'approved', 'no_charge')}>Aprobar sin cargo</Button><Button size="sm" className="w-full sm:w-auto" disabled={saving} onClick={() => void resolveChange(request, 'approved', 'pending')}>Aprobar y dejar pendiente</Button></> : <Button size="sm" className="w-full sm:w-auto" disabled={saving} onClick={() => void resolveChange(request, 'approved')}>Aprobar reprogramación</Button>}<Button size="sm" className="w-full sm:w-auto" variant="ghost" disabled={saving} onClick={() => void resolveChange(request, 'rejected')}>Rechazar</Button></div></div>)}</div></Card>}
    <Card className="overflow-hidden p-0"><div className="border-b border-border-subtle px-5 py-4"><h2 className="font-bold text-text-primary">Próximas citas</h2><p className="mt-1 text-xs text-text-secondary">Agenda gestiona horarios, confirmaciones y reprogramaciones. El cierre o cancelación se realiza desde Citas.</p></div>{loading ? <div className="flex justify-center p-12 text-text-secondary"><Loader2 className="h-5 w-5 animate-spin" /></div> : patients.length === 0 ? <div className="p-10 text-center"><p className="font-semibold text-text-primary">Todavía no tenés pacientes activos asignados.</p><p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">Para crear una cita real primero debe existir un paciente vinculado a tu consultorio y a tu perfil profesional. La próxima ventana incorpora invitaciones y aceptación de cuenta.</p></div> : activeAppointments.length === 0 ? <p className="p-12 text-center text-sm text-text-secondary">Todavía no hay citas activas.</p> : <div className="divide-y divide-border-subtle">{activeAppointments.map((appointment) => <button type="button" key={appointment.id} onClick={() => openEdit(appointment)} className="flex w-full flex-col items-stretch gap-3 px-4 py-4 text-left hover:bg-surface-subtle sm:flex-row sm:items-center sm:justify-between sm:px-5"><div className="min-w-0"><p className="font-semibold text-text-primary">{patientName(appointment.patient_id)}</p><p className="mt-1 text-xs leading-relaxed text-text-secondary">{dateText(appointment.starts_at)} · {appointment.duration_minutes} min · {appointment.modality === 'virtual' ? 'Virtual' : 'Presencial'}</p></div><div className="flex flex-wrap items-center gap-2 sm:justify-end">{appointment.virtual_meeting_url && <Badge variant="info">Meet listo</Badge>}{appointment.google_calendar_conflict_detected_at && <Badge variant="medium">Conflicto Google</Badge>}<Badge variant={appointment.status === 'confirmed' ? 'active' : 'info'}>{appointment.status === 'confirmed' ? 'Confirmada' : 'Solicitada'}</Badge><span className="ml-auto text-text-tertiary sm:ml-0">›</span></div></button>)}</div>}</Card>
    <Dialog isOpen={dialog === 'create' || dialog === 'edit'} onClose={() => setDialog(null)} title={active ? `Cita · ${patientName(active.patient_id)}` : 'Nueva cita'} description={active?.status === 'requested' ? 'El paciente pidió este turno. Guardá primero cualquier cambio de horario y después confirmá el turno.' : active ? 'Podés guardar una corrección o reprogramarla como una nueva cita vinculada.' : 'Las citas creadas por la profesional quedan confirmadas.'}>
      <form onSubmit={save} className="space-y-4">{error && <p role="alert" className="text-sm text-critical">{error}</p>}{active?.status === 'requested'&&<p className="rounded-xl bg-brand-soft p-3 text-sm text-text-primary">Solicitud pendiente del paciente. Guardar cambios no la confirma.{requestedScheduleChanged&&<span className="mt-1 block font-semibold">Guardá el horario actualizado antes de confirmar.</span>}</p>}<p className="text-xs text-text-secondary">Horario de este dispositivo: {Intl.DateTimeFormat().resolvedOptions().timeZone}. Se valida contra tus franjas y bloqueos guardados.</p><label className="block text-sm font-medium text-text-primary">Paciente<select disabled={Boolean(active)} value={form.patientId} onChange={(event) => setForm({ ...form, patientId: event.target.value })} className="mt-1 w-full rounded-xl border border-border-subtle bg-surface-subtle px-3 py-2.5" required>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.first_name} {patient.last_name}</option>)}</select></label><label className="block text-sm font-medium text-text-primary">Fecha y hora<input type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} className="mt-1 w-full rounded-xl border border-border-subtle bg-surface-subtle px-3 py-2.5" required /></label><div className="grid gap-3 sm:grid-cols-3"><label className="text-sm font-medium text-text-primary">Duración<select value={form.duration} onChange={(event) => setForm({ ...form, duration: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-border-subtle bg-surface-subtle px-3 py-2.5">{durations.map((duration) => <option key={duration}>{duration}</option>)}</select></label><label className="text-sm font-medium text-text-primary">Modalidad<select value={form.modality} onChange={(event) => { const modality = event.target.value as FormState['modality']; setForm({ ...form, modality, ...(!active ? { amount: String(modality === 'virtual' ? preferences.virtualPrice : preferences.inPersonPrice) } : {}) }); }} className="mt-1 w-full rounded-xl border border-border-subtle bg-surface-subtle px-3 py-2.5"><option value="virtual">Virtual</option><option value="in_person">Presencial</option></select></label><label className="text-sm font-medium text-text-primary">Importe ({active?.currency ?? preferences.currency})<input type="number" min="0" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className="mt-1 w-full rounded-xl border border-border-subtle bg-surface-subtle px-3 py-2.5" required /></label></div>{active?.virtual_meeting_url && <a href={active.virtual_meeting_url} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-between rounded-xl border border-brand-primary/30 bg-brand-soft px-3 text-sm font-semibold text-brand-strong hover:bg-surface"><span>Acceder a Google Meet</span><ExternalLink className="h-4 w-4" /></a>}<div className="flex flex-wrap justify-between gap-2 pt-2">{active ? <div className="flex flex-wrap gap-2">{active.status === 'requested'&&<Button type="button" size="sm" disabled={saving||requestedScheduleChanged} onClick={()=>void confirmRequest()}><CheckCircle2 className="h-4 w-4" />Confirmar solicitud</Button>}<Button type="button" variant="secondary" size="sm" onClick={submitReprogram}><RefreshCw className="h-4 w-4" />Reprogramar</Button></div> : <span /> }<Button type="submit" disabled={saving}>{saving ? 'Guardando…' : <><Pencil className="h-4 w-4" />Guardar</>}</Button></div></form>
    </Dialog>
  </main>;
}
