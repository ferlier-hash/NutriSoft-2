import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {loadDaily,type DailyData} from '../../data/supabase/daily-followup.repository';
import {Card} from '../ui/Card';
export function RealDailyHome(){
 const [data,setData]=useState<DailyData|null>(null);
 useEffect(()=>{let active=true;loadDaily().then(d=>{if(active)setData(d);}).catch(()=>{});return()=>{active=false;};},[]);
 return <Card className="space-y-3"><h2 className="font-bold">Tu seguimiento cotidiano</h2>
 {data?.phrases.filter(p=>data.assignments.some(a=>a.phrase_id===p.id)).map(p=><p key={p.id} className="text-sm whitespace-pre-wrap">{p.text}</p>)}
 {data&&<p className="text-sm text-text-secondary">{data.checkins.filter(c=>c.status==='pending'&&(!c.due_date||new Date(c.due_date)>new Date())).length} check-ins pendientes · {data.lists.filter(l=>l.active).length} listas activas</p>}
 <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-strong" to="/patient/followup">Ver check-ins, tareas y peso →</Link></Card>;
}
