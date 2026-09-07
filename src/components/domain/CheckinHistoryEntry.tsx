import {useId,useState} from 'react';
import {BellRing,CalendarDays,ChevronDown} from 'lucide-react';
import type {DailyCheckin} from '../../data/supabase/daily-followup.repository';
import {Badge} from '../ui/Badge';

const labels:Record<string,string>={sleep:'Descanso',digestion:'Digestión',satiety:'Hambre y saciedad',help:'Pedido de ayuda',notes:'Comentario'};
export function CheckinHistoryEntry({value:c,initiallyOpen=false}:{value:DailyCheckin;initiallyOpen?:boolean}){
 const [open,setOpen]=useState(initiallyOpen);const panel=useId();
 const answered=!!c.submitted_at;
 const status=c.status==='completed'?'Respondido':c.status==='pending'&&(!c.due_date||new Date(c.due_date)>new Date())?'Pendiente':c.status==='cancelled'?'Cancelado':'Vencido / cerrado';
 const alerts=c.questions?(c.alert_matches?.length??0):Number(!!c.help_requested)+Number(c.energy!=null&&c.energy<=2)+Number(c.adherence!=null&&c.adherence<=2);
 const answers=c.questions?c.questions.map(q=>({label:q.text,value:c.question_answers?.[q.id]||'Sin respuesta',alert:!!c.alert_matches?.includes(q.id)})):[
 {label:'Energía',value:c.energy==null?'Sin respuesta':`${c.energy} / 5`,alert:c.energy!=null&&c.energy<=2},
 {label:'Seguimiento del plan',value:c.adherence==null?'Sin respuesta':`${c.adherence} / 5`,alert:c.adherence!=null&&c.adherence<=2},
 ...(c.help_requested?[{label:'Pedido de ayuda',value:'El paciente pidió conversar',alert:true}]:[]),
 ];
 const stamp=new Date(c.submitted_at??c.created_at);
 return <article className="overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm">
 <h3><button type="button" aria-expanded={open} aria-controls={panel} onClick={()=>setOpen(v=>!v)} className="w-full flex items-start gap-3 p-4 text-left bg-surface-subtle hover:bg-surface-tinted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-strong">
 <CalendarDays aria-hidden="true" className="h-5 w-5 shrink-0 text-brand-strong mt-1"/>
 <span className="min-w-0 flex-1"><span className="block font-semibold">{stamp.toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'})}</span><span className="block text-xs text-text-secondary mt-1">{answered?'Respuesta registrada':'Check-in creado'} · {stamp.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})}{answered?` · ${answers.length} preguntas`:''}</span><span className="flex flex-wrap gap-2 mt-2"><Badge variant={answered?'active':'neutral'}>{status}</Badge>{answered&&alerts>0&&<Badge variant="high"><BellRing aria-hidden="true" className="h-3 w-3 mr-1"/>{alerts} {alerts===1?'respuesta con alerta':'respuestas con alerta'}</Badge>}</span></span>
 <ChevronDown aria-hidden="true" className={`h-5 w-5 shrink-0 text-text-secondary transition-transform ${open?'rotate-180':''}`}/>
 </button></h3>
 <div id={panel} hidden={!open}>
 {answered?<div className="p-4 sm:px-5"><dl className="divide-y divide-border-subtle">{answers.map((a,i)=><div key={i} className="py-3 first:pt-0 last:pb-0"><dt className="text-sm text-text-secondary leading-relaxed">{a.label}</dt><dd className="mt-1 flex flex-wrap items-center gap-2"><span className="font-semibold text-text-primary whitespace-pre-wrap break-words min-w-0">{a.value}</span>{a.alert&&<span className="text-xs text-brand-strong inline-flex items-center gap-1"><BellRing aria-hidden="true" className="h-3.5 w-3.5"/>Señalada por regla</span>}</dd></div>)}</dl>
 {Object.entries(c.answers??{}).map(([k,v])=><div key={k} className="mt-3 border-t border-border-subtle pt-3"><p className="text-sm text-text-secondary">{labels[k]??k}</p><p className="font-medium whitespace-pre-wrap break-words mt-1">{v}</p></div>)}
 {c.notes&&<aside className="rounded-xl bg-surface-subtle p-3 mt-4"><p className="text-xs text-text-secondary mb-1">Comentario del registro</p><p className="text-sm whitespace-pre-wrap break-words">{c.notes}</p></aside>}</div>:<p className="p-4 text-sm text-text-secondary">{status==='Pendiente'?'Todavía no hay una respuesta del paciente.':'Este check-in no tiene respuestas registradas.'}</p>}
 </div></article>;
}
