import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigins = new Set((Deno.env.get('FRONTEND_ORIGINS') ?? 'http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:5174').split(',').map(value => value.trim()));
const cors = (request: Request) => allowedOrigins.has(request.headers.get('Origin') ?? '') ? {'Access-Control-Allow-Origin':request.headers.get('Origin')!,Vary:'Origin'} : {};
const env = (name:string) => { const value=Deno.env.get(name); if(!value) throw new Error(`Falta ${name}.`); return value; };

Deno.serve(async request => {
 try {
  if(request.method==='OPTIONS') return new Response(null,{headers:{...cors(request),'Access-Control-Allow-Headers':'authorization,content-type'}});
  if(request.method!=='POST') return Response.json({message:'Método no permitido.'},{status:405,headers:cors(request)});
  const authorization=request.headers.get('Authorization'); if(!authorization) throw new Error('No autorizado.');
  const {upload_id}=await request.json() as {upload_id?:string}; if(!upload_id) throw new Error('Carga no válida.');
  const url=env('SUPABASE_URL'),anon=env('SUPABASE_ANON_KEY'),serviceKey=env('SUPABASE_SERVICE_ROLE_KEY');
  const user=createClient(url,anon,{auth:{persistSession:false},global:{headers:{Authorization:authorization}}});
  const {data:owned,error:ownedError}=await user.schema('api').rpc('get_secure_upload_status',{p_upload_id:upload_id});
  if(ownedError||!owned?.length||owned[0].status!=='uploaded') throw new Error('La carga no está lista para analizar.');
  const service=createClient(url,serviceKey,{auth:{persistSession:false}});
  const {data:claimed,error:claimError}=await service.schema('api').rpc('claim_secure_upload_for_service',{p_upload_id:upload_id});
  const file=claimed?.[0]; if(claimError||!file) throw new Error('La carga ya fue procesada o venció.');
  const scannerUrl=env('FILE_SECURITY_SCANNER_URL'),scannerToken=env('FILE_SECURITY_SCANNER_TOKEN');
  const {data:blob,error:downloadError}=await service.storage.from('upload-quarantine').download(file.quarantine_path);
  if(downloadError||!blob) throw new Error('No se pudo leer la carga en cuarentena.');
  const scan=await fetch(scannerUrl,{method:'POST',headers:{Authorization:`Bearer ${scannerToken}`,'Content-Type':file.declared_mime,'X-File-Kind':file.kind,'X-Upload-Id':upload_id},body:blob});
  const scanner=scan.headers.get('X-Scanner-Name')??'private-scanner'; const version=scan.headers.get('X-Scanner-Version')??'unknown';
  if(!scan.ok) {
   const code=scan.status===422?(scan.headers.get('X-Rejection-Code')==='malware'?'malware':'invalid_content'):'scanner_unavailable';
   await service.schema('api').rpc('finish_secure_upload_for_service',{p_upload_id:upload_id,p_clean:false,p_final_path:null,p_failure_code:code,p_scanner:scanner,p_scanner_version:version});
   await service.storage.from('upload-quarantine').remove([file.quarantine_path]);
   return Response.json({status:'rejected',code},{status:422,headers:cors(request)});
  }
  const safeBytes=await scan.arrayBuffer(); if(!safeBytes.byteLength||safeBytes.byteLength>10485760) throw new Error('El procesador devolvió un archivo inválido.');
  const extension=file.kind==='library_pdf'?'pdf':file.declared_mime==='image/jpeg'?'jpg':file.declared_mime==='image/png'?'png':'webp';
  const finalBucket=file.kind==='library_pdf'?'educational-documents':'consultorio-branding';
  const finalPath=file.kind==='library_pdf'?`${file.owner_user_id}/${file.organization_id}/${upload_id}.${extension}`:`${file.organization_id}/${upload_id}.${extension}`;
  const {error:uploadError}=await service.storage.from(finalBucket).upload(finalPath,safeBytes,{contentType:file.declared_mime,upsert:false});
  if(uploadError) throw new Error('No se pudo guardar el archivo procesado.');
  const {error:finishError}=await service.schema('api').rpc('finish_secure_upload_for_service',{p_upload_id:upload_id,p_clean:true,p_final_path:finalPath,p_failure_code:null,p_scanner:scanner,p_scanner_version:version});
  if(finishError){await service.storage.from(finalBucket).remove([finalPath]);throw new Error('No se pudo confirmar el control de seguridad.');}
  await service.storage.from('upload-quarantine').remove([file.quarantine_path]);
  return Response.json({status:'clean',path:finalPath},{headers:cors(request)});
 } catch(error) {
  return Response.json({message:error instanceof Error?error.message:'No se pudo analizar el archivo.'},{status:400,headers:cors(request)});
 }
});
