import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { z } from 'zod';
import { Building2, Image as ImageIcon, Palette, RotateCcw, Save } from 'lucide-react';
import { getSupabaseClient } from '../../auth/supabase-client';
import { organizationBrandingStyle } from '../../lib/organizationBranding';
import type { OrganizationBranding } from '../../types';
import { BrandingColorPreview } from './BrandingColorPreview';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { sanitizeBrandImage, secureUpload, type SecureUploadKind } from '../../data/supabase/secure-upload.repository';

const settingSchema = z.object({ displayName: z.string().optional(), tagline: z.string().optional(), colorPreset: z.enum(['aqua','ocean','forest','violet','coral','teal','indigo','rose','olive','slate']).optional(), contactPhone:z.string().optional(),contactEmail:z.string().optional(),contactAddress:z.string().optional(),logoPath:z.string().optional(),patientHeaderPath:z.string().optional(),professionalHeaderPath:z.string().optional() });
const rowSchema = z.object({ organization_id:z.string(),name:z.string(),enabled:z.boolean(),can_edit:z.boolean(),settings:settingSchema,updated_at:z.string().nullable() });
type BrandRow = z.infer<typeof rowSchema>;
type Settings = z.infer<typeof settingSchema>;
type Assets = Pick<OrganizationBranding,'logoDataUrl'|'patientHeaderImageDataUrl'|'professionalHeaderImageDataUrl'>;
const assetKeys = {logoPath:'logoDataUrl',patientHeaderPath:'patientHeaderImageDataUrl',professionalHeaderPath:'professionalHeaderImageDataUrl'} as const;
const BrandContext = createContext<{rows:BrandRow[];reload:()=>Promise<void>;error:string;loading:boolean;brand?:OrganizationBranding}>({rows:[],reload:async()=>{},error:'',loading:true});
export async function loadRealBrandAssets(settings:Settings):Promise<Assets> {
  const result:Assets = {};
  for(const [key,target] of Object.entries(assetKeys)) {
    const path = settings[key as keyof typeof assetKeys];
    if(!path) continue;
    const {data,error} = await getSupabaseClient().storage.from('consultorio-branding').createSignedUrl(path,300);
    if(!error && data) result[target as keyof Assets] = data.signedUrl;
  }
  return result;
}
export function RealBrandingProvider({children}:{children:ReactNode}) {
  const [rows,setRows]=useState<BrandRow[]>([]); const [error,setError]=useState(''); const [loading,setLoading]=useState(true); const [assets,setAssets]=useState<Assets>({});
  async function reload() {
    try { const {data,error:problem}=await getSupabaseClient().schema('api').rpc('get_my_branding'); if(problem) throw problem; setRows(z.array(rowSchema).parse(data)); setError(''); }
    catch {setRows([]);setError('No pudimos consultar la marca. Reintentá.');} finally {setLoading(false);}
  }
  useEffect(()=>{void reload();const timer=setInterval(()=>void reload(),240000);return()=>clearInterval(timer);},[]);
  // No inferir un consultorio si la sesión puede operar más de uno.
  const current=rows.length===1&&rows[0]?.enabled?rows[0]:undefined;
  useEffect(()=>{let active=true;setAssets({});if(current) void loadRealBrandAssets(current.settings).then(value=>{if(active)setAssets(value);});return()=>{active=false;};},[current]);
  const brand:OrganizationBranding|undefined=current?{...current.settings,displayName:current.settings.displayName||current.name,colorPreset:current.settings.colorPreset||'aqua',...assets}:undefined;
  return <BrandContext.Provider value={{rows,reload,error,loading,brand}}><div style={organizationBrandingStyle(brand)}>{children}</div></BrandContext.Provider>;
}
export function useRealBranding() { return useContext(BrandContext); }
export function RealBrandIdentity({patient=false}:{patient?:boolean}) {
  const {brand}=useContext(BrandContext);
  return <div className="flex min-w-0 items-center gap-2">{brand?.logoDataUrl?<img src={brand.logoDataUrl} alt="Logo del consultorio" className="h-9 w-9 shrink-0 rounded-xl object-contain"/>:<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft font-bold">N</span>}<div className="min-w-0"><p className="break-words text-sm font-bold">{brand?.displayName||'NutriSoft'}</p><p className="text-[10px] text-text-secondary">{brand?'Con NutriSoft':patient?'Portal del paciente':'Portal profesional'}</p></div></div>;
}
export function RealBrandHeader({patient=false}:{patient?:boolean}) {
 const {brand}=useContext(BrandContext); const src=patient?brand?.patientHeaderImageDataUrl:brand?.professionalHeaderImageDataUrl;
 if(!brand || !(src || brand.tagline || brand.contactPhone || brand.contactEmail || brand.contactAddress)) return null;
 const email=brand.contactEmail?.trim();
 const phone=brand.contactPhone?.trim();
 const validEmail=email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
 const validPhone=phone && /^\+?[\d\s().-]+$/.test(phone);
 return <section aria-label={`Información de ${brand.displayName}`} className="mx-auto max-w-6xl px-4 pt-4"><div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface">
 {src&&<img src={src} alt={`Cabecera de ${brand.displayName}`} className="aspect-[8/3] max-h-64 w-full object-cover object-center"/>}
 {(brand.tagline||phone||email||brand.contactAddress)&&<div className="space-y-2 p-4 sm:p-5">
 <p className="break-words font-semibold">{brand.displayName}</p>
 {brand.tagline&&<p className="break-words text-sm text-text-secondary">{brand.tagline}</p>}
 <address className="flex min-w-0 flex-col gap-x-6 gap-y-1 text-sm not-italic sm:flex-row sm:flex-wrap">
 {phone&&(validPhone?<a className="min-h-11 inline-flex items-center break-all text-brand-strong underline underline-offset-4" href={`tel:${phone.replace(/[\s().-]/g,'')}`}>{phone}</a>:<span className="break-all">{phone}</span>)}
 {email&&(validEmail?<a className="min-h-11 inline-flex items-center break-all text-brand-strong underline underline-offset-4" href={`mailto:${encodeURIComponent(email)}`}>{email}</a>:<span className="break-all">{email}</span>)}
 {brand.contactAddress&&<span className="inline-flex min-h-11 items-center break-words">{brand.contactAddress}</span>}
 </address></div>}
 </div></section>;
}
export function RealBrandingSettings() {
 const {rows,reload,error,loading}=useContext(BrandContext); const [org,setOrg]=useState(''); const [revision,setRevision]=useState(0); const [saved,setSaved]=useState(false); const row=rows.find(r=>r.organization_id===org)??rows[0];
 async function refreshEditor(wasSaved=false){await reload();setRevision(v=>v+1);setSaved(wasSaved);}
 if(loading)return <Card><p role="status">Cargando marca…</p></Card>;
 if(error)return <Card><p role="alert">{error}</p><Button onClick={()=>void reload()}>Reintentar</Button></Card>;
 if(!row)return null;
 return <div className="space-y-3">{rows.length>1&&<><label className="form-label">Consultorio para personalizar<select className="form-control" value={row.organization_id} onChange={e=>setOrg(e.target.value)}>{rows.map(r=><option key={r.organization_id} value={r.organization_id}>{r.name}</option>)}</select></label><p className="text-xs">En sesiones con varios consultorios la navegación conserva la marca neutral para evitar mezclas.</p></>}
 {saved&&<p role="status" className="text-sm text-brand-strong">Marca guardada. Ya se aplica a los portales de este consultorio.</p>}
 <BrandEditor key={`${row.organization_id}:${row.updated_at}:${revision}`} row={row} reload={refreshEditor}/></div>;
}
function BrandEditor({row,reload}:{row:BrandRow;reload:(saved?:boolean)=>Promise<void>}) {
 const [settings,setSettings]=useState<Settings>({...row.settings,displayName:row.settings.displayName||row.name,colorPreset:row.settings.colorPreset||'aqua'});
 const [assets,setAssets]=useState<Assets>({}); const [busy,setBusy]=useState(false); const [message,setMessage]=useState('');
 useEffect(()=>{let active=true;void loadRealBrandAssets(row.settings).then(v=>{if(active)setAssets(v);});return()=>{active=false;};},[row.settings]);
 if(!row.enabled)return <Card><h2 className="font-bold">Marca del consultorio</h2><p className="text-sm">Exclusiva de Custom. Al deshabilitarla, los archivos y la configuración se conservan pero dejan de aplicarse.</p></Card>;
 if(!row.can_edit)return <Card><h2 className="font-bold">Marca del consultorio · Custom</h2><p className="text-sm">Sólo el responsable de {row.name} puede modificar logo, colores y cabeceras.</p></Card>;
 async function upload(file:File|undefined,key:keyof typeof assetKeys) {
   if(!file)return;setMessage('');
   if(file.size>2097152||!['image/jpeg','image/png','image/webp'].includes(file.type)){setMessage('Usá JPG, PNG o WebP de hasta 2 MB.');return;}
   setBusy(true);
   try {
     const kinds:Record<keyof typeof assetKeys,SecureUploadKind>={logoPath:'branding_logo',patientHeaderPath:'branding_patient_header',professionalHeaderPath:'branding_professional_header'};
     const safeFile=await sanitizeBrandImage(file,kinds[key] as Exclude<SecureUploadKind,'library_pdf'>);
     const path=await secureUpload(safeFile,row.organization_id,kinds[key]);
     const next={...settings,[key]:path};setSettings(next);setAssets(await loadRealBrandAssets(next));
   }catch(e){setMessage(e instanceof Error?e.message:'Imagen no válida.');}finally{setBusy(false);}
 }
 async function save(){setBusy(true);setMessage('');try{const {error}=await getSupabaseClient().schema('api').rpc('save_organization_branding',{p_org:row.organization_id,p_settings:settings,p_expected:row.updated_at??undefined});if(error)throw new Error('No se guardó. Revisá los campos; si otra persona modificó la marca, recargá.');await reload(true);}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
 const uploadOptions = [
   ['logoPath','Logo','Identidad principal','512 × 512 px'],
   ['professionalHeaderPath','Cabecera profesional','Inicio del profesional','1600 × 600 px'],
   ['patientHeaderPath','Cabecera del paciente','Inicio del paciente','1600 × 600 px'],
 ] as const;
 return <Card className="!p-0 overflow-hidden">
   <div className="border-b border-border-subtle bg-surface-subtle px-4 py-4 sm:px-6">
     <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-strong"><Building2 className="h-5 w-5"/></span><div><h2 className="font-bold">Marca del consultorio · Custom</h2><p className="mt-1 text-sm text-text-secondary">Personalizá la identidad de ambos portales. Nada se aplica hasta que guardes.</p></div></div>
   </div>
   <fieldset disabled={busy} className="space-y-6 p-4 sm:p-6">
     <div className="space-y-3">
       <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-brand-strong"/><h3 id="brand-identity-title" className="text-sm font-bold">Identidad y contacto</h3></div>
       <div className="grid gap-3 sm:grid-cols-2">
         {([['displayName','Nombre visible'],['tagline','Texto breve'],['contactPhone','Teléfono'],['contactEmail','Email'],['contactAddress','Dirección o modalidad']] as const).map(([key,label])=><label className={`form-label ${key==='contactAddress'?'sm:col-span-2':''}`} key={key}>{label}<input className="form-control" maxLength={key==='displayName'?80:300} value={settings[key]||''} onChange={e=>setSettings(v=>({...v,[key]:e.target.value}))}/></label>)}
       </div>
     </div>

     <div className="space-y-3">
       <div><div className="flex items-center gap-2"><ImageIcon className="h-4 w-4 text-brand-strong"/><h3 id="brand-images-title" className="text-sm font-bold">Imágenes</h3></div><p className="mt-1 text-xs text-text-secondary">JPG, PNG o WebP de hasta 2 MB. Las cabeceras son independientes y usan recorte centrado.</p></div>
       <div className="grid gap-3 lg:grid-cols-3">
         {uploadOptions.map(([key,label,description,recommended])=>{
           const preview=assets[assetKeys[key]];
           return <div key={key} className="overflow-hidden rounded-xl border border-border-subtle bg-surface-subtle">
             <div className={`grid place-items-center overflow-hidden bg-brand-soft ${key==='logoPath'?'h-28':'aspect-[8/3] min-h-28'}`}>{preview?<img src={preview} alt={`Vista previa de ${label.toLowerCase()}`} className="h-full w-full object-cover"/>:<ImageIcon className="h-7 w-7 text-brand-strong/50"/>}</div>
             <div className="space-y-2 p-3"><div><p className="text-xs font-bold">{label}</p><p className="text-[11px] text-text-secondary">{description} · {recommended}</p></div><label className="inline-flex min-h-9 cursor-pointer items-center rounded-lg border border-border-subtle bg-surface px-3 text-xs font-semibold hover:border-border-hover">{settings[key]?'Reemplazar':'Seleccionar imagen'}<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>void upload(e.target.files?.[0],key)}/></label>{settings[key]&&<Button variant="ghost" size="sm" onClick={()=>{setSettings(v=>({...v,[key]:''}));setAssets(v=>({...v,[assetKeys[key]]:undefined}));}}>Quitar</Button>}</div>
           </div>;
         })}
       </div>
     </div>

     <div className="space-y-3">
       <div className="flex items-center gap-2"><Palette className="h-4 w-4 text-brand-strong"/><h3 id="brand-colors-title" className="text-sm font-bold">Color y vista previa</h3></div>
       <BrandingColorPreview branding={{...settings,displayName:settings.displayName||'',colorPreset:settings.colorPreset||'aqua',...assets}} onChange={colorPreset=>setSettings(v=>({...v,colorPreset}))}/>
     </div>

     {message&&<p role="alert" className="rounded-xl border border-semantic-critical/30 bg-semantic-critical-bg p-3 text-sm text-semantic-critical">{message}</p>}
     <div className="sticky bottom-0 -mx-4 -mb-4 flex flex-col-reverse gap-2 border-t border-border-subtle bg-surface/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:flex-row sm:justify-end sm:px-6">
       <Button variant="ghost" disabled={busy} onClick={()=>void reload()}><RotateCcw className="h-4 w-4"/>Recargar marca guardada</Button>
       <Button disabled={busy||!settings.displayName?.trim()} onClick={()=>void save()}><Save className="h-4 w-4"/>{busy?'Guardando…':'Guardar marca'}</Button>
     </div>
   </fieldset>
 </Card>;
}
