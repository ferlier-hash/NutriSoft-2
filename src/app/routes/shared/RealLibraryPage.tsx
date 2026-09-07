import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { CookingPot, FileText, Search, Plus } from 'lucide-react';
import { useAuth } from '../../../auth/AuthProvider';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Dialog } from '../../../components/ui/Dialog';
import { loadLibrary, saveLibrary, uploadLibraryPdf, downloadLibraryPdf, type LibraryContent, type LibraryBody } from '../../../data/supabase/library.repository';

const labels = { published: 'Publicado', draft: 'Borrador', retired: 'Retirado' };
const categories = ['Desayunos','Almuerzos','Cenas','Snacks'];
const safeUrl = (value?: string) => { try { return value && new URL(value).protocol === 'https:' ? value : undefined; } catch { return undefined; } };

export function RealLibraryPage({ recipes, patient = false }: { recipes: boolean; patient?: boolean }) {
  const { accessContext } = useAuth();
  const { recipeId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<LibraryContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [tag, setTag] = useState('');
  const [kind, setKind] = useState('');
  const [selected, setSelected] = useState<LibraryContent | null>(null);
  const [editor, setEditor] = useState<Partial<LibraryContent> | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setSelected(null); setEditor(null); setSearch(''); setCategory(''); setStatus(''); setTag(''); setKind(''); }, [recipes,patient]);
  const orgs = accessContext?.memberships.filter(m => m.role==='nutritionist' && m.organization_status==='active') ?? [];
  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try { setItems(await loadLibrary()); } catch (e) { setItems([]); setError((e as Error).message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); const listener = () => void refresh(); window.addEventListener('focus',listener); return () => window.removeEventListener('focus',listener); }, [refresh]);
  const visible = items.filter(i => recipes ? i.kind==='recipe' : i.kind!=='recipe');
  const filtered = visible.filter(i => (!patient || i.status==='published') && `${i.title} ${i.category} ${i.body.tags ?? ''}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()) && (!category || i.category===category) && (!status || i.status===status) && (!kind || i.kind===kind) && (!tag || (i.body.tags ?? '').split(',').map(t=>t.trim()).includes(tag)));
  const detail = recipeId ? items.find(i=>i.id===recipeId && i.kind==='recipe') : selected && items.find(i=>i.id===selected.id);
  const action = async (run: () => Promise<unknown>) => {
    setBusy(true); setError('');
    try { await run(); setSelected(null); await refresh(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const openNew = () => setEditor({ organization_id:orgs[0]?.organization_id, kind:recipes?'recipe':'document',title:'',category:recipes?'Desayunos':'Guías',status:'draft',body:recipes?{ minutes:20,servings:2 }:{} });
  return <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-5">
    <Link className="text-sm text-brand-strong inline-flex min-h-11 items-center" to={patient?'/patient':'/professional'}>← Volver al inicio</Link>
    <div className="flex flex-wrap justify-between items-center gap-3"><div><h1 className="text-2xl font-bold flex gap-2 items-center">{recipes?<CookingPot className="text-brand-strong" />:<FileText className="text-brand-strong" />}{recipes?'Recetario':'Recursos'}</h1><p className="text-sm text-text-secondary mt-1">{patient?'Contenido publicado por tus profesionales asignados.':'Tu biblioteca privada. Sólo lo publicado llega a tus pacientes asignados.'}</p></div>{!patient && <Button disabled={!orgs.length} onClick={openNew}><Plus className="w-4 h-4" />{recipes?'Nueva receta':'Agregar recurso'}</Button>}</div>
    {error && <Card><p role="alert" className="text-semantic-critical">{error}</p><Button variant="secondary" onClick={()=>void refresh()}>Reintentar</Button></Card>}
    <Card className="space-y-4">
      <div className="relative"><Search className="absolute left-3 top-3 w-4 h-4 text-text-tertiary" /><input aria-label="Buscar en la biblioteca" className="form-control pl-11" placeholder="Buscar por nombre, categoría o etiqueta…" value={search} onChange={e=>setSearch(e.target.value)} /></div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <select aria-label="Categoría" className="form-control" value={category} onChange={e=>setCategory(e.target.value)}><option value="">Todas las categorías</option>{Array.from(new Set(visible.map(i=>i.category))).sort().map(c=><option key={c}>{c}</option>)}</select>
        {!patient && <select aria-label="Estado editorial" className="form-control" value={status} onChange={e=>setStatus(e.target.value)}><option value="">Todos los estados</option>{Object.entries(labels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>}
        {recipes?<select aria-label="Etiqueta" className="form-control" value={tag} onChange={e=>setTag(e.target.value)}><option value="">Todas las etiquetas</option>{Array.from(new Set(visible.flatMap(i=>(i.body.tags??'').split(',').map(t=>t.trim()).filter(Boolean)))).map(t=><option key={t}>{t}</option>)}</select>:<select aria-label="Tipo de recurso" className="form-control" value={kind} onChange={e=>setKind(e.target.value)}><option value="">Todos los tipos</option><option value="document">PDF</option><option value="video">Enlace / video</option></select>}
        <Button variant="ghost" onClick={()=>{setSearch('');setCategory('');setStatus('');setTag('');setKind('');}}>Limpiar filtros</Button>
      </div>
    </Card>
    {loading?<p role="status">Cargando biblioteca…</p>:<><p className="text-xs text-text-secondary">{filtered.length} {recipes?'recetas':'recursos'}</p>{!filtered.length?<Card className="py-10 text-center">{visible.length?'No encontramos resultados con estos filtros.':patient?'Tu profesional todavía no publicó contenido.':'Creá tu primer contenido para empezar.'}</Card>:<div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${recipes?'':'2xl:grid-cols-4'} gap-4`}>{filtered.map(i=><Card key={i.id} className="!p-0 overflow-hidden flex flex-col">
      <button className="text-left flex-1 min-w-0" onClick={()=>setSelected(i)}>
        {recipes && (safeUrl(i.body.image)?<img src={safeUrl(i.body.image)} alt="" referrerPolicy="no-referrer" className="h-36 w-full object-cover" />:<div className="h-28 bg-brand-soft flex items-center justify-center"><CookingPot className="text-brand-strong w-8 h-8" /></div>)}
        <div className="p-4 space-y-2"><div className="flex flex-wrap gap-2"><Badge variant="info">{i.category}</Badge>{!patient && <Badge variant={i.status==='published'?'active':'neutral'}>{labels[i.status]}</Badge>}</div><h2 className="font-bold text-base break-words">{i.title}</h2><p className="text-xs text-text-secondary">{recipes?`${i.body.minutes} min · ${i.body.servings} porciones`:i.kind==='document'?'Documento PDF':'Enlace educativo'}</p>{recipes && <p className="text-xs text-text-secondary break-words">{i.body.tags}</p>}</div>
      </button>
      {!patient && <div className="p-3 border-t border-border-subtle flex flex-wrap gap-1"><Button variant="ghost" onClick={()=>{setEditor(i);setError('');}}>Editar</Button><Button disabled={busy} variant="secondary" onClick={()=>void action(()=>saveLibrary({...i,status:i.status==='published'?'retired':i.status==='draft'?'published':'draft'}))}>{i.status==='published'?'Retirar':i.status==='draft'?'Publicar':'Restaurar'}</Button>{recipes && <Button variant="ghost" disabled={busy} onClick={()=>void action(()=>saveLibrary({...i,id:undefined,updated_at:undefined,title:`${i.title.slice(0,150)} (copia)`,status:'draft',body:{...i.body,sourceTitle:i.title}}))}>Duplicar</Button>}</div>}
    </Card>)}</div>}</>}
    {recipeId && !loading && !detail && <Card>Receta no disponible. Puede haber sido retirada o no estar autorizada para tu cuenta.</Card>}
    <Dialog isOpen={Boolean(detail)} onClose={()=>{setSelected(null); if(recipeId) navigate(`/${patient?'patient':'professional'}/recipes`);}} title={detail?.title??'Contenido'}>
      {detail && <div className="space-y-4">{detail.kind==='recipe'?<><p className="text-sm text-text-secondary">{detail.body.minutes} min · {detail.body.servings} porciones</p>{safeUrl(detail.body.image) && <img alt="" src={safeUrl(detail.body.image)} referrerPolicy="no-referrer" className="w-full h-40 rounded-xl object-cover" />}<h3 className="font-semibold">Ingredientes</h3><p className="whitespace-pre-wrap text-sm">{detail.body.ingredients}</p><h3 className="font-semibold">Preparación</h3><p className="whitespace-pre-wrap text-sm">{detail.body.steps}</p><div className="flex flex-wrap gap-3 text-xs">{(['calories','protein','carbs','fat'] as const).map((k,index)=>detail.body[k]!=null && <span key={k}>{['kcal','Proteínas (g)','Carbohidratos (g)','Grasas (g)'][index]}: {detail.body[k]}</span>)}</div>{detail.body.sourceTitle && <p className="text-xs text-text-secondary">Copia de: {detail.body.sourceTitle}</p>}</>:detail.kind==='document'?<Button disabled={busy} onClick={()=>void action(()=>downloadLibraryPdf(detail))}>Descargar PDF</Button>:<a className="text-brand-strong underline" href={safeUrl(detail.body.url)} target="_blank" rel="noreferrer">Abrir enlace educativo ↗</a>}</div>}
    </Dialog>
    {editor && <LibraryEditor key={editor.id??'new'} initial={editor} orgs={orgs.map(m=>m.organization_id)} busy={busy} onClose={()=>setEditor(null)} onSave={async item=>{setBusy(true);try {await saveLibrary(item);setEditor(null);await refresh();} finally {setBusy(false);}}} />}
  </div>;
}

