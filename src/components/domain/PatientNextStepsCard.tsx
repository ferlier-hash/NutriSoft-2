import { useEffect, useState } from 'react';
import { CheckSquare, MessageSquareText } from 'lucide-react';
import type { PatientNextStepList } from '../../types';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';

interface Props {
  list: PatientNextStepList;
  onUpdate: (itemId: string, completed: boolean, comment: string) => void;
}

export function PatientNextStepsCard({ list, onUpdate }: Props) {
  const [comments, setComments] = useState<Record<string, string>>(() => Object.fromEntries(list.items.map(item => [item.id, item.patientComment ?? ''])));
  useEffect(() => setComments(Object.fromEntries(list.items.map(item => [item.id, item.patientComment ?? '']))), [list]);
  const completed = list.items.filter(item => item.completed).length;
  return <section className="space-y-3" aria-labelledby="patient-next-steps-title">
    <div className="flex items-center justify-between gap-3"><h3 id="patient-next-steps-title" className="text-sm font-bold text-text-primary flex items-center gap-1.5"><CheckSquare className="w-4 h-4 text-brand-strong" />Próximos pasos</h3><Badge variant="info">{list.durationDays} días</Badge></div>
    <Card className="space-y-4"><div><p className="text-sm font-bold text-text-primary">{list.title}</p><p className="text-[11px] text-text-secondary mt-1">{completed} de {list.items.length} tareas completadas</p><div className="h-1.5 rounded-full bg-surface-subtle overflow-hidden mt-2"><div className="h-full bg-brand-primary rounded-full transition-all" style={{ width: `${list.items.length ? completed / list.items.length * 100 : 0}%` }} /></div></div>
      <div className="space-y-3">{list.items.map(item => <div key={item.id} className="rounded-xl bg-surface-subtle border border-border-subtle p-3"><label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={item.completed} onChange={event => onUpdate(item.id, event.target.checked, comments[item.id] ?? '')} className="mt-0.5 w-5 h-5 accent-[#357984] shrink-0" /><span className={`text-xs font-medium leading-relaxed ${item.completed ? 'line-through text-text-secondary' : 'text-text-primary'}`}>{item.text}</span></label><div className="mt-3"><label htmlFor={`task-comment-${item.id}`} className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-text-secondary"><MessageSquareText className="w-3.5 h-3.5 shrink-0" />Comentario opcional</label><textarea id={`task-comment-${item.id}`} rows={2} value={comments[item.id] ?? ''} onChange={event => setComments(prev => ({ ...prev, [item.id]: event.target.value }))} onBlur={() => onUpdate(item.id, item.completed, comments[item.id] ?? '')} placeholder="Escribí un comentario para tu nutricionista" className="form-control text-xs resize-none" /></div></div>)}</div>
    </Card>
  </section>;
}
