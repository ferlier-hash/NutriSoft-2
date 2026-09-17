import {z} from 'zod';
import {getSupabaseClient} from '../../auth/supabase-client';
const api=()=>getSupabaseClient().schema('api');
const profile=z.object({id:z.string(),organization_id:z.string(),first_name:z.string(),last_name:z.string(),email:z.string().nullable(),phone:z.string().nullable(),birth_date:z.string().nullable(),city:z.string().nullable(),status:z.string()});
const initial=z.object({patient_id:z.string(),recorded_on:z.string(),height_cm:z.number().nullable(),initial_weight_kg:z.number().nullable(),waist_cm:z.number().nullable(),hip_cm:z.number().nullable(),target_weight_kg:z.number().nullable(),updated_at:z.string()});
const invitation=z.object({id:z.string(),organization_id:z.string(),patient_id:z.string(),first_name:z.string(),last_name:z.string(),email:z.string(),status:z.enum(['pending','accepted','expired','revoked']),created_at:z.string(),expires_at:z.string(),accepted_at:z.string().nullable(),resent_at:z.string().nullable(),revoked_at:z.string().nullable()});
const appointment=z.object({id:z.string(),organization_id:z.string(),patient_id:z.string(),nutritionist_user_id:z.string(),starts_at:z.string(),ends_at:z.string(),time_zone:z.string(),modality:z.string(),status:z.string(),payment_status:z.string()});
export type InitialMeasurements=z.infer<typeof initial>;
export type ClinicalPatient=z.infer<typeof profile>;
export type PatientInvitation=z.infer<typeof invitation>;
export type RecentPatientAppointment=z.infer<typeof appointment>;
export async function loadClinicalPatients(){const {data,error}=await api().rpc('get_my_professional_patients');if(error)throw new Error('No pudimos cargar las fichas.');return z.array(profile.extend({updated_at:z.string()})).parse(data).map(({updated_at:_,...patient})=>patient);}
export async function loadPatientInvitations(){const {data,error}=await api().rpc('get_my_patient_invitations');if(error)throw new Error('No pudimos cargar las invitaciones.');return z.array(invitation).parse(data);}
export async function revokePatientInvitation(id:string){const {error}=await api().rpc('revoke_my_patient_invitation',{p_invitation:id});if(error)throw new Error(error.message);}
export async function setPatientStatus(id:string,status:'active'|'archived'){const {error}=await api().rpc('set_my_patient_status',{p_patient:id,p_status:status});if(error)throw new Error(error.message);}
export async function loadRecentPatientAppointments(patientId:string){const {data,error}=await api().from('patient_recent_appointments').select('*').eq('patient_id',patientId).order('starts_at',{ascending:false});if(error)throw new Error('No pudimos cargar los últimos turnos.');return z.array(appointment).parse(data);}
export async function loadInitialMeasurements(id:string){const {data,error}=await api().from('patient_initial_measurements').select('*').eq('patient_id',id).maybeSingle();if(error)throw new Error('No pudimos cargar los datos iniciales.');return data?initial.parse(data):null;}
export async function saveInitialMeasurements(id:string,date:string,values:Record<string,number|null>,expected?:string){const {error}=await api().rpc('save_patient_initial_measurements',{p_patient:id,p_date:date,p_values:values,p_expected:expected??null!});if(error)throw new Error(error.message);}
