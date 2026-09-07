import { ArrowDown, ArrowLeft, ArrowUp, CalendarDays, CheckCircle2, CookingPot, Copy, ExternalLink, GripVertical, MessageSquareText, Plus, Save, Trash2, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { useToast } from '../../../components/ui/Toast';
import { formatDateTime } from '../../../lib/dateUtils';
import type { MealPlanDay, MealPlanMeal, MealPlanStatus, MealPlanTemplate } from '../../../types';
import { useMock } from '../../provider';

const mealNames = ['Desayuno', 'Almuerzo', 'Merienda', 'Cena'] as const;
const inputClassName = 'w-full min-h-11 px-3 py-2 text-sm bg-surface-subtle border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-strong text-text-primary';
const compactDayActionClass = '!min-w-11 !min-h-11 !px-2 xl:!min-w-7 xl:!min-h-7 xl:!px-1';

const clonePlan = (plan: MealPlanTemplate) => structuredClone(plan);

export function MealPlanEditorPage() {
  const { planId } = useParams();
  const { professionalMealPlans, professionalMealPlanAssignments, professionalPatients, professionalRecipes, mealAdherenceRecords, updateMealPlan, markMealCommentReviewed } = useMock();
  const plan = professionalMealPlans.find(item => item.id === planId);
  const { showToast } = useToast();
  const [draft, setDraft] = useState<MealPlanTemplate | null>(() => plan ? clonePlan(plan) : null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [draggedDayId, setDraggedDayId] = useState<string | null>(null);

  const patientNameById = useMemo(() => new Map(professionalPatients.map(patient => [patient.id, `${patient.firstName} ${patient.lastName}`])), [professionalPatients]);
  const planAssignments = useMemo(() => plan ? professionalMealPlanAssignments.filter(assignment => assignment.templateId === plan.id) : [], [plan, professionalMealPlanAssignments]);
  const boundAssignment = planAssignments[0];
  const assignedPatientName = boundAssignment ? patientNameById.get(boundAssignment.patientId) : undefined;
  const planComments = useMemo(() => mealAdherenceRecords.flatMap(record => {
    if (!record.patientComment?.trim()) return [];
    const assignment = planAssignments.find(item => item.id === record.assignmentId);
    const day = assignment?.snapshotDays.find(item => item.id === record.dayId);
    const meal = day?.meals.find(item => item.id === record.mealId);
    if (!assignment || !day || !meal) return [];
    return [{ record, assignment, day, meal }];
  }).sort((left, right) => new Date(right.record.commentedAt ?? right.record.updatedAt).getTime() - new Date(left.record.commentedAt ?? left.record.updatedAt).getTime()), [mealAdherenceRecords, planAssignments]);
  const publishedRecipes = useMemo(() => professionalRecipes.filter(recipe => recipe.status === 'published'), [professionalRecipes]);

  if (!plan || !draft) {
    return <div className="p-6 max-w-4xl mx-auto"><Card className="text-center py-12"><h1 className="text-xl font-bold text-text-primary">Plan no disponible</h1><p className="text-sm text-text-secondary mt-2">No existe o no pertenece al profesional seleccionado.</p><Button asChild variant="secondary" className="mt-5"><Link to="/professional/meal-plans">Volver a la biblioteca</Link></Button></Card></div>;
  }

  const selectedDay = draft.days[selectedDayIndex] ?? draft.days[0];

  const updateDay = (updater: (day: MealPlanDay) => MealPlanDay) => {
    setDraft(current => current ? { ...current, days: current.days.map((day, index) => index === selectedDayIndex ? updater(day) : day) } : current);
  };

  const updateMeal = (mealId: string, updater: (meal: MealPlanMeal) => MealPlanMeal) => {
    updateDay(day => ({ ...day, meals: day.meals.map(meal => meal.id === mealId ? updater(meal) : meal) }));
  };

  const addMeal = () => {
    if (!selectedDay || selectedDay.meals.length >= 4) return;
    const availableName = mealNames.find(name => !selectedDay.meals.some(meal => meal.name === name)) ?? `Comida ${selectedDay.meals.length + 1}`;
    updateDay(day => ({ ...day, meals: [...day.meals, { id: `meal-${crypto.randomUUID()}`, name: availableName, items: [{ id: `item-${crypto.randomUUID()}`, description: '' }] }] }));
  };

  const addItem = (mealId: string) => updateMeal(mealId, meal => ({ ...meal, items: [...meal.items, { id: `item-${crypto.randomUUID()}`, description: '' }] }));

  const cloneDayWithNewIds = (day: MealPlanDay): MealPlanDay => ({
    ...structuredClone(day),
    id: `day-${crypto.randomUUID()}`,
    meals: day.meals.map(meal => ({
      ...structuredClone(meal),
      id: `meal-${crypto.randomUUID()}`,
      items: meal.items.map(item => ({ ...structuredClone(item), id: `item-${crypto.randomUUID()}` })),
    })),
  });

  const addDay = () => {
    if (draft.days.length >= 30) {
      showToast('Límite alcanzado', 'Un plan puede contener hasta 30 días.', 'error');
      return;
    }
    const nextIndex = draft.days.length;
    setDraft(current => current ? { ...current, days: [...current.days, { id: `day-${crypto.randomUUID()}`, label: `Día ${nextIndex + 1}`, meals: [] }] } : current);
    setSelectedDayIndex(nextIndex);
  };

  const duplicateDay = (index: number) => {
    if (draft.days.length >= 30) {
      showToast('Límite alcanzado', 'No se puede duplicar porque el plan ya tiene 30 días.', 'error');
      return;
    }
    const copy = cloneDayWithNewIds(draft.days[index]!);
    setDraft(current => current ? { ...current, days: [...current.days.slice(0, index + 1), copy, ...current.days.slice(index + 1)] } : current);
    setSelectedDayIndex(index + 1);
  };

  const removeDay = (index: number) => {
    if (draft.days.length <= 7) {
      showToast('Mínimo de días', 'Los planes deben conservar al menos 7 días.', 'error');
      return;
    }
    setDraft(current => current ? { ...current, days: current.days.filter((_, dayIndex) => dayIndex !== index) } : current);
    setSelectedDayIndex(current => current > index ? current - 1 : Math.min(current, draft.days.length - 2));
    showToast('Día quitado', 'El cambio se aplicará cuando guardes el plan.');
  };

  const moveDay = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || toIndex >= draft.days.length) return;
    setDraft(current => {
      if (!current) return current;
      const reordered = [...current.days];
      const [moved] = reordered.splice(fromIndex, 1);
      if (!moved) return current;
      reordered.splice(toIndex, 0, moved);
      return { ...current, days: reordered };
    });
    setSelectedDayIndex(toIndex);
  };

  const save = (status: MealPlanStatus) => {
    try {
      const updated = updateMealPlan(plan.id, {
        name: draft.name,
        status: status === 'archived' ? 'draft' : status,
        days: draft.days,
        generalNotes: draft.generalNotes,
        shoppingList: draft.shoppingList,
        goals: draft.goals,
      });
      setDraft(clonePlan(updated));
      showToast(status === 'published' ? 'Plan publicado' : 'Cambios guardados', status === 'published' ? 'El plan ya puede asignarse a un paciente.' : 'El borrador quedó actualizado.');
    } catch (error) {
      showToast('No pudimos guardar', error instanceof Error ? error.message : 'Revisá el contenido del plan.', 'error');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <Link to="/professional/meal-plans" className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-brand-strong"><ArrowLeft className="w-3.5 h-3.5" />Biblioteca de planes</Link>
          <div className="flex flex-wrap items-end gap-3 mt-3"><label className="block min-w-0 w-full sm:w-auto"><span className="block text-[11px] font-semibold text-text-secondary mb-1">Título general del plan</span><input aria-label="Título general del plan" value={draft.name} onChange={event => setDraft(current => current ? { ...current, name: event.target.value } : current)} className="w-full sm:w-auto min-h-11 text-xl sm:text-2xl font-bold text-text-primary bg-transparent border-b border-border-subtle hover:border-border-hover focus:border-brand-strong focus:outline-none" /></label><Badge variant={draft.status === 'published' ? 'active' : 'pending'}>{draft.status === 'published' ? 'Publicado' : 'Borrador'}</Badge></div>
          <p className="text-sm text-text-secondary mt-2 inline-flex items-center gap-1.5"><CalendarDays className="w-4 h-4" />{draft.days.length} días · hasta 4 comidas opcionales por día</p>
        </div>
        <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => save(draft.status === 'published' ? 'published' : 'draft')}><Save className="w-4 h-4" />{draft.status === 'published' ? 'Guardar cambios' : 'Guardar borrador'}</Button>{draft.status !== 'published' && <Button variant="primary" onClick={() => save('published')}>Guardar y publicar</Button>}</div>
      </div>

      <Card highlighted className="space-y-3">
        <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><UserRound className="w-4 h-4 text-brand-strong" /><h2 className="text-sm font-bold text-text-primary">Paciente de este plan</h2></div><Badge variant={assignedPatientName ? 'info' : 'neutral'}>{assignedPatientName ? 'Asignado' : 'Sin asignar'}</Badge></div>
        {!assignedPatientName ? <p className="text-xs text-text-secondary">Todavía no está asignado. Cuando lo asignes quedará ligado exclusivamente a esa persona.</p> : <div className="flex items-center gap-2"><span className="rounded-full bg-white border border-border-subtle px-3 py-1.5 text-xs font-semibold text-text-primary">{assignedPatientName}</span><span className="text-[11px] text-text-secondary">{boundAssignment?.status === 'active' ? 'Acceso activo' : 'En historial'}</span></div>}
        <p className="text-[11px] text-text-tertiary">Para reutilizar la estructura con otra persona, creá una copia independiente desde la biblioteca.</p>
      </Card>

      {boundAssignment && <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h2 className="text-sm font-bold text-text-primary flex items-center gap-2"><MessageSquareText className="w-4 h-4 text-brand-strong" />Comentarios del paciente</h2><p className="text-xs text-text-secondary mt-1">Consultas y observaciones que {assignedPatientName} dejó al avanzar comida por comida.</p></div>{(() => { const pendingCount = planComments.filter(item => !item.record.professionalReviewedAt).length; return <Badge variant={pendingCount ? 'pending' : 'neutral'}>{pendingCount} {pendingCount === 1 ? 'nuevo' : 'nuevos'}</Badge>; })()}</div>
        {planComments.length === 0 ? <div className="rounded-xl bg-surface-subtle border border-border-subtle p-4"><p className="text-xs text-text-secondary">Todavía no hay comentarios en este plan.</p></div> : <div className="space-y-2">{planComments.map(({ record, day, meal }) => {
          const draftDayIndex = draft.days.findIndex(item => item.id === day.id);
          return <div key={record.id} className={`rounded-xl border p-4 ${record.professionalReviewedAt ? 'border-border-subtle bg-surface-subtle' : 'border-semantic-warning bg-semantic-warning-bg'}`}><div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge variant={record.professionalReviewedAt ? 'neutral' : 'pending'}>{record.professionalReviewedAt ? 'Revisado' : 'Nuevo'}</Badge><p className="text-xs font-bold text-text-primary">{day.label.split(' · ')[0]} · {meal.name}</p><span className="text-[10px] text-text-tertiary">{formatDateTime(record.commentedAt ?? record.updatedAt)}</span></div><p className="text-sm text-text-primary mt-2">“{record.patientComment}”</p></div><div className="flex flex-wrap gap-2 shrink-0">{draftDayIndex >= 0 && <Button variant="secondary" size="sm" onClick={() => setSelectedDayIndex(draftDayIndex)}>Ver comida</Button>}{!record.professionalReviewedAt && <Button variant="secondary" size="sm" onClick={() => { try { markMealCommentReviewed(record.id); showToast('Comentario revisado', 'Quedó registrado como leído.'); } catch (error) { showToast('No pudimos actualizarlo', error instanceof Error ? error.message : 'Intentá nuevamente.', 'error'); } }}><CheckCircle2 className="w-3.5 h-3.5" />Marcar revisado</Button>}</div></div></div>;
        })}</div>}
      </Card>}

      <div className="grid grid-cols-1 xl:grid-cols-[430px_minmax(0,1fr)] gap-5 items-start">
        <Card className="p-3 xl:sticky xl:top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
          <div className="flex items-center justify-between gap-2 px-2 py-2"><div><h2 className="text-xs font-bold text-text-primary">Organización del plan</h2><p className="text-[10px] text-text-tertiary mt-1">Arrastrá los días para reordenarlos.</p></div><Button aria-label="Agregar día al final" title="Agregar día al final" variant="secondary" size="sm" onClick={addDay} disabled={draft.days.length >= 30}><Plus className="w-3.5 h-3.5" /></Button></div>
          <div className="space-y-2 mt-2">
            {draft.days.map((day, index) => (
              <div
                key={day.id}
                draggable
                onDragStart={() => setDraggedDayId(day.id)}
                onDragEnd={() => setDraggedDayId(null)}
                onDragOver={event => event.preventDefault()}
                onDrop={() => {
                  const fromIndex = draft.days.findIndex(item => item.id === draggedDayId);
                  moveDay(fromIndex, index);
                  setDraggedDayId(null);
                }}
                className={`group rounded-xl border p-2 transition-all ${draggedDayId === day.id ? 'opacity-50' : ''} ${selectedDayIndex === index ? 'bg-surface-tinted border-brand-strong shadow-xs' : 'bg-white border-border-subtle hover:border-border-hover'}`}
              >
                <div className="flex items-center gap-1">
                  <GripVertical className="w-4 h-4 text-text-tertiary shrink-0 cursor-grab" aria-hidden="true" />
                  <button type="button" title={day.title || `Día ${index + 1} sin título adicional`} aria-label={`Seleccionar Día ${index + 1}${day.title ? `, ${day.title}` : ''}`} onClick={() => setSelectedDayIndex(index)} className="min-w-0 flex-1 text-left px-1 py-1.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong">
                    <span className="block text-xs font-bold text-text-primary">Día {index + 1}</span>
                    <span className={`block text-[11px] mt-0.5 truncate ${day.title ? 'text-text-secondary' : 'text-text-tertiary'}`}>{day.title || 'Sin título adicional'}</span>
                  </button>
                  <Button className={compactDayActionClass} aria-label={`Mover Día ${index + 1} hacia arriba`} title="Mover hacia arriba" variant="ghost" size="sm" onClick={() => moveDay(index, index - 1)} disabled={index === 0}><ArrowUp className="w-3.5 h-3.5" /></Button>
                  <Button className={compactDayActionClass} aria-label={`Mover Día ${index + 1} hacia abajo`} title="Mover hacia abajo" variant="ghost" size="sm" onClick={() => moveDay(index, index + 1)} disabled={index === draft.days.length - 1}><ArrowDown className="w-3.5 h-3.5" /></Button>
                  <Button className={compactDayActionClass} aria-label={`Copiar Día ${index + 1}`} title="Copiar día" variant="ghost" size="sm" onClick={() => duplicateDay(index)} disabled={draft.days.length >= 30}><Copy className="w-3.5 h-3.5" /></Button>
                  <Button className={compactDayActionClass} aria-label={`Quitar Día ${index + 1}`} title={draft.days.length <= 7 ? 'El plan debe conservar al menos 7 días' : 'Quitar día'} variant="ghost" size="sm" onClick={() => removeDay(index)} disabled={draft.days.length <= 7}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
          <Button variant="secondary" className="w-full mt-3" onClick={addDay} disabled={draft.days.length >= 30}><Plus className="w-3.5 h-3.5" />Agregar día</Button>
          <p className="text-[10px] text-text-tertiary text-center mt-2">{draft.days.length} de 30 días · mínimo 7</p>
        </Card>

        {selectedDay && <div className="space-y-4">
          <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0 flex-1"><p className="text-xs text-text-secondary">Editando</p><h2 className="text-lg font-bold text-text-primary mt-1">Día {selectedDayIndex + 1}</h2><label className="block mt-3 max-w-xl"><span className="block text-[11px] font-semibold text-text-secondary mb-1">Título adicional opcional</span><input aria-label="Título adicional del día" value={selectedDay.title ?? ''} onChange={event => updateDay(day => ({ ...day, title: event.target.value }))} className={inputClassName} placeholder="Ej. Todo moderado o Día de permitido" /></label></div>
            <Button variant="secondary" size="sm" onClick={addMeal} disabled={selectedDay.meals.length >= 4}><Plus className="w-3.5 h-3.5" />Agregar comida ({selectedDay.meals.length}/4)</Button>
          </Card>

          {selectedDay.meals.length === 0 ? <Card className="text-center py-10"><p className="text-sm font-semibold text-text-primary">Este día todavía no tiene comidas</p><p className="text-xs text-text-secondary mt-2">Podés dejarlo vacío mientras trabajás el borrador.</p><Button variant="secondary" className="mt-4" onClick={addMeal}><Plus className="w-4 h-4" />Agregar primera comida</Button></Card> : selectedDay.meals.map((meal, mealIndex) => (
            <Card key={meal.id} className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1"><span className="w-8 h-8 rounded-lg bg-brand-soft text-brand-strong inline-flex items-center justify-center text-xs font-bold">{mealIndex + 1}</span><select aria-label={`Nombre de la comida ${mealIndex + 1}`} value={meal.name} onChange={event => updateMeal(meal.id, current => ({ ...current, name: event.target.value }))} className={`${inputClassName} max-w-xs`}>{mealNames.map(name => <option key={name} value={name}>{name}</option>)}</select></div>
                <Button aria-label={`Quitar ${meal.name}`} variant="ghost" size="sm" onClick={() => updateDay(day => ({ ...day, meals: day.meals.filter(item => item.id !== meal.id) }))}><Trash2 className="w-4 h-4" /></Button>
              </div>

              <fieldset className="space-y-3">
                <legend className="text-xs font-bold text-text-primary">Elementos de la comida</legend>
                {meal.items.map((item, itemIndex) => {
                  const linkedRecipe = publishedRecipes.find(recipe => recipe.id === item.recipeId);
                  return (
                    <div key={item.id} className="rounded-xl border border-border-subtle bg-surface-subtle/40 p-3 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_180px_44px] gap-2 items-end">
                        <div><label htmlFor={`${item.id}-description`} className="block text-[11px] text-text-secondary mb-1">Elemento {itemIndex + 1}</label><input id={`${item.id}-description`} value={item.description} onChange={event => updateMeal(meal.id, current => ({ ...current, items: current.items.map(currentItem => currentItem.id === item.id ? { ...currentItem, description: event.target.value } : currentItem) }))} className={inputClassName} placeholder="Ej. Yogur natural" /></div>
                        <div><label htmlFor={`${item.id}-amount`} className="block text-[11px] text-text-secondary mb-1">Cantidad opcional</label><input id={`${item.id}-amount`} value={item.amount ?? ''} onChange={event => updateMeal(meal.id, current => ({ ...current, items: current.items.map(currentItem => currentItem.id === item.id ? { ...currentItem, amount: event.target.value } : currentItem) }))} className={inputClassName} placeholder="Ej. 1 taza" /></div>
                        <Button aria-label={`Quitar elemento ${itemIndex + 1}`} variant="ghost" onClick={() => updateMeal(meal.id, current => ({ ...current, items: current.items.filter(currentItem => currentItem.id !== item.id) }))}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                        <div className="min-w-0 flex-1"><label htmlFor={`${item.id}-recipe`} className="block text-[11px] text-text-secondary mb-1">Receta vinculada opcional</label><select id={`${item.id}-recipe`} value={item.recipeId ?? ''} onChange={event => updateMeal(meal.id, current => ({ ...current, items: current.items.map(currentItem => currentItem.id === item.id ? { ...currentItem, recipeId: event.target.value || undefined } : currentItem) }))} className={inputClassName}><option value="">Sin receta vinculada</option>{publishedRecipes.map(recipe => <option key={recipe.id} value={recipe.id}>{recipe.title}</option>)}</select></div>
                        {linkedRecipe ? <Button asChild variant="ghost" size="sm"><Link to={`/professional/recipes/${linkedRecipe.id}`} className="gap-1.5"><CookingPot className="w-4 h-4" />Ver receta<ExternalLink className="w-3.5 h-3.5" /></Link></Button> : null}
                      </div>
                    </div>
                  );
                })}
              </fieldset>
              <Button variant="secondary" size="sm" onClick={() => addItem(meal.id)}><Plus className="w-3.5 h-3.5" />Agregar elemento</Button>
              <div><label htmlFor={`${meal.id}-alternatives`} className="block text-xs font-semibold text-text-primary mb-1.5">Alternativas opcionales</label><textarea id={`${meal.id}-alternatives`} value={meal.alternatives ?? ''} onChange={event => updateMeal(meal.id, current => ({ ...current, alternatives: event.target.value }))} className={`${inputClassName} min-h-20 resize-y`} placeholder="Opciones de reemplazo para esta comida" /></div>
            </Card>
          ))}
        </div>}
      </div>

      <Card className="space-y-4">
        <h2 className="text-base font-bold text-text-primary">Información general del plan</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div><label htmlFor="plan-goals" className="block text-xs font-semibold text-text-primary mb-1.5">Objetivos opcionales</label><textarea id="plan-goals" value={draft.goals ?? ''} onChange={event => setDraft(current => current ? { ...current, goals: event.target.value } : current)} className={`${inputClassName} min-h-28 resize-y`} /></div>
          <div><label htmlFor="plan-notes" className="block text-xs font-semibold text-text-primary mb-1.5">Indicaciones generales</label><textarea id="plan-notes" value={draft.generalNotes ?? ''} onChange={event => setDraft(current => current ? { ...current, generalNotes: event.target.value } : current)} className={`${inputClassName} min-h-28 resize-y`} /></div>
          <div><label htmlFor="plan-shopping" className="block text-xs font-semibold text-text-primary mb-1.5">Lista de compras</label><textarea id="plan-shopping" value={draft.shoppingList ?? ''} onChange={event => setDraft(current => current ? { ...current, shoppingList: event.target.value } : current)} className={`${inputClassName} min-h-28 resize-y`} /></div>
        </div>
      </Card>
    </div>
  );
}
