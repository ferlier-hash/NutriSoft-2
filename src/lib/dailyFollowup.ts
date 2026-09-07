import type { DailyPatient } from '../data/supabase/daily-followup.repository';
/** No activity inferred from login, professional edits or measurements' backdated date. */
export function inactivityDays(patient:DailyPatient,now=new Date()) {
 const reference=patient.last_at??patient.tracking_since;
 return reference ? Math.max(0,Math.floor((now.getTime()-new Date(reference).getTime())/86400000)) : null;
}
export function inactivityGroup(days:number|null) {return days===null?'unknown':days>=10?'10+':days>=5?'5–9':days>=3?'3–4':'recent';}
