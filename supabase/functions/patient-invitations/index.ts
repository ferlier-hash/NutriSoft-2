import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const origins = new Set(['http://127.0.0.1:5174']);
const cors = (r: Request) => origins.has(r.headers.get('Origin') ?? '') ? {'Access-Control-Allow-Origin': r.headers.get('Origin')!, Vary:'Origin'} : {};
const env = (name:string) => { const value=Deno.env.get(name); if(!value) throw new Error('Configuración incompleta.'); return value; };
Deno.serve(async (request) => { try {
  if(request.method==='OPTIONS') return new Response(null,{headers:{...cors(request),'Access-Control-Allow-Headers':'authorization,content-type'}});
  if(request.method!=='POST') return new Response('Método no permitido.',{status:405,headers:cors(request)});
  const authorization=request.headers.get('Authorization'); if(!authorization) throw new Error('No autorizado.');
  const {organization_id,first_name,last_name,email}=await request.json() as Record<string,string>;
  if(!organization_id||!first_name?.trim()||!last_name?.trim()||!email?.trim()) throw new Error('Completá nombre, apellido y correo.');
  const url=env('SUPABASE_URL'), anon=env('SUPABASE_ANON_KEY'), serviceKey=env('SUPABASE_SERVICE_ROLE_KEY');
  const user=createClient(url,anon,{auth:{persistSession:false},global:{headers:{Authorization:authorization}}});
  const {data:{user:identity},error:userError}=await user.auth.getUser(); if(userError||!identity) throw new Error('Sesión inválida.');
  const {data:context,error:contextError}=await user.schema('api').rpc('get_current_access_context');
  const membership=context?.memberships?.find((m:{organization_id:string;role:string;membership_status:string;organization_status:string})=>m.organization_id===organization_id&&m.role==='nutritionist'&&m.membership_status==='active'&&m.organization_status==='active');
  if(contextError||!membership) throw new Error('No tenés permiso para invitar pacientes en este consultorio.');
  const service=createClient(url,serviceKey,{auth:{persistSession:false}});
  const normalized=email.trim().toLowerCase();
  const {data:existingPatientId,error:existingError}=await service.schema('api').rpc('get_pending_patient_invitation_for_service',{p_org_id:organization_id,p_email:normalized});
  if(existingError) throw new Error('No pudimos verificar las invitaciones existentes.');
  if(existingPatientId) {
    // Sólo para el entorno local: permite continuar una invitación ya creada
    // sin exponer enlaces de autenticación en el producto real.
    const isLocal = url.includes('localhost') || url.includes('127.0.0.1') || url.includes('kong:8000');
    if (!isLocal) return Response.json({patient_id:existingPatientId,status:'pending',existing:true},{headers:cors(request)});
    const {data:recovery,error:recoveryError}=await service.auth.admin.generateLink({
      type:'recovery',
      email:normalized,
      options:{redirectTo:'http://127.0.0.1:5174/?auth=invite'},
    });
    const activationUrl=recovery?.properties?.action_link;
    if(recoveryError||!activationUrl) throw new Error('No pudimos regenerar el enlace de activación local.');
    return Response.json({patient_id:existingPatientId,status:'pending',existing:true,activation_url:activationUrl},{headers:cors(request)});
  }
  const {data:invited,error:inviteError}=await service.auth.admin.inviteUserByEmail(normalized,{data:{full_name:`${first_name.trim()} ${last_name.trim()}`},redirectTo:'http://127.0.0.1:5174/?auth=invite'});
  if(inviteError||!invited.user) {
    if(inviteError?.message==='User already registered') {
      return Response.json({message:'Ya existe una invitación o una cuenta para ese correo. Revisá el Buzón de pruebas o usá otra dirección.'},{status:409,headers:cors(request)});
    }
    throw new Error('No pudimos enviar la invitación.');
  }
  const {data:patientId,error:saveError}=await service.schema('api').rpc('create_patient_invitation_for_service',{p_org_id:organization_id,p_nutritionist_user_id:identity.id,p_invited_user_id:invited.user.id,p_first_name:first_name,p_last_name:last_name,p_email:normalized});
  if(saveError){
    try { await service.auth.admin.deleteUser(invited.user.id); } catch { /* El error principal sigue siendo el alta clínica. */ }
    throw new Error('No pudimos preparar el paciente.');
  }
  return Response.json({patient_id:patientId,status:'pending'},{headers:cors(request)});
}catch(error){ const message=error instanceof Error?error.message:'No pudimos preparar la invitación.'; return Response.json({message},{status:400,headers:cors(request)}); }});
