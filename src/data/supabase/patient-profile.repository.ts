import {z} from 'zod';
import {getSupabaseClient} from '../../auth/supabase-client';
const api=()=>getSupabaseClient().schema('api');
const profile=z.object({id:z.string(),organization_id:z.string(),first_name:z.string(),last_name:z.string(),email:z.string().nullable(),phone:z.string().nullable(),birth_date:z.string().nullable(),city:z.string().nullable(),status:z.string()});
const initial=z.object({patient_id:z.string(),recorded_on:z.string(),height_cm:z.number().nullable(),initial_weight_kg:z.number().nullable(),waist_cm:z.number().nullable(),hip_cm:z.number().nullable(),target_weight_kg:z.number().nullable(),updated_at:z.string()});
export type InitialMeasurements=z.infer<typeof initial>;
export type ClinicalPatient=z.infer<typeof profile>;
export async function loadClinicalPatients(){const {data,error}=await api().from('clinical_patient_profiles').select('*').order('last_name');if(error)throw new Error('No pudimos cargar las fichas.');return z.array(profile).parse(data);}
export async function loadInitialMeasurements(id:string){const {data,error}=await api().from('patient_initial_measurements').select('*').eq('patient_id',id).maybeSingle();if(error)throw new Error('No pudimos cargar los datos iniciales.');return data?initial.parse(data):null;}
export async function saveInitialMeasurements(id:string,date:string,values:Record<string,number|null>,expected?:string){const {error}=await api().rpc('save_patient_initial_measurements',{p_patient:id,p_date:date,p_values:values,p_expected:expected??null!});if(error)throw new Error(error.message);}
