import {useState} from 'react';
import {z} from 'zod';
import {getSupabaseClient} from '../../auth/supabase-client';
import {questionSchema,type CheckinQuestion} from '../../lib/checkinQuestions';
import {QuestionCheckinForm} from './QuestionCheckinForm';
import {Button} from '../ui/Button';
export function FreeCheckin({patientId,onSaved}:{patientId:string;onSaved:()=>Promise<void>}){
 const [form,setForm]=useState<{questions:CheckinQuestion[];version:string;request:string}|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 return <div className="space-y-2"><Button disabled={busy} onClick={async()=>{setBusy(true);setError('');try{const {data,error:e}=await getSupabaseClient().schema('api').rpc('get_free_checkin',{p_patient:patientId});if(e)throw e;const parsed=z.object({questions:z.array(questionSchema),version:z.string().nullable()}).parse(data);if(!parsed.questions.length||!parsed.version){setError('Tu profesional todavía no configuró preguntas para responder.');return;}setForm({...parsed,version:parsed.version,request:crypto.randomUUID()});}catch{setError('No pudimos cargar las preguntas. Reintentá.');}finally{setBusy(false);}}}>{busy?'Cargando…':'Completar check-in'}</Button><p className="text-sm text-text-secondary">Respondé cuando lo necesites, sin frecuencia fija. Cada envío se guarda por separado.</p>{error&&<p role="status">{error}</p>}{form&&<QuestionCheckinForm id={form.request} questions={form.questions} onClose={()=>setForm(null)} submit={async answers=>{const {error:e}=await getSupabaseClient().schema('api').rpc('submit_free_checkin',{p_patient:patientId,p_request:form.request,p_version:form.version,p_answers:answers});if(e)throw new Error(e.message);}} onSaved={async()=>{setForm(null);await onSaved();}}/>}</div>;
}
