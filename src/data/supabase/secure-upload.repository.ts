import { z } from 'zod';
import { getSupabaseClient } from '../../auth/supabase-client';

export type SecureUploadKind = 'library_pdf'|'branding_logo'|'branding_patient_header'|'branding_professional_header';
const reservationSchema=z.object({upload_id:z.string().uuid(),bucket_id:z.string(),object_path:z.string(),status:z.literal('reserved')});
const workerSchema=z.object({status:z.literal('clean'),path:z.string()});

export async function secureUpload(file:File,organizationId:string,kind:SecureUploadKind) {
 const client=getSupabaseClient();
 const {data,error}=await client.schema('api').rpc('reserve_secure_upload',{p_organization_id:organizationId,p_kind:kind,p_filename:file.name,p_mime:file.type,p_size:file.size});
 if(error) throw new Error(error.message||'No pudimos reservar espacio para el archivo.');
 const reservation=reservationSchema.parse(data?.[0]);
 const {error:uploadError}=await client.storage.from(reservation.bucket_id).upload(reservation.object_path,file,{contentType:file.type,upsert:false});
 if(uploadError) throw new Error('No pudimos colocar el archivo en cuarentena. Reintentá.');
 const {error:confirmError}=await client.schema('api').rpc('confirm_secure_upload',{p_upload_id:reservation.upload_id});
 if(confirmError) throw new Error('La carga no coincide con la reserva segura. Volvé a seleccionarla.');
 const {data:processed,error:workerError}=await client.functions.invoke('file-security-worker',{body:{upload_id:reservation.upload_id}});
 if(workerError) throw new Error('El control de seguridad no está disponible. El archivo no fue publicado.');
 const result=workerSchema.safeParse(processed);
 if(!result.success) throw new Error('El archivo no superó el control de seguridad y no fue publicado.');
 return result.data.path;
}

export async function sanitizeBrandImage(file:File,kind:Exclude<SecureUploadKind,'library_pdf'>) {
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size===0||file.size>2097152) throw new Error('Usá JPG, PNG o WebP de hasta 2 MB.');
 const bitmap=await createImageBitmap(file);
 try {
  if(bitmap.width<16||bitmap.height<16||bitmap.width*bitmap.height>20000000) throw new Error('La imagen debe tener entre 16 píxeles y 20 megapíxeles.');
  const max=kind==='branding_logo'?1024:2400; const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const context=canvas.getContext('2d',{alpha:true});if(!context)throw new Error('Este navegador no pudo procesar la imagen.');
  context.drawImage(bitmap,0,0,canvas.width,canvas.height);
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',0.88));
  if(!blob||blob.size===0||blob.size>2097152)throw new Error('La imagen procesada supera 2 MB. Reducí sus dimensiones.');
  return new File([blob],file.name.replace(/\.[^.]+$/,'.webp'),{type:'image/webp'});
 } finally {bitmap.close();}
}
