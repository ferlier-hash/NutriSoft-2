import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ExternalLink, FileText, FileUp, HardDrive, Library, Link2, Pencil, Plus, Search, ShieldAlert, Video, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../auth/AuthProvider';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Dialog } from '../../../components/ui/Dialog';
import { useToast } from '../../../components/ui/Toast';
import { MobileFilters } from '../../../components/ui/MobileFilters';
import { MobileActions } from '../../../components/ui/MobileActions';
import { downloadLibraryPdf, loadLibrary, loadLibrarySettings, saveLibrary, uploadLibraryPdf, type LibraryContent, type LibrarySettings } from '../../../data/supabase/library.repository';

type Resource = LibraryContent & { kind: 'document' | 'video' };
const statusLabels = { published: 'Publicado', draft: 'Borrador', retired: 'Retirado' } as const;

function safeUrl(value?: string) {
  try { return value && new URL(value).protocol === 'https:' ? value : undefined; } catch { return undefined; }
}
function formatBytes(value: number) { return value >= 1024*1024 ? `${(value/(1024*1024)).toLocaleString('es-AR',{maximumFractionDigits:1})} MB` : `${Math.max(0,value/1024).toLocaleString('es-AR',{maximumFractionDigits:0})} KB`; }

export function RealResourcesPage() {
  const { accessContext } = useAuth();
  const { showToast } = useToast();
  const organizations = useMemo(() => accessContext?.memberships.filter(item => item.role === 'nutritionist' && item.membership_status === 'active' && item.organization_status === 'active') ?? [], [accessContext]);
  const [organizationId, setOrganizationId] = useState('');
  const [resources, setResources] = useState<Resource[]>([]);
  const [librarySettings, setLibrarySettings] = useState<LibrarySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('');
  const [status, setStatus] = useState('');
  const [editor, setEditor] = useState<Resource | 'new' | null>(null);

  useEffect(() => { if (!organizationId && organizations[0]) setOrganizationId(organizations[0].organization_id); }, [organizationId, organizations]);
  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [library, settings] = await Promise.all([loadLibrary(), organizationId ? loadLibrarySettings(organizationId) : Promise.resolve(null)]);
      setResources(library.filter((item): item is Resource => item.kind === 'document' || item.kind === 'video'));
      setLibrarySettings(settings);
    } catch (cause) { setResources([]); setError(cause instanceof Error ? cause.message : 'No pudimos cargar los recursos.'); }
    finally { setLoading(false); }
  }, [organizationId]);
  useEffect(() => { void refresh(); }, [refresh]);

  const scoped = useMemo(() => resources.filter(item => !organizationId || item.organization_id === organizationId), [organizationId, resources]);
  const filtered = useMemo(() => scoped.filter(item => `${item.title} ${item.category} ${item.body.filename ?? ''}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()) && (!kind || item.kind === kind) && (!status || item.status === status)), [kind, scoped, search, status]);
  const selectedOrganization = organizations.find(item => item.organization_id === organizationId) ?? organizations[0];
  const counts = { total: scoped.length, published: scoped.filter(item => item.status === 'published').length, documents: scoped.filter(item => item.kind === 'document').length, links: scoped.filter(item => item.kind === 'video').length };
  const hasFilters = Boolean(search || kind || status);
  const clearFilters = () => { setSearch(''); setKind(''); setStatus(''); };
  const runAction = async (operation: () => Promise<unknown>, title: string, description: string) => {
    setBusy(true); setError('');
    try { await operation(); await refresh(); showToast(title, description); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos completar la acción.'); }
    finally { setBusy(false); }
  };
  const changeStatus = (resource: Resource) => {
    const next = resource.status === 'published' ? 'retired' : resource.status === 'draft' ? 'published' : 'draft';
    return runAction(() => saveLibrary({ ...resource, status: next }), next === 'published' ? 'Recurso publicado' : next === 'retired' ? 'Recurso retirado' : 'Borrador restaurado', next === 'published' ? 'Ya está disponible para tus pacientes asignados.' : 'El recurso se conservó, pero dejó de estar visible para pacientes.');
  };
  const download = (resource: Resource) => runAction(() => downloadLibraryPdf(resource), 'Descarga iniciada', resource.body.filename ?? resource.title);

  if (!organizations.length) return <main className="mx-auto max-w-3xl p-4 sm:p-8"><Card className="py-10 text-center"><Library className="mx-auto h-9 w-9 text-text-tertiary"/><h1 className="mt-3 text-lg font-bold">Recursos no disponibles</h1><p className="mt-2 text-sm text-text-secondary">Necesitás un rol de nutricionista activo para administrar esta biblioteca.</p></Card></main>;

  return <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6 lg:p-8">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong"><Library className="h-6 w-6"/></span><div><h1 className="text-2xl font-bold text-text-primary">Recursos</h1><p className="mt-1 text-sm text-text-secondary">PDFs y enlaces educativos privados para acompañar a tus pacientes.</p></div></div>{librarySettings?.accepted ? <Button onClick={() => setEditor('new')}><Plus className="h-4 w-4"/>Agregar recurso</Button> : <Button asChild variant="secondary"><Link to="/professional/settings"><ShieldAlert className="h-4 w-4"/>Habilitar cargas</Link></Button>}</header>

    {organizations.length > 1 && <label className="form-label max-w-sm">Consultorio<select className="form-control" value={organizationId} onChange={event => { setOrganizationId(event.target.value); clearFilters(); }}><option value="">Todos mis consultorios</option>{organizations.map(item => <option key={item.organization_id} value={item.organization_id}>{item.organization_name}</option>)}</select></label>}

    <section aria-label="Resumen de recursos" className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[
      { label: 'Biblioteca', value: counts.total, Icon: Library }, { label: 'Publicados', value: counts.published, Icon: CheckCircle2 }, { label: 'Documentos PDF', value: counts.documents, Icon: FileText }, { label: 'Enlaces', value: counts.links, Icon: Link2 },
    ].map(({ label, value, Icon }) => <Card key={label} className="flex items-center gap-3 !p-4"><Icon className="h-5 w-5 shrink-0 text-brand-strong"/><div><p className="text-xl font-bold">{value}</p><p className="text-xs text-text-secondary">{label}</p></div></Card>)}</section>

    {librarySettings && <Card className="space-y-3" aria-label="Espacio de almacenamiento"><div className="flex items-start justify-between gap-3"><div className="flex gap-3"><HardDrive className="mt-0.5 h-5 w-5 text-brand-strong"/><div><h2 className="text-sm font-bold">Espacio de la biblioteca</h2><p className="mt-1 text-xs text-text-secondary">Los enlaces no consumen almacenamiento.</p></div></div><p className="text-right text-sm font-semibold">{formatBytes(librarySettings.used_bytes)} <span className="font-normal text-text-secondary">de {formatBytes(librarySettings.limit_bytes)}</span></p></div><div className="h-2 overflow-hidden rounded-full bg-surface-subtle"><div className="h-full rounded-full bg-brand-strong transition-all" style={{width:`${Math.min(100,librarySettings.limit_bytes ? librarySettings.used_bytes/librarySettings.limit_bytes*100 : 0)}%`}}/></div><p className="text-xs text-text-secondary">Te quedan <b className="text-text-primary">{formatBytes(librarySettings.available_bytes)}</b> disponibles para PDFs.</p></Card>}
    {librarySettings && !librarySettings.accepted && <Card highlighted className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div className="flex gap-3"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-brand-strong"/><p className="text-sm text-text-secondary"><b className="block text-text-primary">Falta aceptar la declaración de responsabilidad.</b>Hasta entonces no podrás agregar ni reemplazar recursos. Lo que ya existe puede seguir administrándose.</p></div><Button asChild variant="secondary"><Link to="/professional/settings">Ir a Configuración</Link></Button></Card>}

    <Card className="space-y-3"><MobileFilters activeCount={[search,kind,status].filter(Boolean).length} className="gap-3 lg:grid-cols-[minmax(240px,1fr)_220px_220px_auto]"><label className="relative"><span className="sr-only">Buscar recursos</span><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-text-tertiary"/><input className="form-control pl-10 pr-12" placeholder="Buscar por título, categoría o archivo…" value={search} onChange={event => setSearch(event.target.value)}/>{search && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setSearch('')} className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-xl text-text-tertiary hover:bg-surface-subtle"><X className="h-4 w-4"/></button>}</label><select aria-label="Filtrar por tipo" className="form-control" value={kind} onChange={event => setKind(event.target.value)}><option value="">Todos los tipos</option><option value="document">Documentos PDF</option><option value="video">Enlaces / videos</option></select><select aria-label="Filtrar por estado" className="form-control" value={status} onChange={event => setStatus(event.target.value)}><option value="">Todos los estados</option><option value="published">Publicados</option><option value="draft">Borradores</option><option value="retired">Retirados</option></select><Button variant="ghost" disabled={!hasFilters} onClick={clearFilters}>Limpiar</Button></MobileFilters><p className="text-xs text-text-secondary">{loading ? 'Actualizando…' : `${filtered.length} de ${scoped.length} recursos`}{selectedOrganization ? ` · ${selectedOrganization.organization_name}` : ''}</p></Card>

    <Card highlighted className="flex gap-3"><FileText className="mt-0.5 h-5 w-5 shrink-0 text-brand-strong"/><p className="text-sm text-text-secondary"><b className="text-text-primary">Biblioteca aislada por profesional.</b> Sólo tus pacientes asignados pueden acceder a lo que publiques. Los PDFs permanecen privados y los enlaces deben usar HTTPS.</p></Card>
    {error && <Card className="flex flex-wrap items-center justify-between gap-3"><p role="alert" className="text-sm text-critical">{error}</p><Button variant="secondary" onClick={() => void refresh()}>Reintentar</Button></Card>}
    {loading ? <Card><p role="status" className="text-sm text-text-secondary">Cargando recursos…</p></Card> : !filtered.length ? <Card className="py-12 text-center"><Library className="mx-auto h-8 w-8 text-text-tertiary"/><h2 className="mt-3 font-bold">{scoped.length ? 'No encontramos recursos' : 'Tu biblioteca está vacía'}</h2><p className="mt-1 text-sm text-text-secondary">{scoped.length ? 'Probá cambiando los filtros.' : librarySettings?.accepted ? 'Agregá un PDF o enlace y publicalo cuando esté listo.' : 'Habilitá las cargas desde Configuración para agregar tu primer recurso.'}</p>{!scoped.length && librarySettings?.accepted && <Button className="mt-5" onClick={() => setEditor('new')}><Plus className="h-4 w-4"/>Agregar primer recurso</Button>}</Card> : <section aria-label="Listado de recursos" className="overflow-hidden rounded-2xl border border-border-subtle bg-surface">
      {filtered.map(resource => { const Icon = resource.kind === 'document' ? FileText : Video; const url = safeUrl(resource.body.url); return <article key={resource.id} className="grid gap-3 border-b border-border-subtle p-3 last:border-b-0 hover:bg-surface-subtle/60 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-4"><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong"><Icon className="h-5 w-5"/></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5"><h2 className="truncate text-sm font-bold" title={resource.title}>{resource.title}</h2><Badge variant="info">{resource.kind === 'document' ? 'PDF' : 'Enlace'}</Badge><Badge variant={resource.status === 'published' ? 'active' : resource.status === 'retired' ? 'suspended' : 'neutral'}>{statusLabels[resource.status]}</Badge></div><p className="mt-1 truncate text-xs text-text-secondary"><span className="font-medium text-text-primary">{resource.category}</span> · <span title={resource.body.filename ?? resource.body.url}>{resource.kind === 'document' ? resource.body.filename ?? 'Documento privado' : resource.body.url}</span></p></div></div><MobileActions title={`Acciones de ${resource.title}`}>{resource.kind === 'document' ? <Button variant="ghost" disabled={busy} onClick={() => void download(resource)}><FileUp className="h-4 w-4 rotate-180"/>Descargar</Button> : url && <Button asChild variant="ghost"><a href={url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4"/>Abrir</a></Button>}<Button variant="ghost" onClick={() => setEditor(resource)}><Pencil className="h-4 w-4"/>Editar</Button><Button variant="secondary" disabled={busy} onClick={() => void changeStatus(resource)}>{resource.status === 'published' ? 'Retirar' : resource.status === 'draft' ? 'Publicar' : 'Restaurar'}</Button></MobileActions><div className="hidden flex-wrap justify-end gap-1 border-t border-border-subtle pt-2 sm:flex sm:border-0 sm:pt-0">{resource.kind === 'document' ? <Button size="sm" variant="ghost" disabled={busy} onClick={() => void download(resource)}><FileUp className="h-4 w-4 rotate-180"/>Descargar</Button> : url && <Button asChild size="sm" variant="ghost"><a href={url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4"/>Abrir</a></Button>}<Button size="sm" variant="ghost" onClick={() => setEditor(resource)}><Pencil className="h-4 w-4"/>Editar</Button><Button size="sm" variant="secondary" disabled={busy} onClick={() => void changeStatus(resource)}>{resource.status === 'published' ? 'Retirar' : resource.status === 'draft' ? 'Publicar' : 'Restaurar'}</Button></div></article>; })}
    </section>}
    {editor && <ResourceEditor initial={editor === 'new' ? null : editor} canChangeContent={Boolean(librarySettings?.accepted)} organizationId={organizationId || organizations[0]!.organization_id} organizationName={selectedOrganization?.organization_name ?? organizations[0]!.organization_name} organizations={organizations} busy={busy} onClose={() => setEditor(null)}
      onSaved={async (resourceStatus, title) => { setEditor(null); await refresh(); showToast(resourceStatus === 'published' ? 'Recurso publicado' : 'Recurso guardado', resourceStatus === 'published' ? `${title} ya está disponible para tus pacientes asignados.` : `${title} permanece privado hasta que decidas publicarlo.`); }}
    />}
  </main>;
}

function ResourceEditor({ initial, canChangeContent, organizationId, organizationName, organizations, busy, onClose, onSaved }: { initial: Resource | null; canChangeContent: boolean; organizationId: string; organizationName: string; organizations: Array<{ organization_id: string; organization_name: string }>; busy: boolean; onClose: () => void; onSaved: (status: Resource['status'], title: string) => Promise<void> }) {
  void canChangeContent;
  const [org, setOrg] = useState(initial?.organization_id ?? organizationId);
  const [kind, setKind] = useState<'document' | 'video'>(initial?.kind ?? 'document');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [category, setCategory] = useState(initial?.category ?? 'Guías');
  const [url, setUrl] = useState(initial?.body.url ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const nextStatus = initial ? initial.status : submitter?.value === 'published' ? 'published' : 'draft';
    try {
      let body = initial?.body ?? {};
      if (kind === 'document') {
        if (file) body = { path: await uploadLibraryPdf(file, org), filename: file.name };
        if (!body.path) throw new Error('Seleccioná un PDF de hasta 10 MB.');
      } else body = { url: url.trim() };
      await saveLibrary({ ...(initial ?? {}), organization_id: org, kind, title: title.trim(), category: category.trim(), status: nextStatus, body });
      await onSaved(nextStatus, title.trim());
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos guardar el recurso.'); }
    finally { setSaving(false); }
  };
  return <Dialog isOpen onClose={() => { if (!saving && !busy) onClose(); }} title={initial ? 'Editar recurso' : 'Agregar recurso'} description="Guardalo como borrador privado o publicalo para tus pacientes asignados."><form className="space-y-4" onSubmit={event => void submit(event)}>{error && <p role="alert" className="rounded-xl bg-critical/10 p-3 text-sm text-critical">{error}</p>}{!initial && organizations.length > 1 && <label className="form-label">Consultorio<select className="form-control" value={org} onChange={event => setOrg(event.target.value)}>{organizations.map(item => <option key={item.organization_id} value={item.organization_id}>{item.organization_name}</option>)}</select></label>}{organizations.length === 1 && <p className="rounded-xl bg-surface-subtle p-3 text-xs text-text-secondary">Biblioteca de <b className="text-text-primary">{organizationName}</b></p>}<label className="form-label">Título *<input className="form-control" required maxLength={160} value={title} onChange={event => setTitle(event.target.value)}/></label><label className="form-label">Categoría *<input className="form-control" required maxLength={80} value={category} onChange={event => setCategory(event.target.value)} placeholder="Guías, educación, material de apoyo…"/></label><label className="form-label">Tipo<select className="form-control" value={kind} onChange={event => { setKind(event.target.value as 'document' | 'video'); setFile(null); setUrl(''); }}><option value="document">Documento PDF</option><option value="video">Enlace / video</option></select></label>{kind === 'document' ? <label className="form-label">{initial?.body.path ? 'Reemplazar PDF (opcional)' : 'Archivo PDF *'}<input key="resource-file" className="form-control" type="file" accept="application/pdf" required={!initial?.body.path} onChange={event => setFile(event.target.files?.[0] ?? null)}/><span className="mt-1 block break-all text-xs font-normal text-text-secondary">{file?.name ?? initial?.body.filename ?? 'PDF privado de hasta 10 MB'}</span></label> : <label className="form-label">Enlace HTTPS *<input key="resource-link" className="form-control" type="url" pattern="https://.*" required value={url} onChange={event => setUrl(event.target.value)} placeholder="https://…"/></label>}<div className="flex flex-wrap justify-end gap-2 border-t border-border-subtle pt-4"><Button type="button" variant="ghost" disabled={saving || busy} onClick={onClose}>Cancelar</Button><Button type="submit" value="draft" variant={initial ? 'primary' : 'secondary'} disabled={saving || busy}>{saving ? 'Guardando…' : initial ? 'Guardar cambios' : 'Guardar borrador'}</Button>{!initial && <Button type="submit" value="published" disabled={saving || busy}>Publicar recurso</Button>}</div></form></Dialog>;
}
