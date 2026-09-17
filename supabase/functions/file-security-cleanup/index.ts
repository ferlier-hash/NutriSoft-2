import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const env=(name:string)=>{const value=Deno.env.get(name);if(!value)throw new Error(`Falta ${name}.`);return value;};
Deno.serve(async request=>{try{
 if(request.method!=='POST')return new Response('Método no permitido.',{status:405});
 if(request.headers.get('Authorization')!==`Bearer ${env('FILE_CLEANUP_SECRET')}`)return new Response('No autorizado.',{status:401});
 const service=createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false}});
 const {data:rows,error}=await service.schema('api').rpc('list_secure_upload_cleanup_for_service',{p_limit:200});if(error)throw error;
 let removed=0;for(const row of rows??[]){const {error:removeError}=await service.storage.from(row.bucket_id).remove([row.object_path]);if(removeError)continue;await service.schema('api').rpc('mark_secure_upload_deleted_for_service',{p_upload_id:row.upload_id});removed++;}
 return Response.json({removed});
}catch(error){return Response.json({message:error instanceof Error?error.message:'Falló la limpieza.'},{status:400});}});
