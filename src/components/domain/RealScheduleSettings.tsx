import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Plus, Trash2, Clock3 } from 'lucide-react';
import { getSupabaseClient } from '../../auth/supabase-client';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

const intervalSchema=z.object({day:z.number(),start:z.string(),end:z.string()});
const blockSchema=z.object({kind:z.enum(['block','vacation']),startsAt:z.string(),endsAt:z.string(),note:z.string()});
const settingsSchema=z.object({timeZone:z.string(),enforceHours:z.boolean(),intervals:z.array(intervalSchema),blocks:z.array(blockSchema),gapMinutes:z.number(),cancellationNoticeHours:z.number(),rescheduleNoticeHours:z.number()});
type Schedule=z.infer<typeof settingsSchema>;
const empty:Schedule={timeZone:'America/Argentina/Cordoba',enforceHours:false,intervals:[],blocks:[],gapMinutes:0,cancellationNoticeHours:24,rescheduleNoticeHours:24};
const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const localInput=(iso:string)=>{if(!iso)return '';const date=new Date(iso);return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);};
 const instant=(local:string)=>{const date=new Date(local);return local&&Number.isFinite(date.getTime())?date.toISOString():'';};

export function RealScheduleSettings({organizationId}:{organizationId:string}) {
 const [settings,setSettings]=useState<Schedule>(empty),[version,setVersion]=useState<string|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState(''),[retry,setRetry]=useState(0),[loaded,setLoaded]=useState(false);
 useEffect(()=>{let active=true;setLoading(true);setLoaded(false);setError('');setSuccess('');
  Promise.resolve(getSupabaseClient().schema('api').rpc('get_my_schedule_settings',{p_org:organizationId})).then(({data,error:problem})=>{
   if(!active)return;if(problem){setError('No pudimos cargar tus horarios. Reintentá antes de editar.');return;}
   const parsed=z.object({settings:settingsSchema.nullable(),updated_at:z.string().nullable()}).safeParse(data);
   if(!parsed.success){setError('La configuración recibida no es válida. Reintentá.');return;}
   setSettings(parsed.data.settings??empty);setVersion(parsed.data.updated_at);setLoaded(true);
  }).catch(()=>{if(active)setError('No pudimos conectar. Reintentá.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};
 },[organizationId,retry]);
 async function save(event:React.FormEvent){event.preventDefault();setBusy(true);setError('');setSuccess('');
  try{const {data,error:problem}=await getSupabaseClient().schema('api').rpc('save_my_schedule_settings',{p_org:organizationId,p_settings:settings,p_expected:version??undefined});if(problem)throw new Error(problem.message);if(typeof data!=='string')throw new Error('No pudimos confirmar el guardado. Recargá para comprobarlo.');setVersion(data);setSuccess('Horarios y reglas guardados. Las citas existentes no se modificaron.');}
  catch(e){setError(e instanceof Error?e.message:'No pudimos guardar. Reintentá.');}finally{setBusy(false);}
 }
 return <Card className="space-y-4"><div className="flex items-start gap-3"><Clock3 className="h-5 w-5 shrink-0 text-brand-strong"/><div><h2 className="font-bold">Horarios y reglas de citas</h2><p className="mt-1 text-sm text-text-secondary">Tu configuración en este consultorio. Se aplica al crear o reprogramar; no mueve turnos existentes.</p></div></div>
 {loaded&&!version&&<p className="rounded-xl bg-surface-subtle p-3 text-sm">Todavía no guardaste esta configuración. Los valores del formulario son un borrador; se aplicarán al guardar.</p>}
 {loading?<p role="status">Cargando horarios…</p>:loaded&&<form onSubmit={event=>void save(event)}><fieldset disabled={busy} className="min-w-0 space-y-6">
 <label className="form-label">Zona horaria de las franjas<select className="form-control" value={settings.timeZone} onChange={e=>setSettings({...settings,timeZone:e.target.value})}>{Array.from(new Set([settings.timeZone,'America/Argentina/Cordoba','America/Montevideo','America/Santiago','America/Sao_Paulo','America/Mexico_City','America/Bogota','America/Lima','Europe/Madrid','UTC'])).map(zone=><option key={zone}>{zone}</option>)}</select></label>
 <section className="space-y-3"><h3 className="font-semibold">Horarios de atención y descansos</h3><label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={settings.enforceHours} onChange={e=>setSettings({...settings,enforceHours:e.target.checked})}/>Limitar nuevos turnos a estas franjas</label><p className="text-xs text-text-secondary">Agregá franjas separadas para dejar un descanso. Sin esta opción, sólo se controlan bloqueos y pausas entre citas.</p>
 {[1,2,3,4,5,6,0].map(day=><div key={day} className="rounded-xl border border-border-subtle p-3 space-y-2"><div className="flex items-center justify-between gap-2"><h4 className="text-sm font-semibold">{days[day]}</h4><Button type="button" variant="ghost" className="min-h-11" disabled={settings.intervals.length>=42} aria-label={`Agregar franja de ${days[day]}`} onClick={()=>setSettings({...settings,intervals:[...settings.intervals,{day,start:'09:00',end:'13:00'}]})}><Plus className="h-4 w-4"/>Franja</Button></div>
 {!settings.intervals.some(s=>s.day===day)&&<p className="text-xs text-text-secondary">Sin franjas</p>}
 {settings.intervals.map((slot,index)=>slot.day===day&&<div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2">{(['start','end'] as const).map(key=><label className="form-label min-w-0" key={key}>{key==='start'?'Desde':'Hasta'}<input aria-label={`${days[day]} ${key==='start'?'desde':'hasta'} ${index+1}`} className="form-control min-w-0" type="time" required value={slot[key]} onChange={e=>setSettings({...settings,intervals:settings.intervals.map((v,i)=>i===index?{...v,[key]:e.target.value}:v)})}/></label>)}<Button type="button" variant="ghost" aria-label={`Quitar franja ${index+1}`} onClick={()=>setSettings({...settings,intervals:settings.intervals.filter((_,i)=>i!==index)})}><Trash2 className="h-4 w-4"/></Button></div>)}
 </div>)}</section>
 <section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Bloqueos y vacaciones</h3><Button type="button" variant="secondary" disabled={settings.blocks.length>=200} onClick={()=>setSettings({...settings,blocks:[...settings.blocks,{kind:'block',startsAt:'',endsAt:'',note:''}]})}><Plus className="h-4 w-4"/>Agregar bloqueo</Button></div><p className="text-xs text-text-secondary">Fechas en la zona de este dispositivo ({Intl.DateTimeFormat().resolvedOptions().timeZone}). Si coinciden con una cita activa, no se guardarán.</p>
 {!settings.blocks.length&&<p className="text-sm text-text-secondary">No hay bloqueos cargados.</p>}
 {settings.blocks.map((block,index)=><div key={index} className="grid gap-3 rounded-xl border border-border-subtle p-3 sm:grid-cols-2"><label className="form-label">Tipo<select className="form-control" value={block.kind} onChange={e=>setSettings({...settings,blocks:settings.blocks.map((v,i)=>i===index?{...v,kind:e.target.value as 'block'|'vacation'}:v)})}><option value="block">Bloqueo puntual</option><option value="vacation">Vacaciones</option></select></label>
 {(['startsAt','endsAt'] as const).map(key=><label key={key} className="form-label min-w-0">{key==='startsAt'?'Inicio':'Fin'}<input className="form-control min-w-0" required type="datetime-local" value={localInput(block[key])} onChange={e=>setSettings({...settings,blocks:settings.blocks.map((v,i)=>i===index?{...v,[key]:instant(e.target.value)}:v)})}/></label>)}
 <label className="form-label">Nota opcional<input className="form-control" maxLength={300} value={block.note} onChange={e=>setSettings({...settings,blocks:settings.blocks.map((v,i)=>i===index?{...v,note:e.target.value}:v)})}/></label><Button type="button" variant="ghost" onClick={()=>setSettings({...settings,blocks:settings.blocks.filter((_,i)=>i!==index)})}>Quitar bloqueo {index+1}</Button></div>)}</section>
 <section className="space-y-3"><h3 className="font-semibold">Pausas y solicitudes de cambios</h3><div className="grid gap-3 sm:grid-cols-3">{([['gapMinutes','Pausa entre citas'],['cancellationNoticeHours','Cancelar hasta'],['rescheduleNoticeHours','Reprogramar hasta']] as const).map(([key,label])=><label className="form-label" key={key}>{label}<select className="form-control" value={settings[key]} onChange={e=>setSettings({...settings,[key]:Number(e.target.value)})}>{(key==='gapMinutes'?[0,5,10,15,20,30]:[0,2,6,12,24,48,72]).map(n=><option key={n} value={n}>{n===0?(key==='gapMinutes'?'Sin pausa':'Sin límite'):`${n} ${key==='gapMinutes'?'min':'h antes'}`}</option>)}</select></label>)}</div><p className="text-xs text-text-secondary">Fuera del plazo, la solicitud se identifica como tardía. Siempre requiere aprobación profesional; nunca cancela, reprograma ni cobra automáticamente.</p></section>
 <Button type="submit">{busy?'Guardando…':'Guardar horarios y reglas'}</Button></fieldset></form>}
 {error&&<p role="alert" className="text-sm text-critical">{error}</p>}{success&&<p role="status" className="text-sm text-brand-strong">{success}</p>}
 <Button variant="ghost" disabled={busy||loading} onClick={()=>setRetry(v=>v+1)}>Recargar configuración guardada</Button>
 </Card>;
}
