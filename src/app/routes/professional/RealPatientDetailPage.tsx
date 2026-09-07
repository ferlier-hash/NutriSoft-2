import {useEffect,useState} from 'react';
import {Link,useParams,useSearchParams} from 'react-router-dom';
import {loadClinicalPatients,type ClinicalPatient} from '../../../data/supabase/patient-profile.repository';
import {loadProfessionalMealPlans} from '../../../data/supabase/clinical-meal-plans.repository';
import type {RealProfessionalMealPlan} from '../../../data/clinical-meal-plans.types';
import {RealInitialMeasurements} from '../../../components/domain/RealInitialMeasurements';
import {RealDailyFollowupPage} from '../shared/RealDailyFollowupPage';
import {RealPatientAnthropometryPage} from './RealPatientAnthropometryPage';
import {Card} from '../../../components/ui/Card';
import {Button} from '../../../components/ui/Button';
const tabs=[['basic','Información básica'],['plans','Plan alimentario'],['checkins','Historial de check-ins'],['weight','Seguimiento de peso'],['anthropometry','Antropometría'],['phrases','Recomendaciones'],['steps','Próximos pasos']] as const;
export function RealPatientDetailPage(){
 const {patientId=''}=useParams();const [params,setParams]=useSearchParams();const tab=params.get('tab')??'basic';
 const [person,setPerson]=useState<ClinicalPatient|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setPerson(null);setError('');loadClinicalPatients().then(rows=>{if(active){const p=rows.find(p=>p.id===patientId);if(!p)throw new Error('Ficha no disponible o sin acceso vigente.');setPerson(p);}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[patientId,retry]);
 return <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5"><Link className="inline-flex min-h-11 items-center text-sm text-brand-strong" to="/professional/patients">← Volver a pacientes</Link>{loading?<p role="status">Cargando ficha…</p>:error?<Card><p role="alert">{error}</p><Button onClick={()=>setRetry(n=>n+1)}>Reintentar</Button></Card>:person&&<><Card highlighted><h1 className="font-bold text-2xl">{person.first_name} {person.last_name}</h1><p className="text-sm text-text-secondary break-words">{person.email??'Sin correo'} · {person.phone??'Sin teléfono'}</p></Card><nav aria-label="Secciones de la ficha" className="flex flex-wrap gap-1">{tabs.map(([key,label])=><Button key={key} variant={tab===key?'primary':'ghost'} aria-pressed={tab===key} onClick={()=>setParams({tab:key})}>{label}</Button>)}</nav>
 {tab==='basic'&&<><Card><h2 className="font-bold mb-3">Información básica</h2><dl className="grid sm:grid-cols-2 gap-4 text-sm">{[['Correo',person.email],['Teléfono',person.phone],['Ciudad',person.city],['Fecha de nacimiento',person.birth_date],['Estado',person.status==='active'?'Activo':person.status]].map(([k,v])=><div key={k}><dt className="text-text-secondary">{k}</dt><dd className="break-words">{v||'Sin informar'}</dd></div>)}</dl></Card><RealInitialMeasurements key={patientId} patientId={patientId}/></>}
 {tab==='plans'&&<PatientPlans patientId={patientId}/>}
 {tab==='anthropometry'&&<RealPatientAnthropometryPage embedded/>}
 {(tab==='checkins'||tab==='weight'||tab==='phrases'||tab==='steps')&&<RealDailyFollowupPage key={`${patientId}-${tab}`} section={tab} embedded/>}
 </>}</div>;
}
function PatientPlans({patientId}:{patientId:string}){const [rows,setRows]=useState<RealProfessionalMealPlan[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);useEffect(()=>{let active=true;loadProfessionalMealPlans().then(r=>{if(active)setRows(r.filter(p=>p.patientId===patientId));}).catch(()=>{if(active)setError('No pudimos cargar los planes. Volvé a abrir esta sección para reintentar.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[patientId]);return <div className="space-y-3">{loading?<p role="status">Cargando planes…</p>:error?<p role="alert">{error}</p>:rows.length?rows.map(p=><Card key={p.id}><h2 className="font-bold">{p.title}</h2><p className="text-sm text-text-secondary">{p.status==='published'?'Publicado':p.status==='draft'?'Borrador':'Archivado'} · {p.pendingCommentCount} comentarios por revisar</p><Link className="inline-flex min-h-11 items-center text-brand-strong" to={`/professional/meal-plans/${p.id}`}>Abrir plan y cumplimiento →</Link></Card>):<Card>No hay planes vinculados a este paciente.</Card>}<Link className="inline-flex min-h-11 items-center text-brand-strong" to="/professional/meal-plans">Ir a la biblioteca de planes</Link></div>;}
