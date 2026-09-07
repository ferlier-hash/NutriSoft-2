import { ClipboardList, Copy, Plus, Send, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Dialog } from '../../../components/ui/Dialog';
import { useToast } from '../../../components/ui/Toast';
import { createMealPlan, duplicateMealPlan, loadProfessionalMealPlans } from '../../../data/supabase/clinical-meal-plans.repository';
import type { ClinicalMealPlanContent, RealProfessionalMealPlan } from '../../../data/clinical-meal-plans.types';
import { useAuth } from '../../../auth/AuthProvider';

function blankContent(days = 7): ClinicalMealPlanContent {
  return { days: Array.from({ length: days }, () => ({ id: crypto.randomUUID(), meals: [] })) };
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
  const [creating, setCreating] = useState(false);
  const organizationId = accessContext?.memberships.find(item => item.role === 'nutritionist' && item.organization_status === 'active')?.organization_id;
  const refresh = async () => { setLoading(true); setError(null); try { setPlans(await loadProfessionalMealPlans()); } catch { setError('No pudimos cargar los planes. Intentá nuevamente.'); } finally { setLoading(false); } };
  useEffect(() => { void refresh(); }, []);
  const totals = useMemo(() => ({ active: plans.filter(plan => plan.assignmentStatus === 'active' && plan.assignmentKind === 'primary').length, comments: plans.reduce((total, plan) => total + plan.pendingCommentCount, 0) }), [plans]);
  const create = async () => {
    if (!organizationId || !title.trim()) return;
    setCreating(true);
    try { const id = await createMealPlan(organizationId, title, blankContent()); navigate(`/professional/meal-plans/${id}`); } catch { showToast('No pudimos crear el borrador', 'Revisá los datos e intentá nuevamente.', 'error'); } finally { setCreating(false); }
  };
  const duplicate = async (plan: RealProfessionalMealPlan) => { try { const id = await duplicateMealPlan(plan.id); showToast('Copia independiente creada', 'Podés personalizarla y asignarla cuando esté lista.'); navigate(`/professional/meal-plans/${id}`); } catch { showToast('No pudimos duplicar el plan', 'Intentá nuevamente.', 'error'); } };
  return <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2"><ClipboardList className="h-6 w-6 text-brand-strong" /><h1 className="text-2xl font-bold text-text-primary">Planes alimentarios</h1></div><p className="mt-1 text-sm text-text-secondary">Datos reales de tu cuenta. Cada plan pertenece a una sola persona.</p></div><Button variant="primary" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Nuevo plan</Button></div>
    <div className="grid gap-4 sm:grid-cols-3"><Card><ClipboardList className="h-4 w-4 text-brand-strong" /><p className="mt-3 text-xs text-text-secondary">Planes propios</p><p className="mt-1 text-2xl font-bold">{plans.length}</p></Card><Card><UserRound className="h-4 w-4 text-brand-strong" /><p className="mt-3 text-xs text-text-secondary">Planes principales activos</p><p className="mt-1 text-2xl font-bold">{totals.active}</p></Card><Card className={totals.comments ? 'border-semantic-warning bg-semantic-warning-bg' : ''}><Send className="h-4 w-4 text-brand-strong" /><p className="mt-3 text-xs text-text-secondary">Comentarios nuevos</p><p className="mt-1 text-2xl font-bold">{totals.comments}</p></Card></div>
    {loading ? <Card><p role="status" className="text-sm text-text-secondary">Cargando planes…</p></Card> : error ? <Card><p className="text-sm text-semantic-critical">{error}</p><Button variant="secondary" className="mt-4" onClick={() => void refresh()}>Reintentar</Button></Card> : plans.length === 0 ? <Card className="py-12 text-center"><ClipboardList className="mx-auto h-10 w-10 text-brand-primary" /><h2 className="mt-4 text-lg font-bold">Todavía no tenés planes</h2><p className="mt-2 text-sm text-text-secondary">Creá un borrador de siete días y completalo antes de publicarlo.</p><Button className="mt-5" onClick={() => setCreateOpen(true)}>Crear plan</Button></Card> : <div className="grid gap-4 lg:grid-cols-2">{plans.map(plan => <Card key={plan.id} className="flex flex-col gap-4"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-bold">{plan.title}</h2><Badge variant={plan.status === 'published' ? 'active' : plan.status === 'draft' ? 'pending' : 'neutral'}>{plan.status === 'published' ? 'Publicado' : plan.status === 'draft' ? 'Borrador' : 'Archivado'}</Badge></div><p className="mt-2 text-xs text-text-secondary">{plan.content.days.length} días · {plan.patientName ? `Paciente: ${plan.patientName}` : 'Sin paciente asignado'}</p></div>{plan.pendingCommentCount > 0 && <Badge variant="pending">{plan.pendingCommentCount} nuevos</Badge>}</div><div className="mt-auto flex flex-wrap justify-end gap-2 border-t border-border-subtle pt-3"><Button asChild variant="secondary" size="sm"><Link to={`/professional/meal-plans/${plan.id}`}>Abrir</Link></Button><Button variant="ghost" size="sm" onClick={() => void duplicate(plan)}><Copy className="h-3.5 w-3.5" />Duplicar</Button></div></Card>)}</div>}
    <Dialog isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Crear plan alimentario" description="El borrador inicial tendrá siete días y podrás completar cada comida antes de publicarlo."><form className="space-y-4" onSubmit={event => { event.preventDefault(); void create(); }}><div><label className="mb-1.5 block text-xs font-semibold" htmlFor="real-plan-title">Título del plan</label><input id="real-plan-title" className="form-control" value={title} onChange={event => setTitle(event.target.value)} required maxLength={120} /></div><div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Cancelar</Button><Button type="submit" disabled={creating || !organizationId}>{creating ? 'Creando…' : 'Crear borrador'}</Button></div></form></Dialog>
  </div>;
}