function LibraryEditor({ initial,orgs,busy,onClose,onSave }: { initial:Partial<LibraryContent>;orgs:string[];busy:boolean;onClose:()=>void;onSave:(item:Omit<LibraryContent,'id'|'owner_user_id'|'updated_at'> & {id?:string;updated_at?:string})=>Promise<void> }) {
  const [title,setTitle]=useState(initial.title??''); const [category,setCategory]=useState(initial.category??'');
  const [kind,setKind]=useState(initial.kind??'recipe'); const [body,setBody]=useState<LibraryBody>(initial.body??{});
  const [org,setOrg]=useState(initial.organization_id??orgs[0]??''); const [file,setFile]=useState<File|null>(null);
  const [error,setError]=useState(''); const [uploading,setUploading]=useState(false);
  const patch=(key:keyof LibraryBody,value:string|number|null)=>setBody(b=>({...b,[key]:value}));
  const submit=async(status:LibraryContent['status'])=>{setError('');setUploading(true);try {let next=body;if(kind==='document' && file){const path=await uploadLibraryPdf(file,org);next={path,filename:file.name};setBody(next);setFile(null);}await onSave({...initial,organization_id:org,kind,title,category,status,body:next});}catch(e){setError((e as Error).message);}finally{setUploading(false);}};
  return <Dialog isOpen onClose={()=>{if(!busy&&!uploading)onClose();}} title={initial.id?'Editar contenido':'Nuevo contenido'} description="Guardá en privado o publicá para tus pacientes. No incluyas información clínica identificable en esta biblioteca.">
    <form className="space-y-4" onSubmit={e=>{e.preventDefault(); const intent=(e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement|null;void submit(intent?.value==='published'?'published':initial.id?initial.status??'draft':'draft');}}>
      {error && <p role="alert" className="text-sm text-semantic-critical">{error}</p>}
      {!initial.id && orgs.length>1 && <label className="block form-label">Consultorio<select className="form-control" value={org} onChange={e=>setOrg(e.target.value)}>{orgs.map((id,index)=><option key={id} value={id}>Consultorio {index+1} · {id.slice(0,8)}</option>)}</select></label>}
      <label className="block form-label">Título *<input className="form-control" required maxLength={160} value={title} onChange={e=>setTitle(e.target.value)} /></label>
      <label className="block form-label">Categoría *{kind==='recipe'?<select className="form-control" value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select>:<input className="form-control" required maxLength={80} value={category} onChange={e=>setCategory(e.target.value)} />}</label>
      {kind==='recipe'?<>
        <label className="block form-label">Etiquetas, separadas por coma<input className="form-control" maxLength={500} value={body.tags??''} onChange={e=>patch('tags',e.target.value)} /></label>
        <div className="grid grid-cols-2 gap-3">{(['minutes','servings','calories','protein','carbs','fat'] as const).map((k,index)=><label key={k} className="block form-label">{['Minutos *','Porciones *','Calorías (opcional)','Proteínas g (opcional)','Carbohidratos g (opcional)','Grasas g (opcional)'][index]}<input className="form-control" type="number" step="any" min={index<2?0.1:0} max={100000} required={index<2} value={body[k]??''} onChange={e=>patch(k,e.target.value===''?null:Number(e.target.value))} /></label>)}</div>
        <label className="block form-label">Ingredientes * · uno por línea<textarea className="form-control" rows={4} required maxLength={15000} value={body.ingredients??''} onChange={e=>patch('ingredients',e.target.value)} /></label>
        <label className="block form-label">Preparación * · un paso por línea<textarea className="form-control" rows={4} required maxLength={15000} value={body.steps??''} onChange={e=>patch('steps',e.target.value)} /></label>
        <label className="block form-label">URL HTTPS de fotografía (opcional)<input type="url" pattern="https://.*" className="form-control" value={body.image??''} onChange={e=>patch('image',e.target.value)} /></label>
      </>:<><label className="block form-label">Tipo<select className="form-control" value={kind} onChange={e=>{setKind(e.target.value as 'document'|'video');setBody({});setFile(null);}}><option value="document">PDF</option><option value="video">Enlace / video</option></select></label>{kind==='document'?<label className="block form-label">PDF · hasta 10 MB<input className="form-control" type="file" accept="application/pdf" required={!body.path} onChange={e=>setFile(e.target.files?.[0]??null)} /><span className="text-xs font-normal break-all">{file?.name??body.filename??'Almacenamiento privado'}</span></label>:<label className="block form-label">Enlace HTTPS *<input className="form-control" type="url" pattern="https://.*" required value={body.url??''} onChange={e=>patch('url',e.target.value)} /></label>}</>}
      <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="ghost" disabled={busy||uploading} onClick={onClose}>Cancelar</Button><Button type="submit" variant="secondary" value="draft" disabled={busy||uploading}>{busy||uploading?'Guardando…':initial.id?'Guardar cambios':'Guardar borrador'}</Button>{!initial.id && <Button type="submit" value="published" disabled={busy||uploading}>Publicar</Button>}</div>
    </form>
  </Dialog>;
}
