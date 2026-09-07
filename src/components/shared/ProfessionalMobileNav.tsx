import { CircleUserRound, ClipboardList, Home, ListChecks, Sparkles, Users } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useMock } from '../../app/provider';

const items = [
  { label: 'Inicio', path: '/professional', end: true, icon: Home },
  { label: 'Perfil', path: '/professional/profile', icon: CircleUserRound },
  { label: 'Pacientes', path: '/professional/patients', icon: Users },
  { label: 'Planes', path: '/professional/meal-plans', icon: ClipboardList },
  { label: 'Tareas', path: '/professional/next-steps', icon: ListChecks },
  { label: 'Frases', path: '/professional/recommendations', icon: Sparkles },
] as const;

export function ProfessionalMobileNav() {
  const { professionalMealPlanAssignments, mealAdherenceRecords } = useMock();
  const mealCommentCount = mealAdherenceRecords.filter(record => record.patientComment?.trim() && !record.professionalReviewedAt && professionalMealPlanAssignments.some(assignment => assignment.id === record.assignmentId)).length;
  return <nav aria-label="Navegación inferior del profesional" className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-surface border-t border-border-subtle grid grid-cols-6 px-1 py-1 shadow-lg">{items.map(item => { const Icon = item.icon; const badge = item.path === '/professional/meal-plans' ? mealCommentCount : 0; return <NavLink key={item.path} to={item.path} end={'end' in item ? item.end : false} className={({ isActive }) => `relative min-w-0 min-h-12 px-0.5 flex flex-col items-center justify-center rounded-lg text-[10px] font-medium transition-colors ${isActive ? 'text-brand-strong bg-surface-tinted font-bold' : 'text-text-secondary'}`}><span className="relative"><Icon className="w-4 h-4" />{badge > 0 && <span aria-label={`${badge} comentarios nuevos en planes`} className="absolute -top-2 -right-3 min-w-4 h-4 px-1 rounded-full bg-semantic-warning-bg border border-semantic-warning text-[9px] font-bold text-semantic-warning inline-flex items-center justify-center">{badge}</span>}</span><span className="mt-1 truncate max-w-full">{item.label}</span></NavLink>; })}</nav>;
}
