import { useEffect, useState } from 'react';
import { CheckCircle2, ChevronDown, CookingPot, MessageSquareText, Save } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MealAdherenceRecord, MealPlanAssignment, ProfessionalRecipe } from '../../types';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';

interface Props {
  assignment: MealPlanAssignment;
  recipes: ProfessionalRecipe[];
  records: MealAdherenceRecord[];
  onToggleMeal: (dayId: string, mealId: string, completed: boolean) => void;
  onSaveComment: (dayId: string, mealId: string, comment: string) => void;
}

interface MealCommentProps {
  dayId: string;
  mealId: string;
  initialComment: string;
  onSave: (dayId: string, mealId: string, comment: string) => void;
}

function MealComment({ dayId, mealId, initialComment, onSave }: MealCommentProps) {
  const [comment, setComment] = useState(initialComment);
  const [saved, setSaved] = useState(true);
  useEffect(() => { setComment(initialComment); setSaved(true); }, [initialComment]);
  return <details open={initialComment ? true : undefined} className="group mt-3 pt-3 border-t border-border-subtle">
    <summary className="min-h-11 cursor-pointer list-none flex items-center justify-between gap-2 rounded-lg px-1 text-[11px] font-semibold text-text-secondary"><span className="flex items-center gap-1.5"><MessageSquareText className="w-3.5 h-3.5" />{initialComment ? 'Comentario para tu nutricionista' : 'Agregar comentario opcional'}</span><ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" /></summary>
    <label htmlFor={`meal-comment-${mealId}`} className="sr-only">Comentario opcional sobre {mealId}</label>
    <textarea id={`meal-comment-${mealId}`} value={comment} maxLength={500} onChange={event => { setComment(event.target.value); setSaved(false); }} className="form-control min-h-20 mt-2 resize-y text-xs" placeholder="Podés contar cómo te resultó esta comida o dejar una consulta." />
    <div className="flex items-center justify-between gap-3 mt-2"><span className="text-[10px] text-text-tertiary">{comment.length}/500 {saved && initialComment ? '· Guardado' : ''}</span>{!saved && <button type="button" onClick={() => { onSave(dayId, mealId, comment); setSaved(true); }} className="min-h-11 px-3 inline-flex items-center gap-1.5 rounded-xl bg-surface-tinted text-xs font-semibold text-brand-strong"><Save className="w-3.5 h-3.5" />Guardar comentario</button>}</div>
  </details>;
}

export function PatientMealPlanCard({ assignment, recipes, records, onToggleMeal, onSaveComment }: Props) {
  const isCompleted = (dayId: string, mealId: string) => records.some(record => record.assignmentId === assignment.id && record.dayId === dayId && record.mealId === mealId && record.completed);
  const totalMeals = assignment.snapshotDays.reduce((total, day) => total + day.meals.length, 0);
  const completedMeals = assignment.snapshotDays.reduce((total, day) => total + day.meals.filter(meal => isCompleted(day.id, meal.id)).length, 0);
  return <Card className="space-y-4"><div className="flex items-start justify-between gap-3"><div><Badge variant={assignment.kind === 'primary' ? 'active' : 'info'}>{assignment.kind === 'primary' ? 'Plan principal' : 'Complemento'}</Badge><h4 className="text-sm font-bold text-text-primary mt-2">{assignment.templateName}</h4><p className="text-[11px] text-text-secondary mt-1">{assignment.snapshotDays.length} días · {completedMeals} de {totalMeals} comidas marcadas</p></div><span className="rounded-full bg-surface-tinted px-2.5 py-1 text-[10px] font-bold text-brand-strong">{totalMeals ? Math.round(completedMeals / totalMeals * 100) : 0}%</span></div>
    <div className="space-y-2">{assignment.snapshotDays.map((day, index) => {
      const dayCompleted = day.meals.filter(meal => isCompleted(day.id, meal.id)).length;
      return <details key={day.id} open={index === 0} className="group rounded-xl border border-border-subtle bg-surface-subtle overflow-hidden"><summary className="min-h-12 px-3 py-2.5 cursor-pointer list-none flex items-center justify-between gap-3"><div><p className="text-xs font-bold text-text-primary">{day.label}</p><p className="text-[10px] text-text-secondary mt-0.5">{dayCompleted} de {day.meals.length} comidas completadas</p></div><ChevronDown className="w-4 h-4 text-text-tertiary transition-transform group-open:rotate-180" /></summary><div className="px-3 pb-3 space-y-2">{day.meals.map(meal => {
        const completed = isCompleted(day.id, meal.id);
        const record = records.find(item => item.assignmentId === assignment.id && item.dayId === day.id && item.mealId === meal.id);
        return <div key={meal.id} className={`rounded-xl border p-3 ${completed ? 'border-[#BDE3CC] bg-[#E8F5EE]' : 'border-border-subtle bg-white'}`}><label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={completed} onChange={event => onToggleMeal(day.id, meal.id, event.target.checked)} className="mt-0.5 w-5 h-5 accent-[#357984] shrink-0" /><span className="min-w-0 flex-1"><span className={`text-xs font-bold ${completed ? 'line-through text-text-secondary' : 'text-text-primary'}`}>{meal.name}</span><span className="block mt-1 space-y-1">{meal.items.map(item => <span key={item.id} className={`block text-xs ${completed ? 'text-text-tertiary' : 'text-text-secondary'}`}>{item.description}{item.amount ? ` · ${item.amount}` : ''}{item.recipeId && recipes.some(recipe => recipe.id === item.recipeId) && <Link to={`/patient/recipes/${item.recipeId}`} onClick={event => event.stopPropagation()} className="min-h-11 mt-1 flex items-center gap-1 text-[11px] font-semibold text-brand-strong hover:underline"><CookingPot className="w-3.5 h-3.5" />Ver receta</Link>}</span>)}</span></span>{completed && <CheckCircle2 className="w-4 h-4 text-semantic-success shrink-0 mt-0.5" />}</label><MealComment dayId={day.id} mealId={meal.id} initialComment={record?.patientComment ?? ''} onSave={onSaveComment} /></div>;
      })}</div></details>;
    })}</div>
    {assignment.snapshotGeneralNotes && <p className="text-xs text-text-secondary"><strong className="text-text-primary">Indicaciones:</strong> {assignment.snapshotGeneralNotes}</p>}
  </Card>;
}
