import {useEffect,useState} from 'react';
import {z} from 'zod';
import {getSupabaseClient} from '../../auth/supabase-client';

export function PatientAppointmentPolicy({appointmentId,startsAt,kind}:{appointmentId:string;startsAt:string;kind:'cancel'|'reschedule'}) {
 const [hours,setHours]=useState<number|null>(null),[error,setError]=useState(false);
 useEffect(()=>{let active=true;setHours(null);setError(false);
 Promise.resolve(getSupabaseClient().schema('api').rpc('get_patient_appointment_policy',{p_appointment:appointmentId})).then(({data,error:problem})=>{
  if(!active)return;const result=z.object({cancellationNoticeHours:z.number(),rescheduleNoticeHours:z.number()}).safeParse(data);
  if(problem||!result.success){setError(true);return;}setHours(kind==='cancel'?result.data.cancellationNoticeHours:result.data.rescheduleNoticeHours);
 }).catch(()=>{if(active)setError(true);});return()=>{active=false;};},[appointmentId,kind]);
 if(error)return <p className="text-sm text-text-secondary">No pudimos consultar el plazo. Tu profesional revisará la solicitud igualmente.</p>;
 if(hours===null)return <p role="status" className="text-sm text-text-secondary">Consultando plazo…</p>;
 const late=Date.parse(startsAt)-Date.now()<hours*3600000;
 return <p className="rounded-xl bg-surface-subtle p-3 text-sm" role="status">{hours===0?'No hay un plazo mínimo de anticipación.':`Plazo habitual: ${hours} horas antes de la cita.`} {late?'Estás fuera de plazo, pero podés enviar la solicitud tardía para que tu profesional la evalúe.':'La solicitud requiere aprobación profesional.'} No se modifica tu cita ni se genera un cobro automáticamente.</p>;
}
