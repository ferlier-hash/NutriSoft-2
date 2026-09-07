import { z } from 'zod';
import {questionSchema} from '../../lib/checkinQuestions';
import { getSupabaseClient } from '../../auth/supabase-client';
const patient = z.object({ id:z.string(),organization_id:z.string(),first_name:z.string(),last_name:z.string(),last_at:z.string().nullable(),source:z.string().nullable(),tracking_since:z.string().nullable() });
const weight = z.object({ id:z.string(),patient_id:z.string(),recorded_on:z.string(),weight_kg:z.number(),origin:z.string(),created_at:z.string() });
const checkin = z.object({ id:z.string(),patient_id:z.string(),status:z.string(),due_date:z.string().nullable(),created_at:z.string(),daily_fields:z.array(z.string()),energy:z.number().nullable(),adherence:z.number().nullable(),help_requested:z.boolean().nullable(),notes:z.string().nullable(),submitted_at:z.string().nullable(),answers:z.record(z.string()).nullable(),questions:z.array(questionSchema).nullish(),question_answers:z.record(z.string()).nullish(),alert_matches:z.array(z.string()).nullish() });
const list = z.object({ id:z.string(),organization_id:z.string(),patient_id:z.string().nullable(),title:z.string(),duration_days:z.number(),items:z.array(z.object({id:z.string(),text:z.string()})),active:z.boolean(),updated_at:z.string() });
const task = z.object({list_id:z.string(),task_id:z.string(),patient_id:z.string(),completed:z.boolean(),comment:z.string(),updated_at:z.string()});
const phrase = z.object({id:z.string(),organization_id:z.string(),text:z.string(),updated_at:z.string()});
const assignment = z.object({patient_id:z.string(),phrase_id:z.string()});
export type DailyPatient = z.infer<typeof patient>;
export type DailyWeight = z.infer<typeof weight>;
export type DailyCheckin = z.infer<typeof checkin>;
export type DailyList = z.infer<typeof list>;
export type DailyTask = z.infer<typeof task>;
export type DailyPhrase = z.infer<typeof phrase>;
const api=()=>getSupabaseClient().schema('api');
export async function loadDaily() {
 const results=await Promise.all([api().from('daily_patients').select('*'),api().from('daily_weights').select('*').order('recorded_on'),api().from('daily_checkins').select('*').order('created_at',{ascending:false}),api().from('daily_lists').select('*'),api().from('daily_task_activity').select('*'),api().from('daily_phrases').select('*'),api().from('daily_phrase_assignments').select('*')]);
 if(results.some(r=>r.error))throw new Error('No pudimos cargar el seguimiento. Reintentá.');
 return {patients:z.array(patient).parse(results[0]!.data),weights:z.array(weight).parse(results[1]!.data),checkins:z.array(checkin).parse(results[2]!.data),lists:z.array(list).parse(results[3]!.data),tasks:z.array(task).parse(results[4]!.data),phrases:z.array(phrase).parse(results[5]!.data),assignments:z.array(assignment).parse(results[6]!.data)};
}
export type DailyData=Awaited<ReturnType<typeof loadDaily>>;
function checked(error:{message:string}|null) {if(error)throw new Error(error.message);}
export async function recordWeight(patientId:string,date:string,value:number,requestId:string) {const {error}=await api().rpc('record_daily_weight',{p_patient:patientId,p_date:date,p_weight:value,p_request_id:requestId});checked(error);}
export async function assignCheckin(patientId:string,due:string) {const {error}=await api().rpc('assign_daily_checkin',{p_patient:patientId,p_due:due});checked(error);}
export async function submitCheckin(id:string,energy:number,adherence:number,help:boolean,notes:string,answers:Record<string,string>) {const {error}=await api().rpc('submit_daily_checkin',{p_assignment:id,p_energy:energy,p_adherence:adherence,p_help:help,p_notes:notes,p_answers:answers});checked(error);}
export async function saveList(org:string,title:string,days:number,items:DailyList['items'],previous?:DailyList) {const {error}=await api().rpc('save_daily_list',{p_id:previous?.id??null!,p_org:org,p_title:title,p_days:days,p_items:items,p_expected:previous?.updated_at??null!});checked(error);}
export async function assignList(list:DailyList,patientId:string|null,active:boolean,deleted=false) {const {error}=await api().rpc('set_daily_list_assignment',{p_id:list.id,p_patient:patientId??null!,p_active:active,p_delete:deleted});checked(error);}
export async function respondTask(listId:string,taskId:string,completed:boolean,comment:string) {const {error}=await api().rpc('respond_daily_task',{p_list:listId,p_task:taskId,p_completed:completed,p_comment:comment});checked(error);}
export async function savePhrase(org:string,text:string,previous?:DailyPhrase,deleted=false) {const {error}=await api().rpc('save_daily_phrase',{p_id:previous?.id??null!,p_org:org,p_text:text,p_delete:deleted,p_expected:previous?.updated_at??null!});checked(error);}
export async function assignPhrase(id:string,patients:string[]) {const {error}=await api().rpc('assign_daily_phrase',{p_id:id,p_patients:patients});checked(error);}
export async function loadCheckinSettings(org:string) {const {data,error}=await api().from('daily_checkin_settings').select('fields').eq('organization_id',org).maybeSingle();checked(error);return data?.fields??['sleep','digestion','satiety','help','notes'];}
export async function saveCheckinSettings(org:string,fields:string[]) {const {error}=await api().rpc('save_daily_checkin_settings',{p_org:org,p_fields:fields});checked(error);}
