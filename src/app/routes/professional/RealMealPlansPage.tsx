import {
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Copy,
  FileUp,
  MessageSquareText,
  Plus,
  Search,
  Send,
  UserRound,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/AuthProvider';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Dialog } from '../../../components/ui/Dialog';
import { useToast } from '../../../components/ui/Toast';
import type { ClinicalMealPlanContent, RealProfessionalMealPlan } from '../../../data/clinical-meal-plans.types';
import { createMealPlan, duplicateMealPlan, loadProfessionalMealPlans } from '../../../data/supabase/clinical-meal-plans.repository';
import { MealPlanImportDialog } from '../../../components/domain/MealPlanImportDialog';

const statusLabel = { draft: 'Borrador', published: 'Publicado', archived: 'Archivado' } as const;

function blankContent(days: number): ClinicalMealPlanContent {
  return { days: Array.from({ length: days }, () => ({ id: crypto.randomUUID(), meals: [] })) };
}

function searchableText(plan: RealProfessionalMealPlan) {
  return [
    plan.title,
    plan.patientName,
    statusLabel[plan.status],
    plan.status,
    plan.assignmentKind === 'primary' ? 'principal' : plan.assignmentKind === 'complement' ? 'complemento' : '',
    plan.content.objectives,
    plan.content.generalIndications,
    plan.content.shoppingList,
  ].filter(Boolean).join(' ').toLocaleLowerCase('es');
}

export function RealMealPlansPage() {
  const { accessContext } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<RealProfessionalMealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(7);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const organizationId = accessContext?.memberships.find(item => item.role === 'nutritionist' && item.organization_status === 'active')?.organization_id;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPlans(await loadProfessionalMealPlans());
    } catch {
      setError('No pudimos cargar los planes. Intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const totals = useMemo(() => ({
    primary: plans.filter(plan => plan.assignmentStatus === 'active' && plan.assignmentKind === 'primary').length,
    complements: plans.filter(plan => plan.assignmentStatus === 'active' && plan.assignmentKind === 'complement').length,
    comments: plans.reduce((total, plan) => total + plan.pendingCommentCount, 0),
  }), [plans]);

  const filteredPlans = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es');
    return query ? plans.filter(plan => searchableText(plan).includes(query)) : plans;
  }, [plans, search]);

  const create = async () => {
    const cleanTitle = title.trim();
    if (!organizationId || !cleanTitle || duration < 7 || duration > 30) return;
    setCreating(true);
    try {
      const id = await createMealPlan(organizationId, cleanTitle, blankContent(duration));
      setCreateOpen(false);
      setTitle('');
      setDuration(7);
      navigate(`/professional/meal-plans/${id}`);
    } catch {
      showToast('No pudimos crear el borrador', 'Revisá los datos e intentá nuevamente.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const duplicate = async (plan: RealProfessionalMealPlan) => {
    setDuplicatingId(plan.id);
    try {
      const id = await duplicateMealPlan(plan.id);
      showToast('Copia independiente creada', 'Podés personalizarla y asignarla cuando esté lista.');
      navigate(`/professional/meal-plans/${id}`);
    } catch {
      showToast('No pudimos duplicar el plan', 'Intentá nuevamente.', 'error');
    } finally {
      setDuplicatingId(null);
    }
  };

  return <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <div className="flex items-center gap-2"><ClipboardList className="h-6 w-6 text-brand-strong" /><h1 className="text-2xl font-bold text-text-primary">Planes alimentarios</h1></div>
        <p className="mt-1 text-sm text-text-secondary">Cada plan pertenece a una sola persona. Duplicalo para reutilizar su estructura sin mezclar historiales.</p>
      </div>
      <Button variant="primary" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Nuevo plan</Button>
    </header>

    <section aria-label="Resumen de planes" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card><ClipboardList className="h-4 w-4 text-brand-strong" /><p className="mt-3 text-xs text-text-secondary">Planes en biblioteca</p><p className="mt-1 text-2xl font-bold">{plans.length}</p></Card>
      <Card><UserRound className="h-4 w-4 text-brand-strong" /><p className="mt-3 text-xs text-text-secondary">Principales activos</p><p className="mt-1 text-2xl font-bold">{totals.primary}</p></Card>
      <Card><Send className="h-4 w-4 text-brand-strong" /><p className="mt-3 text-xs text-text-secondary">Complementos activos</p><p className="mt-1 text-2xl font-bold">{totals.complements}</p></Card>
      <Card className={totals.comments ? 'border-semantic-warning bg-semantic-warning-bg' : ''}><MessageSquareText className={`h-4 w-4 ${totals.comments ? 'text-semantic-warning' : 'text-brand-strong'}`} /><p className="mt-3 text-xs text-text-secondary">Comentarios nuevos</p><p className="mt-1 text-2xl font-bold">{totals.comments}</p></Card>
    </section>

    <Card highlighted className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div className="flex items-start gap-3"><FileUp className="mt-0.5 h-5 w-5 shrink-0 text-brand-strong" /><div><p className="text-sm font-semibold">Importar desde una planilla CSV</p><p className="mt-1 text-xs text-text-secondary">Validá filas y estructura antes de crear un borrador. Nunca se asigna ni publica automáticamente.</p></div></div>
      <Button variant="secondary" onClick={()=>setImportOpen(true)}>Importar plan</Button>
    </Card>

    <section aria-labelledby="real-meal-plan-library" className="space-y-3">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div><h2 id="real-meal-plan-library" className="text-lg font-bold">Planes individuales</h2><p className="mt-1 text-xs text-text-secondary">Editá la estructura, publicá versiones y revisá el seguimiento de cada paciente.</p></div>
        <div className="relative w-full lg:w-96">
          <label className="sr-only" htmlFor="real-meal-plan-search">Buscar planes</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input id="real-meal-plan-search" className="form-control pl-10 pr-10" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar plan, paciente, estado o nota…" />
          {search && <button type="button" className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-text-tertiary hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong" aria-label="Limpiar búsqueda" onClick={() => setSearch('')}><X className="h-4 w-4" /></button>}
        </div>
      </div>

      {loading ? <Card><p role="status" className="text-sm text-text-secondary">Cargando planes…</p></Card>
        : error ? <Card><p className="text-sm text-semantic-critical">{error}</p><Button variant="secondary" className="mt-4" onClick={() => void refresh()}>Reintentar</Button></Card>
          : plans.length === 0 ? <Card className="py-12 text-center"><ClipboardList className="mx-auto h-10 w-10 text-brand-primary" /><h2 className="mt-4 text-lg font-bold">Creá tu primer plan</h2><p className="mt-2 text-sm text-text-secondary">Elegí una duración de 7 a 30 días y completalo antes de publicarlo.</p><Button className="mt-5" onClick={() => setCreateOpen(true)}>Crear plan</Button></Card>
            : filteredPlans.length === 0 ? <Card className="py-12 text-center"><Search className="mx-auto h-9 w-9 text-text-tertiary" /><h2 className="mt-4 text-lg font-bold">No encontramos planes</h2><p className="mt-2 text-sm text-text-secondary">Probá con otro nombre, paciente, estado o contenido general.</p><Button variant="secondary" className="mt-5" onClick={() => setSearch('')}>Limpiar búsqueda</Button></Card>
              : <div className="space-y-2">{filteredPlans.map(plan => {
                const mealCount = plan.content.days.reduce((total, day) => total + day.meals.length, 0);
                const itemCount = plan.content.days.reduce((total, day) => total + day.meals.reduce((subtotal, meal) => subtotal + meal.items.length, 0), 0);
                return <Card key={plan.id} className="!p-3 sm:!p-4">
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(210px,.85fr)_auto] lg:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-bold sm:text-base" title={plan.title}>{plan.title}</h3><Badge variant={plan.status === 'published' ? 'active' : plan.status === 'draft' ? 'pending' : 'neutral'}>{statusLabel[plan.status]}</Badge>{plan.pendingCommentCount > 0 && <Badge variant="pending">{plan.pendingCommentCount} {plan.pendingCommentCount === 1 ? 'comentario' : 'comentarios'}</Badge>}</div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-secondary sm:text-xs"><span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{plan.content.days.length} días</span><span>{mealCount} comidas</span><span>{itemCount} elementos</span>{plan.assignmentKind && <span className="font-semibold text-text-primary">{plan.assignmentKind === 'primary' ? 'Plan principal' : 'Complemento'}</span>}</div>
                    </div>
                    <div className="flex min-w-0 items-center gap-2 rounded-xl bg-surface-subtle px-3 py-2">
                      {plan.patientName ? <><span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-surface text-[10px] font-bold text-brand-strong">{plan.patientName.split(' ').map(part => part[0]).slice(0, 2).join('')}</span><div className="min-w-0"><p className="truncate text-xs font-semibold">{plan.patientName}</p><p className="truncate text-[10px] text-text-secondary">{plan.assignmentStatus === 'active' ? 'Visible para el paciente' : plan.assignmentStatus === 'pending' ? 'Pendiente de publicación' : 'Plan en historial'}</p></div></> : <><UserRound className="h-4 w-4 shrink-0 text-text-tertiary" /><p className="truncate text-xs text-text-secondary">Sin paciente asignado</p></>}
                    </div>
                    <div className="flex shrink-0 justify-end gap-2 border-t border-border-subtle pt-3 lg:border-0 lg:pt-0"><Button variant="ghost" size="sm" disabled={duplicatingId === plan.id} onClick={() => void duplicate(plan)} aria-label={`Duplicar ${plan.title}`}><Copy className="h-3.5 w-3.5" /><span className="hidden sm:inline">{duplicatingId === plan.id ? 'Duplicando…' : 'Duplicar'}</span></Button><Button asChild variant="primary" size="sm"><Link to={`/professional/meal-plans/${plan.id}`} aria-label={`${plan.status === 'draft' ? 'Completar' : 'Abrir'} ${plan.title}`}>{plan.status === 'draft' ? 'Completar' : 'Abrir'}<ChevronRight className="h-3.5 w-3.5" /></Link></Button></div>
                  </div>
                </Card>;
              })}</div>}
    </section>

    <Dialog isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Crear plan alimentario" description="Creá la estructura inicial. Después completarás las comidas y elementos de cada día.">
      <form className="space-y-4" onSubmit={event => { event.preventDefault(); void create(); }}>
        <div><label className="mb-1.5 block text-xs font-semibold" htmlFor="real-plan-title">Título del plan *</label><input id="real-plan-title" className="form-control" value={title} onChange={event => setTitle(event.target.value)} placeholder="Ej. Plan semanal personalizado" required maxLength={120} /></div>
        <div><label className="mb-1.5 block text-xs font-semibold" htmlFor="real-plan-duration">Duración *</label><div className="flex items-center gap-3"><input id="real-plan-duration" type="number" min={7} max={30} className="form-control" value={duration} onChange={event => setDuration(Number(event.target.value))} required /><span className="shrink-0 text-xs text-text-secondary">días (7–30)</span></div></div>
        <div className="rounded-xl border border-border-subtle bg-surface-tinted p-3 text-xs text-text-secondary">Se crea como borrador y no será visible para ningún paciente hasta que lo asignes y publiques.</div>
        <div className="flex justify-end gap-2 border-t border-border-subtle pt-3"><Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Cancelar</Button><Button type="submit" disabled={creating || !organizationId || !title.trim() || duration < 7 || duration > 30}>{creating ? 'Creando…' : 'Crear y continuar'}</Button></div>
      </form>
    </Dialog>
    <MealPlanImportDialog open={importOpen} organizationId={organizationId} onClose={()=>setImportOpen(false)} onCreated={id=>{setImportOpen(false);navigate(`/professional/meal-plans/${id}`);}}/>
  </div>;
}
