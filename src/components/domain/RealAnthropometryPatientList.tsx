import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {loadClinicalPatients,type ClinicalPatient} from '../../data/supabase/patient-profile.repository';
import {Card} from '../ui/Card';
import {Button} from '../ui/Button';
export function RealAnthropometryPatientList(){
 const [patients,setPatients]=useState<ClinicalPatient[]>([]),[query,setQuery]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setError('');loadClinicalPatients().then(r=>{if(active)setPatients(r);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[retry]);
 const rows=patients.filter(p=>[p.first_name,p.last_name,p.email].join(' ').toLocaleLowerCase().includes(query.toLocaleLowerCase()));
 return <Card className="space-y-4"><h2 className="font-bold">Mis pacientes</h2><label className="block form-label">Buscar por nombre o correo<input className="form-control mt-1" value={query} onChange={e=>setQuery(e.target.value)}/></label>{loading?<p role="status">Cargando pacientes…</p>:error?<div><p role="alert">{error}</p><Button onClick={()=>setRetry(n=>n+1)}>Reintentar</Button></div>:<><div className="hidden sm:grid grid-cols-[2fr_1fr_auto] gap-4 text-xs text-text-secondary"><span>Paciente y contacto</span><span>Ciudad · estado</span><span>Ficha</span></div>{rows.map(p=><div key={p.id} className="grid sm:grid-cols-[2fr_1fr_auto] gap-3 items-center border-t border-border-subtle py-3"><div className="min-w-0"><strong>{p.first_name} {p.last_name}</strong><p className="text-xs text-text-secondary break-all">{p.email||'Sin correo'}</p><p className="text-xs text-text-secondary whitespace-nowrap">{p.phone||'Sin teléfono'}</p></div><div className="text-sm">{p.city||'Ciudad sin informar'}<p className="text-xs text-text-secondary">{p.status==='active'?'Activo':p.status}</p></div><Button asChild variant="secondary" size="sm"><Link to={'/professional/patients/'+p.id}>Abrir ficha</Link></Button></div>)}{!rows.length&&<p>No hay pacientes que coincidan.</p>}</>}</Card>;
}
