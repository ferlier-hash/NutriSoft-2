import { Archive, CalendarDays, ChevronRight, ClipboardList, Copy, FileUp, MessageSquareText, Plus, Search, Send, UserRound, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Dialog } from '../../../components/ui/Dialog';
import { useToast } from '../../../components/ui/Toast';
import type { MealPlanAssignmentKind, MealPlanStatus, MealPlanTemplate } from '../../../types';
import { useMock } from '../../provider';

const inputClassName = 'w-full min-h-11 px-3 py-2 text-sm bg-surface-subtle border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-strong text-text-primary';
const planStatusLabel: Record<MealPlanStatus, string> = { draft: 'Borrador', published: 'Publicado', archived: 'Archivado' };

export function MealPlansPage() {
  const { professionalMealPlans, professionalMealPlanAssignments, professionalPatients, mealAdherenceRecords, createMealPlan, duplicateMealPlan, setMealPlanStatus, assignMealPlan } = useMock();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [assigningPlan, setAssigningPlan] = useState<MealPlanTemplate | null>(null);
  const [name, setName] = useState('');
  const [duration, setDuration] = useState(7);
  const [patientId, setPatientId] = useState(professionalPatients[0]?.id ?? '');
  const [assignmentKind, setAssignmentKind] = useState<MealPlanAssignmentKind>('primary');
  const [search, setSearch] = useState('');

  const activeAssignments = useMemo(() => professionalMealPlanAssignments.filter(assignment => assignment.status === 'active'), [professionalMealPlanAssignments]);
  const patientNameById = useMemo(() => new Map(professionalPatients.map(patient => [patient.id, `${patient.firstName} ${patient.lastName}`])), [professionalPatients]);
  const pendingComments = useMemo(() => mealAdherenceRecords.filter(record => record.patientComment?.trim() && !record.professionalReviewedAt && professionalMealPlanAssignments.some(assignment => assignment.id === record.assignmentId)), [mealAdherenceRecords, professionalMealPlanAssignments]);
  const filteredMealPlans = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return professionalMealPlans;
    return professionalMealPlans.filter(plan => {
      const assignments = professionalMealPlanAssignments.filter(assignment => assignment.templateId === plan.id);
      const patientNames = assignments
        .map(assignment => patientNameById.get(assignment.patientId))
        .filter(Boolean)
        .join(' ');
      return [
        plan.name,
        plan.status,
        plan.generalNotes,
        plan.shoppingList,
        plan.goals,
        patientNames,
      ].filter(Boolean).join(' ').toLowerCase().includes(query);
    });
  }, [patientNameById, professionalMealPlanAssignments, professionalMealPlans, search]);

  const handleDuplicate = (planId: string) => {
    try {
      const copy = duplicateMealPlan(planId);
      showToast('Copia independiente creada', 'Podés personalizarla antes de asignarla a otro paciente.');
      navigate(`/professional/meal-plans/${copy.id}`);
    } catch (error) {
      showToast('No pudimos duplicar el plan', error instanceof Error ? error.message : 'Intentá nuevamente.', 'error');
    }
  };

  const handleCreate = () => {
    try {
      const created = createMealPlan({
        name,
        status: 'draft',
        days: Array.from({ length: duration }, (_, index) => ({ id: `day-${crypto.randomUUID()}`, label: `Día ${index + 1}`, meals: [] })),
      });
      setIsCreateOpen(false);
      setName('');
      setDuration(7);
      showToast('Borrador creado', 'Ahora podés cargar las comidas y elementos de cada día.');
      navigate(`/professional/meal-plans/${created.id}`);
    } catch (error) {
      showToast('No pudimos crear el plan', error instanceof Error ? error.message : 'Revisá los campos.', 'error');
    }
  };

  const handleAssign = () => {
    if (!assigningPlan || !patientId) return;
    try {
      const assignment = assignMealPlan(assigningPlan.id, patientId, assignmentKind);
      setAssigningPlan(null);
      showToast('Plan asignado', `${assignment.templateName} quedó como ${assignmentKind === 'primary' ? 'plan principal' : 'complemento'}.`);
    } catch (error) {
      showToast('No pudimos asignar el plan', error instanceof Error ? error.message : 'Intentá nuevamente.', 'error');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2"><ClipboardList className="w-6 h-6 text-brand-strong" /><h1 className="text-2xl font-bold text-text-primary">Planes alimentarios</h1></div>
          <p className="text-sm text-text-secondary mt-1">Cada plan pertenece a un solo paciente. Duplicalo cuando quieras reutilizar su estructura.</p>
        </div>
        <Button variant="primary" onClick={() => setIsCreateOpen(true)}><Plus className="w-4 h-4" />Nuevo plan</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card><ClipboardList className="w-4 h-4 text-brand-strong" /><p className="text-xs text-text-secondary mt-3">Planes en biblioteca</p><p className="text-2xl font-bold text-text-primary mt-1">{professionalMealPlans.length}</p></Card>
        <Card><UserRound className="w-4 h-4 text-brand-strong" /><p className="text-xs text-text-secondary mt-3">Planes principales activos</p><p className="text-2xl font-bold text-text-primary mt-1">{activeAssignments.filter(item => item.kind === 'primary').length}</p></Card>
        <Card><Send className="w-4 h-4 text-brand-strong" /><p className="text-xs text-text-secondary mt-3">Complementos activos</p><p className="text-2xl font-bold text-text-primary mt-1">{activeAssignments.filter(item => item.kind === 'complement').length}</p></Card>
        <Card className={pendingComments.length ? 'border-semantic-warning bg-semantic-warning-bg' : ''}><MessageSquareText className={`w-4 h-4 ${pendingComments.length ? 'text-semantic-warning' : 'text-brand-strong'}`} /><p className="text-xs text-text-secondary mt-3">Comentarios nuevos</p><p className="text-2xl font-bold text-text-primary mt-1">{pendingComments.length}</p></Card>
      </div>

      <Card highlighted className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3"><FileUp className="w-5 h-5 text-brand-strong mt-0.5" /><div><p className="text-sm font-semibold text-text-primary">Importar PDF o Word con asistencia</p><p className="text-xs text-text-secondary mt-1">Aceptará documentos genéricos y siempre generará un borrador para revisión profesional.</p></div></div>
        <Button variant="secondary" disabled>Próximamente</Button>
      </Card>

      <section aria-labelledby="meal-plan-library-title" className="space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div><h2 id="meal-plan-library-title" className="text-lg font-bold text-text-primary">Planes individuales</h2><p className="text-xs text-text-secondary mt-1">Abrí un plan para editarlo, revisar avances o leer comentarios del paciente.</p></div>
          <div className="relative w-full lg:w-96">
            <label htmlFor="meal-plan-search" className="sr-only">Buscar planes alimentarios</label>
            <Search className="pointer-events-none w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input id="meal-plan-search" className="form-control pl-11 pr-11" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar plan, paciente, estado o nota..." />
            {search && (
              <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg text-text-tertiary hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong" aria-label="Limpiar búsqueda de planes" onClick={() => setSearch('')}>
                <X className="w-4 h-4 mx-auto" />
              </button>
            )}
          </div>
        </div>
        {professionalMealPlans.length === 0 ? (
          <Card className="text-center py-12"><ClipboardList className="w-10 h-10 text-brand-primary mx-auto" /><h2 className="text-lg font-bold mt-4">Creá tu primer plan</h2><p className="text-sm text-text-secondary mt-2">Definí su duración y después completá cada día.</p><Button variant="primary" className="mt-5" onClick={() => setIsCreateOpen(true)}>Crear plan</Button></Card>
        ) : filteredMealPlans.length === 0 ? (
          <Card className="text-center py-12">
            <Search className="w-9 h-9 text-text-tertiary mx-auto" />
            <h2 className="text-lg font-bold mt-4">No encontramos planes</h2>
            <p className="text-sm text-text-secondary mt-2">Probá con otro nombre, paciente o estado.</p>
            <Button variant="secondary" className="mt-5" onClick={() => setSearch('')}>Limpiar búsqueda</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredMealPlans.map(plan => {
              const planAssignments = professionalMealPlanAssignments.filter(assignment => assignment.templateId === plan.id);
              const boundAssignment = planAssignments[0];
              const assignedPatientName = boundAssignment ? patientNameById.get(boundAssignment.patientId) : undefined;
              const pendingPlanComments = pendingComments.filter(record => planAssignments.some(assignment => assignment.id === record.assignmentId));
              const mealCount = plan.days.reduce((total, day) => total + day.meals.length, 0);
              const itemCount = plan.days.reduce((total, day) => total + day.meals.reduce((subtotal, meal) => subtotal + meal.items.length, 0), 0);
              return (
                <Card key={plan.id} className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-bold text-text-primary">{plan.name}</h3><Badge variant={plan.status === 'published' ? 'active' : plan.status === 'draft' ? 'pending' : 'neutral'}>{planStatusLabel[plan.status]}</Badge></div><div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-text-secondary"><span className="inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{plan.days.length} días</span><span>{mealCount} comidas</span><span>{itemCount} elementos</span></div></div>
                    <Button asChild variant="secondary" size="sm"><Link to={`/professional/meal-plans/${plan.id}`}>Abrir y editar<ChevronRight className="w-3.5 h-3.5" /></Link></Button>
                  </div>
                  <div className="rounded-xl bg-surface-subtle border border-border-subtle p-4 min-h-24">
                    <div className="flex items-center justify-between gap-3"><p className="text-xs font-bold text-text-primary">Paciente del plan</p>{pendingPlanComments.length > 0 && <Badge variant="pending">{pendingPlanComments.length} {pendingPlanComments.length === 1 ? 'comentario nuevo' : 'comentarios nuevos'}</Badge>}</div>
                    {!assignedPatientName ? <p className="text-xs text-text-secondary mt-3">Todavía sin asignar. Al asignarlo quedará ligado exclusivamente a esa persona.</p> : <div className="flex items-center gap-2 mt-3"><span className="w-8 h-8 rounded-xl bg-white border border-border-subtle inline-flex items-center justify-center text-[10px] font-bold text-brand-strong">{assignedPatientName.split(' ').map(part => part[0]).slice(0, 2).join('')}</span><div><p className="text-xs font-semibold text-text-primary">{assignedPatientName}</p><p className="text-[10px] text-text-secondary">{boundAssignment?.status === 'active' ? 'Acceso activo' : 'Plan en historial'}</p></div></div>}
                  </div>
                  <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-border-subtle">
                    {plan.status === 'draft' && <Button asChild variant="secondary" size="sm"><Link to={`/professional/meal-plans/${plan.id}`}>Completar borrador</Link></Button>}
                    <Button variant="secondary" size="sm" onClick={() => handleDuplicate(plan.id)}><Copy className="w-3.5 h-3.5" />Duplicar</Button>
                    {plan.status !== 'archived' && <Button variant="ghost" size="sm" onClick={() => setMealPlanStatus(plan.id, 'archived')}><Archive className="w-3.5 h-3.5" />Archivar</Button>}
                    {plan.status === 'published' && !boundAssignment && <Button variant="primary" size="sm" onClick={() => { setPatientId(professionalPatients[0]?.id ?? ''); setAssignmentKind('primary'); setAssigningPlan(plan); }}>Asignar a paciente</Button>}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <Dialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Crear plan alimentario" description="Creá la estructura general. Después ingresarás al editor para completar cada día.">
        <form onSubmit={event => { event.preventDefault(); handleCreate(); }} className="space-y-4">
          <div><label htmlFor="meal-plan-name" className="block text-xs font-semibold text-text-primary mb-1.5">Nombre del plan *</label><input id="meal-plan-name" value={name} onChange={event => setName(event.target.value)} className={inputClassName} placeholder="Ej. Plan de vacaciones" required /></div>
          <div><label htmlFor="meal-plan-duration" className="block text-xs font-semibold text-text-primary mb-1.5">Duración *</label><div className="flex items-center gap-3"><input id="meal-plan-duration" type="number" min={7} max={30} value={duration} onChange={event => setDuration(Number(event.target.value))} className={inputClassName} required /><span className="text-xs text-text-secondary shrink-0">días (7–30)</span></div></div>
          <div className="rounded-xl bg-surface-tinted border border-border-subtle p-3 text-xs text-text-secondary">El plan se crea como borrador. Podrás cargar hasta cuatro comidas opcionales por día y varios elementos en cada comida.</div>
          <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle"><Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>Cancelar</Button><Button type="submit" variant="primary">Crear y continuar</Button></div>
        </form>
      </Dialog>

      <Dialog isOpen={Boolean(assigningPlan)} onClose={() => setAssigningPlan(null)} title="Asignar plan alimentario" description="Después de confirmar, este plan quedará ligado exclusivamente al paciente elegido.">
        <form onSubmit={event => { event.preventDefault(); handleAssign(); }} className="space-y-4">
          <div className="rounded-xl bg-surface-tinted border border-border-subtle p-3"><p className="text-xs text-text-secondary">Plantilla</p><p className="text-sm font-bold text-text-primary mt-1">{assigningPlan?.name}</p></div>
          <div><label htmlFor="meal-plan-patient" className="block text-xs font-semibold text-text-primary mb-1.5">Paciente *</label><select id="meal-plan-patient" value={patientId} onChange={event => setPatientId(event.target.value)} className={inputClassName}>{professionalPatients.map(patient => <option key={patient.id} value={patient.id}>{patient.firstName} {patient.lastName}</option>)}</select></div>
          <fieldset><legend className="block text-xs font-semibold text-text-primary mb-2">Tipo de asignación</legend><div className="grid grid-cols-2 gap-3">{([['primary', 'Plan principal'], ['complement', 'Complemento']] as const).map(([value, label]) => <label key={value} className={`min-h-11 rounded-xl border p-3 text-xs font-semibold cursor-pointer ${assignmentKind === value ? 'border-brand-strong bg-surface-tinted text-brand-strong' : 'border-border-subtle text-text-secondary'}`}><input type="radio" name="assignment-kind" value={value} checked={assignmentKind === value} onChange={() => setAssignmentKind(value)} className="sr-only" />{label}</label>)}</div></fieldset>
          <p className="text-xs text-text-secondary">Si ya existe otro plan del mismo tipo, pasará automáticamente al historial. Para usar esta estructura con otra persona, duplicá el plan.</p>
          <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle"><Button type="button" variant="secondary" onClick={() => setAssigningPlan(null)}>Cancelar</Button><Button type="submit" variant="primary" disabled={!patientId}>Confirmar asignación</Button></div>
        </form>
      </Dialog>
    </div>
  );
}
