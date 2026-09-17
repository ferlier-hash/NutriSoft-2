import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const env=(name:string)=>{const value=Deno.env.get(name);if(!value)throw new Error(`Falta ${name}.`);return value;};
Deno.serve(async request=>{try{
 if(request.method!=='POST')return new Response('Método no permitido.',{status:405});
 if(request.headers.get('Authorization')!==`Bearer ${env('CHECKIN_SCHEDULER_SECRET')}`)return new Response('No autorizado.',{status:401});
 const service=createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false}});
 const {data,error}=await service.schema('api').rpc('run_checkin_automation_for_service',{});if(error)throw error;
 return Response.json(data?.[0]??{assigned:0,skipped_pending:0,skipped_configuration:0});
}catch(error){return Response.json({message:error instanceof Error?error.message:'Falló la automatización.'},{status:400});}});
