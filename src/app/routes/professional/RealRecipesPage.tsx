import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, Clock3, CookingPot, Copy, Eye, FilePenLine, Plus, Search, Users, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../auth/AuthProvider';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Dialog } from '../../../components/ui/Dialog';
import { useToast } from '../../../components/ui/Toast';
import { MobileFilters } from '../../../components/ui/MobileFilters';
import { MobileActions } from '../../../components/ui/MobileActions';
import { loadLibrary, saveLibrary, type LibraryBody, type LibraryContent } from '../../../data/supabase/library.repository';

const categories = ['Desayunos', 'Almuerzos', 'Cenas', 'Snacks'];
const statusLabels = { published: 'Publicada', draft: 'Borrador', retired: 'Retirada' } as const;

type Recipe = LibraryContent & { kind: 'recipe' };

function safeImage(value?: string) {
  try { return value && new URL(value).protocol === 'https:' ? value : undefined; } catch { return undefined; }
}

function recipeTags(recipe: Recipe) {
  return (recipe.body.tags ?? '').split(',').map(tag => tag.trim()).filter(Boolean);
}

export function RealRecipesPage() {
  const { accessContext } = useAuth();
  const { recipeId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const organizations = useMemo(() => accessContext?.memberships.filter(membership => membership.role === 'nutritionist' && membership.membership_status === 'active' && membership.organization_status === 'active') ?? [], [accessContext]);
  const [organizationId, setOrganizationId] = useState('');
  const [items, setItems] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [editor, setEditor] = useState<Recipe | 'new' | null>(null);
  const [selected, setSelected] = useState<Recipe | null>(null);

  useEffect(() => {
    if (!organizationId && organizations[0]) setOrganizationId(organizations[0].organization_id);
  }, [organizationId, organizations]);

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const library = await loadLibrary();
      setItems(library.filter((item): item is Recipe => item.kind === 'recipe'));
    } catch (cause) {
      setItems([]); setError(cause instanceof Error ? cause.message : 'No pudimos cargar el recetario.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const scoped = useMemo(() => items.filter(item => !organizationId || item.organization_id === organizationId), [items, organizationId]);
  const filtered = useMemo(() => scoped.filter(recipe => {
    const words = `${recipe.title} ${recipe.category} ${recipe.body.tags ?? ''}`.toLocaleLowerCase();
    return words.includes(search.trim().toLocaleLowerCase()) && (!status || recipe.status === status) && (!category || recipe.category === category);
  }), [category, scoped, search, status]);
  const routeRecipe = recipeId ? items.find(item => item.id === recipeId) ?? null : null;
  const detail = routeRecipe ?? selected;
  const hasFilters = Boolean(search || status || category);
  const selectedOrganization = organizations.find(item => item.organization_id === organizationId) ?? organizations[0];
  const counts = { total: scoped.length, published: scoped.filter(item => item.status === 'published').length, draft: scoped.filter(item => item.status === 'draft').length, retired: scoped.filter(item => item.status === 'retired').length };

  const clearFilters = () => { setSearch(''); setStatus(''); setCategory(''); };
  const closeDetail = () => { setSelected(null); if (recipeId) navigate('/professional/recipes', { replace: true }); };
  const runAction = async (operation: () => Promise<unknown>, title: string, description: string) => {
    setBusy(true); setError('');
    try { await operation(); await refresh(); showToast(title, description); setSelected(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos completar la acción.'); }
    finally { setBusy(false); }
  };
  const changeStatus = (recipe: Recipe) => {
    const next = recipe.status === 'published' ? 'retired' : recipe.status === 'draft' ? 'published' : 'draft';
    return runAction(() => saveLibrary({ ...recipe, status: next }), next === 'published' ? 'Receta publicada' : next === 'retired' ? 'Receta retirada' : 'Borrador restaurado', next === 'published' ? 'Ya puede vincularse a planes y verla cada paciente autorizado.' : 'La receta original y su historial se conservaron.');
  };
  const duplicate = (recipe: Recipe) => runAction(() => saveLibrary({ ...recipe, id: undefined, updated_at: undefined, title: `${recipe.title.slice(0, 150)} (copia)`, status: 'draft', body: { ...recipe.body, sourceTitle: recipe.title } }), 'Copia creada', 'Se guardó como borrador independiente.');

  if (!organizations.length) return <main className="mx-auto max-w-3xl p-4 sm:p-8"><Card className="py-10 text-center"><CookingPot className="mx-auto h-9 w-9 text-text-tertiary"/><h1 className="mt-3 text-lg font-bold">Recetario no disponible</h1><p className="mt-2 text-sm text-text-secondary">Necesitás un rol de nutricionista activo para administrar recetas.</p></Card></main>;

  return <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6 lg:p-8">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong"><CookingPot className="h-6 w-6"/></span><div><h1 className="text-2xl font-bold text-text-primary">Recetario</h1><p className="mt-1 text-sm text-text-secondary">Recetas propias para reutilizar en planes y compartir con pacientes.</p></div></div>
      <Button onClick={() => setEditor('new')}><Plus className="h-4 w-4"/>Nueva receta</Button>
    </header>

    {organizations.length > 1 && <label className="form-label max-w-sm">Consultorio<select className="form-control" value={organizationId} onChange={event => { setOrganizationId(event.target.value); clearFilters(); }}><option value="">Todos mis consultorios</option>{organizations.map(item => <option key={item.organization_id} value={item.organization_id}>{item.organization_name}</option>)}</select></label>}

    <section aria-label="Resumen del recetario" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[{ label: 'Biblioteca', value: counts.total, Icon: BookOpen }, { label: 'Publicadas', value: counts.published, Icon: CheckCircle2 }, { label: 'Borradores', value: counts.draft, Icon: FilePenLine }, { label: 'Retiradas', value: counts.retired, Icon: Eye }].map(({ label, value, Icon }) => <Card key={label} className="flex items-center gap-3 !p-4"><Icon className="h-5 w-5 shrink-0 text-brand-strong"/><div><p className="text-xl font-bold">{value}</p><p className="text-xs text-text-secondary">{label}</p></div></Card>)}
    </section>

    <Card className="space-y-3">
      <MobileFilters activeCount={[search,category,status].filter(Boolean).length} className="gap-3 lg:grid-cols-[minmax(240px,1fr)_220px_220px_auto]">
        <label className="relative"><span className="sr-only">Buscar recetas</span><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-text-tertiary"/><input className="form-control pl-10 pr-12" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por nombre, categoría o etiqueta…"/>{search && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setSearch('')} className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-xl text-text-tertiary hover:bg-surface-subtle"><X className="h-4 w-4"/></button>}</label>
        <select aria-label="Filtrar por categoría" className="form-control" value={category} onChange={event => setCategory(event.target.value)}><option value="">Todas las categorías</option>{Array.from(new Set([...categories, ...scoped.map(item => item.category)])).map(item => <option key={item}>{item}</option>)}</select>
        <select aria-label="Filtrar por estado" className="form-control" value={status} onChange={event => setStatus(event.target.value)}><option value="">Todos los estados</option><option value="published">Publicadas</option><option value="draft">Borradores</option><option value="retired">Retiradas</option></select>
        <Button variant="ghost" disabled={!hasFilters} onClick={clearFilters}>Limpiar</Button>
      </MobileFilters>
      <p className="text-xs text-text-secondary">{loading ? 'Actualizando…' : `${filtered.length} de ${scoped.length} recetas`}{selectedOrganization ? ` · ${selectedOrganization.organization_name}` : ''}</p>
    </Card>

    {error && <Card className="flex flex-wrap items-center justify-between gap-3"><p role="alert" className="text-sm text-critical">{error}</p><Button variant="secondary" onClick={() => void refresh()}>Reintentar</Button></Card>}
    {loading ? <Card><p role="status" className="text-sm text-text-secondary">Cargando recetario…</p></Card> : !filtered.length ? <Card className="py-12 text-center"><CookingPot className="mx-auto h-8 w-8 text-text-tertiary"/><h2 className="mt-3 font-bold">{scoped.length ? 'No encontramos recetas' : 'Tu recetario está vacío'}</h2><p className="mt-1 text-sm text-text-secondary">{scoped.length ? 'Probá cambiando los filtros.' : 'Creá una receta como borrador y publicala cuando esté lista.'}</p>{!scoped.length && <Button className="mt-5" onClick={() => setEditor('new')}><Plus className="h-4 w-4"/>Crear primera receta</Button>}</Card> : <section aria-label="Listado de recetas" className="space-y-2">
      {filtered.map(recipe => { const image = safeImage(recipe.body.image); const tags = recipeTags(recipe); return <article key={recipe.id} className="grid gap-3 rounded-2xl border border-border-subtle bg-surface p-3 shadow-2xs transition hover:border-border-hover sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center">
        <button type="button" onClick={() => setSelected(recipe)} className="h-18 w-full overflow-hidden rounded-xl bg-brand-soft sm:w-18" aria-label={`Ver ${recipe.title}`}>{image ? <img src={image} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover"/> : <CookingPot className="mx-auto h-full w-7 text-brand-strong"/>}</button>
        <button type="button" onClick={() => setSelected(recipe)} className="min-w-0 text-left"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-sm font-bold text-text-primary">{recipe.title}</h2><Badge variant={recipe.status === 'published' ? 'active' : recipe.status === 'retired' ? 'suspended' : 'neutral'}>{statusLabels[recipe.status]}</Badge></div><p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-secondary"><span>{recipe.category}</span><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5"/>{recipe.body.minutes} min</span><span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5"/>{recipe.body.servings} porciones</span>{tags.slice(0, 2).map(tag => <span key={tag}>#{tag}</span>)}</p></button>
        <MobileActions title={`Acciones de ${recipe.title}`}><Button variant="ghost" onClick={() => setEditor(recipe)}><FilePenLine className="h-4 w-4"/>Editar</Button><Button variant="ghost" disabled={busy} onClick={() => void duplicate(recipe)}><Copy className="h-4 w-4"/>Duplicar</Button><Button variant="secondary" disabled={busy} onClick={() => void changeStatus(recipe)}>{recipe.status === 'published' ? 'Retirar' : recipe.status === 'draft' ? 'Publicar' : 'Restaurar'}</Button></MobileActions>
        <div className="hidden flex-wrap gap-1 sm:flex sm:justify-end"><Button size="sm" variant="ghost" onClick={() => setEditor(recipe)}><FilePenLine className="h-4 w-4"/>Editar</Button><Button size="sm" variant="ghost" disabled={busy} onClick={() => void duplicate(recipe)}><Copy className="h-4 w-4"/>Duplicar</Button><Button size="sm" variant="secondary" disabled={busy} onClick={() => void changeStatus(recipe)}>{recipe.status === 'published' ? 'Retirar' : recipe.status === 'draft' ? 'Publicar' : 'Restaurar'}</Button></div>
      </article>; })}
    </section>}

    {recipeId && !loading && !routeRecipe && <Card><p className="text-sm text-text-secondary">La receta no existe o no pertenece a tu acceso actual.</p><Button className="mt-3" variant="secondary" onClick={() => navigate('/professional/recipes', { replace: true })}>Volver al recetario</Button></Card>}
    <RecipeDetail recipe={detail} busy={busy} onClose={closeDetail} onEdit={recipe => { closeDetail(); setEditor(recipe); }} onDuplicate={duplicate} onChangeStatus={changeStatus}/>
    {editor && <RecipeEditor initial={editor === 'new' ? null : editor} organizationId={organizationId || organizations[0]!.organization_id} organizationName={selectedOrganization?.organization_name ?? organizations[0]!.organization_name} organizations={organizations} busy={busy} onClose={() => setEditor(null)}
      onSaved={async (recipeStatus, title) => { setEditor(null); await refresh(); showToast(recipeStatus === 'published' ? 'Receta publicada' : 'Receta guardada', recipeStatus === 'published' ? `${title} ya está disponible para pacientes autorizados.` : `${title} permanece privada hasta que decidas publicarla.`); }}
    />}
  </main>;
}

function RecipeDetail({ recipe, busy, onClose, onEdit, onDuplicate, onChangeStatus }: { recipe: Recipe | null; busy: boolean; onClose: () => void; onEdit: (recipe: Recipe) => void; onDuplicate: (recipe: Recipe) => Promise<void>; onChangeStatus: (recipe: Recipe) => Promise<void> }) {
  if (!recipe) return null;
  const tags = recipeTags(recipe);
  return <Dialog isOpen onClose={onClose} title={recipe.title} description={`${recipe.category} · ${recipe.body.minutes} minutos · ${recipe.body.servings} porciones`}>
    <div className="space-y-5">
      {safeImage(recipe.body.image) && <img src={safeImage(recipe.body.image)} alt={`Fotografía de ${recipe.title}`} referrerPolicy="no-referrer" className="h-48 w-full rounded-2xl object-cover"/>}
      <div className="flex flex-wrap gap-2"><Badge variant={recipe.status === 'published' ? 'active' : recipe.status === 'retired' ? 'suspended' : 'neutral'}>{statusLabels[recipe.status]}</Badge>{tags.map(tag => <Badge key={tag} variant="info">{tag}</Badge>)}</div>
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface-subtle p-3 text-center sm:grid-cols-4">{([['kcal', recipe.body.calories], ['Proteínas', recipe.body.protein], ['Carbohidratos', recipe.body.carbs], ['Grasas', recipe.body.fat]] as const).map(([label, value]) => <p key={label} className="text-xs text-text-secondary"><strong className="block text-base text-text-primary">{value ?? '—'}{label !== 'kcal' && value != null ? ' g' : ''}</strong>{label}</p>)}</div>
      <section><h3 className="font-bold">Ingredientes</h3><ul className="mt-3 space-y-2">{(recipe.body.ingredients ?? '').split('\n').filter(Boolean).map((item, index) => <li key={`${index}-${item}`} className="flex gap-2 text-sm text-text-secondary"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-primary"/>{item}</li>)}</ul></section>
      <section><h3 className="font-bold">Preparación</h3><ol className="mt-3 space-y-3">{(recipe.body.steps ?? '').split('\n').filter(Boolean).map((step, index) => <li key={`${index}-${step}`} className="flex gap-3 text-sm text-text-secondary"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-strong">{index + 1}</span><span className="pt-0.5">{step}</span></li>)}</ol></section>
      {recipe.body.sourceTitle && <p className="text-xs text-text-secondary">Copia de “{recipe.body.sourceTitle}”.</p>}
      <div className="flex flex-wrap justify-end gap-2 border-t border-border-subtle pt-4"><Button variant="ghost" onClick={() => onEdit(recipe)}>Editar</Button><Button variant="ghost" disabled={busy} onClick={() => void onDuplicate(recipe)}>Duplicar</Button><Button variant="secondary" disabled={busy} onClick={() => void onChangeStatus(recipe)}>{recipe.status === 'published' ? 'Retirar receta' : recipe.status === 'draft' ? 'Publicar receta' : 'Restaurar borrador'}</Button></div>
    </div>
  </Dialog>;
}

function RecipeEditor({ initial, organizationId, organizationName, organizations, busy, onClose, onSaved }: { initial: Recipe | null; organizationId: string; organizationName: string; organizations: Array<{ organization_id: string; organization_name: string }>; busy: boolean; onClose: () => void; onSaved: (status: Recipe['status'], title: string) => Promise<void> }) {
  const [org, setOrg] = useState(initial?.organization_id ?? organizationId);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [category, setCategory] = useState(initial?.category ?? 'Desayunos');
  const [body, setBody] = useState<LibraryBody>(initial?.body ?? { minutes: 20, servings: 2, ingredients: '', steps: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const patch = (key: keyof LibraryBody, value: string | number | null) => setBody(current => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setSaving(true);
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const nextStatus = initial ? initial.status : submitter?.value === 'published' ? 'published' : 'draft';
    try {
      await saveLibrary({ ...(initial ?? {}), organization_id: org, kind: 'recipe', title: title.trim(), category, status: nextStatus, body: { ...body, tags: (body.tags ?? '').split(',').map(tag => tag.trim()).filter(Boolean).join(', ') } });
      await onSaved(nextStatus, title.trim());
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos guardar la receta.'); }
    finally { setSaving(false); }
  };
  return <Dialog isOpen onClose={() => { if (!saving && !busy) onClose(); }} title={initial ? 'Editar receta' : 'Nueva receta'} description="La receta es privada mientras sea borrador. Publicarla permite vincularla a planes y verla a pacientes autorizados.">
    <form className="space-y-4" onSubmit={event => void submit(event)}>
      {error && <p role="alert" className="rounded-xl bg-critical/10 p-3 text-sm text-critical">{error}</p>}
      {!initial && organizations.length > 1 && <label className="form-label">Consultorio<select className="form-control" value={org} onChange={event => setOrg(event.target.value)}>{organizations.map(item => <option key={item.organization_id} value={item.organization_id}>{item.organization_name}</option>)}</select></label>}
      {organizations.length === 1 && <p className="rounded-xl bg-surface-subtle p-3 text-xs text-text-secondary">Biblioteca de <b className="text-text-primary">{organizationName}</b></p>}
      <label className="form-label">Nombre de la receta *<input className="form-control" required maxLength={160} value={title} onChange={event => setTitle(event.target.value)}/></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="form-label">Categoría *<select className="form-control" value={category} onChange={event => setCategory(event.target.value)}>{categories.map(item => <option key={item}>{item}</option>)}</select></label><label className="form-label">Etiquetas <span className="font-normal text-text-tertiary">(separadas por coma)</span><input className="form-control" maxLength={500} value={body.tags ?? ''} onChange={event => patch('tags', event.target.value)} placeholder="Vegetariana, rápida…"/></label></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{(['minutes', 'servings', 'calories', 'protein', 'carbs', 'fat'] as const).map((key, index) => <label key={key} className="form-label">{['Minutos *', 'Porciones *', 'Calorías', 'Proteínas (g)', 'Carbohidratos (g)', 'Grasas (g)'][index]}<input className="form-control" type="number" step="any" min={index < 2 ? 0.1 : 0} max={100000} required={index < 2} value={body[key] ?? ''} onChange={event => patch(key, event.target.value === '' ? null : Number(event.target.value))}/></label>)}</div>
      <label className="form-label">Ingredientes * <span className="font-normal text-text-tertiary">· uno por línea</span><textarea className="form-control min-h-28" required maxLength={15000} value={body.ingredients ?? ''} onChange={event => patch('ingredients', event.target.value)}/></label>
      <label className="form-label">Preparación * <span className="font-normal text-text-tertiary">· un paso por línea</span><textarea className="form-control min-h-28" required maxLength={15000} value={body.steps ?? ''} onChange={event => patch('steps', event.target.value)}/></label>
      <label className="form-label">Fotografía <span className="font-normal text-text-tertiary">(URL HTTPS opcional)</span><input className="form-control" type="url" pattern="https://.*" value={body.image ?? ''} onChange={event => patch('image', event.target.value)} placeholder="https://…"/></label>
      <div className="sticky bottom-0 -mx-5 flex flex-wrap justify-end gap-2 border-t border-border-subtle bg-surface/95 px-5 py-3 backdrop-blur"><Button type="button" variant="ghost" disabled={saving || busy} onClick={onClose}>Cancelar</Button><Button type="submit" value="draft" variant={initial ? 'primary' : 'secondary'} disabled={saving || busy}>{saving ? 'Guardando…' : initial ? 'Guardar cambios' : 'Guardar borrador'}</Button>{!initial && <Button type="submit" value="published" disabled={saving || busy}>Publicar receta</Button>}</div>
    </form>
  </Dialog>;
}
