import { CalendarDays, CheckCircle2, Clock3, Video, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { useToast } from '../../../components/ui/Toast';
import type { Appointment, AppointmentModality, PracticeWeekday } from '../../../types';
import { useMock } from '../../provider';

const dayLabel = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
const slotLabel = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
const weekdayKey = (date: Date) => ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()] as PracticeWeekday;
const toInput = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

export function PatientAppointmentRequestPage() {
  const { currentDemoPatient, currentDemoNutritionist, professionalPracticeSettings, professionalAppointments, requestAppointmentByPatient } = useMock();
  const { showToast } = useToast();
  const [duration, setDuration] = useState<Appointment['durationMinutes']>(professionalPracticeSettings?.defaultDurationMinutes ?? 45);
  const [modality, setModality] = useState<AppointmentModality>('virtual');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [sent, setSent] = useState(false);
  const slots = useMemo(() => {
    if (!professionalPracticeSettings) return [] as Date[];
    const now = new Date(); const result: Date[] = []; const gap = professionalPracticeSettings.appointmentPolicy.gapMinutes;
    for (let offset = 1; offset <= 21; offset += 1) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
      const schedule = professionalPracticeSettings.workingDays.find(item => item.day === weekdayKey(date));
      if (!schedule?.enabled) continue;
      const intervals = schedule.intervals?.length ? schedule.intervals : [{ startTime: schedule.startTime, endTime: schedule.endTime }];
      for (const interval of intervals) {
        const [fromHour = 0, fromMinute = 0] = interval.startTime.split(':').map(Number); const [toHour = 0, toMinute = 0] = interval.endTime.split(':').map(Number);
        const from = fromHour * 60 + fromMinute; const until = toHour * 60 + toMinute;
        for (let minute = from; minute + duration <= until; minute += duration + gap) {
        const slot = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(minute / 60), minute % 60);
        const end = slot.getTime() + duration * 60_000;
        const blocked = professionalPracticeSettings.scheduleBlocks.some(block => slot.getTime() < new Date(block.endsAt).getTime() && end > new Date(block.startsAt).getTime());
        const overlaps = professionalAppointments.some(appointment => ['requested', 'confirmed'].includes(appointment.status) && slot.getTime() < new Date(appointment.startsAt).getTime() + appointment.durationMinutes * 60_000 + gap * 60_000 && end > new Date(appointment.startsAt).getTime() - gap * 60_000);
          if (!blocked && !overlaps) result.push(slot);
        }
      }
    }
    return result;
  }, [duration, professionalAppointments, professionalPracticeSettings]);
  const visibleSlots = slots.slice(0, 18);
  const request = () => { try { if (!selectedSlot) throw new Error('Elegí un horario para continuar.'); requestAppointmentByPatient({ startsAt: selectedSlot, durationMinutes: duration, modality }); setSent(true); showToast('Solicitud enviada', 'Tu nutricionista revisará el horario y te avisará desde NutriSoft.'); } catch (error) { showToast('No pudimos enviar la solicitud', error instanceof Error ? error.message : 'Reintentá.', 'error'); } };
  if (!currentDemoPatient || !currentDemoNutritionist) return null;
  if (sent) return <div className="pt-20 p-4 min-h-screen bg-bg-app"><Card className="max-w-md mx-auto text-center space-y-4 py-10"><span className="w-12 h-12 rounded-2xl bg-mint-soft text-success flex items-center justify-center mx-auto"><CheckCircle2 className="w-6 h-6" /></span><div><h1 className="text-xl font-bold text-text-primary">Solicitud enviada</h1><p className="text-sm text-text-secondary mt-2">Tu nutricionista debe confirmarla antes de que quede agendada.</p></div><Button asChild className="w-full"><Link to="/patient">Volver a mi inicio</Link></Button></Card></div>;
  return <div className="pt-20 pb-20 p-4 min-h-screen bg-bg-app"><div className="max-w-2xl mx-auto space-y-5"><Link to="/patient" className="inline-flex items-center min-h-10 text-sm font-semibold text-brand-strong hover:underline">← Volver al inicio</Link><div><div className="flex items-center gap-2"><CalendarDays className="w-6 h-6 text-brand-strong" /><h1 className="text-2xl font-bold text-text-primary">Solicitar una cita</h1></div><p className="text-sm text-text-secondary mt-1">Elegí una disponibilidad de {currentDemoNutritionist.name}. Tu solicitud requiere confirmación profesional.</p></div><Card className="space-y-4"><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label htmlFor="request-duration" className="form-label">Duración</label><select id="request-duration" className="form-control" value={duration} onChange={event => { setDuration(Number(event.target.value) as Appointment['durationMinutes']); setSelectedSlot(''); }}>{[15, 30, 45, 60, 75, 90].map(value => <option key={value} value={value}>{value} min</option>)}</select></div><div><p className="form-label">Modalidad</p><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setModality('virtual')} className={`min-h-10 rounded-xl border text-xs font-semibold ${modality === 'virtual' ? 'border-brand-strong bg-brand-soft text-brand-strong' : 'border-border-subtle bg-surface-subtle text-text-secondary'}`}><Video className="w-4 h-4 inline mr-1" />Virtual</button><button type="button" onClick={() => setModality('in_person')} className={`min-h-10 rounded-xl border text-xs font-semibold ${modality === 'in_person' ? 'border-brand-strong bg-brand-soft text-brand-strong' : 'border-border-subtle bg-surface-subtle text-text-secondary'}`}><MapPin className="w-4 h-4 inline mr-1" />Presencial</button></div></div></div><div className="flex items-center justify-between gap-3"><p className="text-sm font-bold text-text-primary">Horarios disponibles</p><Badge variant="neutral">Próximos 21 días</Badge></div>{visibleSlots.length === 0 ? <div className="rounded-xl bg-surface-subtle p-6 text-center text-sm text-text-secondary">No hay horarios disponibles con esta duración. Probá otra duración o volvé más tarde.</div> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">{visibleSlots.map(slot => { const value = toInput(slot); return <button key={value} type="button" onClick={() => setSelectedSlot(value)} className={`rounded-xl border p-3 text-left transition ${selectedSlot === value ? 'border-brand-strong bg-brand-soft shadow-sm' : 'border-border-subtle bg-surface hover:border-brand-strong'}`}><p className="text-xs font-bold text-text-primary capitalize">{dayLabel.format(slot)}</p><p className="text-sm text-brand-strong font-bold mt-1 inline-flex items-center gap-1"><Clock3 className="w-4 h-4" />{slotLabel.format(slot)}</p></button>; })}</div>}<p className="text-xs text-text-secondary">No se muestra el valor de la consulta. Si necesitás reprogramar o cancelar, tu nutricionista evaluará la solicitud según sus reglas de atención.</p><Button type="button" disabled={!selectedSlot} className="w-full" onClick={request}>Enviar solicitud de cita</Button></Card></div></div>;
}
