import React from 'react';
import { Link } from 'react-router-dom';
import { useMock } from '../../provider';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { NotFoundPage } from '../NotFoundPage';
import { formatShortDate } from '../../../lib/dateUtils';
import { Sparkles, ArrowRight, CheckCircle2, Clock, AlertCircle, BookOpen, FileText, ExternalLink, ClipboardList, Bell, CalendarClock, CalendarPlus, Ruler } from 'lucide-react';
import { PatientNextStepsCard } from '../../../components/domain/PatientNextStepsCard';
import { PatientMealPlanCard } from '../../../components/domain/PatientMealPlanCard';

export const PatientDashboard: React.FC = () => {
  const { currentDemoPatient, checkInAssignments, recommendations, nutritionists, organizations, patientResources, patientRecipes, patientMealPlanAssignments, patientNextStepList, updateNextStepItemByPatient, mealAdherenceRecords, setMealCompleted, setMealComment, patientAppointmentNotifications, markAppointmentNotificationRead } = useMock();

  if (!currentDemoPatient) {
    return (
      <NotFoundPage
        title="Paciente no encontrado"
        message="El paciente simulado seleccionado no existe en la base de datos de demostración."
      />
    );
  }

  const assignedNutri = nutritionists.find(n => n.id === currentDemoPatient.assignedNutritionistId);
  const assignedOrg = organizations.find(o => o.id === currentDemoPatient.organizationId);
  const branding = assignedOrg?.plan === 'CUSTOM' ? assignedOrg.branding : undefined;

  const pendingAssignment = checkInAssignments.find(
    a => a.patientId === currentDemoPatient.id && a.status === 'pending'
  );

  const expiredAssignment = checkInAssignments.find(
    a => a.patientId === currentDemoPatient.id && a.status === 'expired'
  );

  const activeRecommendation = recommendations.find(r => r.patientId === currentDemoPatient.id && r.phraseId);
  const activeMealPlans = patientMealPlanAssignments.filter(assignment => assignment.status === 'active');

  return (
    <div className="pb-20 p-4 space-y-5 max-w-md mx-auto min-h-screen bg-bg-app">
      {branding && (
        <section className="overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-xs" aria-label={`Marca de ${branding.displayName}`}>
          <div
            className={`min-h-32 p-4 flex items-end ${branding.patientHeaderImageDataUrl ? 'text-white' : 'bg-brand-soft text-text-primary'}`}
            style={branding.patientHeaderImageDataUrl ? {
              backgroundImage: `linear-gradient(90deg, rgba(12, 25, 34, .62), rgba(12, 25, 34, .14)), url(${branding.patientHeaderImageDataUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            } : undefined}
          >
            <div className="flex items-end gap-3 min-w-0">
              {branding.logoDataUrl ? (
                <img src={branding.logoDataUrl} alt={`Logo de ${branding.displayName}`} className="w-11 h-11 rounded-xl object-cover border border-white/50 bg-white shrink-0" />
              ) : (
                <span className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${branding.patientHeaderImageDataUrl ? 'bg-white/20 text-white border border-white/40' : 'bg-surface text-brand-strong border border-border-subtle'}`}>
                  {branding.displayName.slice(0, 2).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="font-bold text-base truncate">{branding.displayName}</p>
                {branding.tagline && <p className={`mt-0.5 text-xs ${branding.patientHeaderImageDataUrl ? 'text-white/90' : 'text-text-secondary'}`}>{branding.tagline}</p>}
              </div>
            </div>
          </div>
          {(branding.contactPhone || branding.contactEmail || branding.contactAddress) && (
            <p className="px-4 py-2.5 text-[11px] text-text-secondary border-t border-border-subtle truncate">
              {[branding.contactAddress, branding.contactPhone, branding.contactEmail].filter(Boolean).join(' · ')}
            </p>
          )}
        </section>
      )}
      {/* Cabecera Dinámica Aislada por Paciente */}
      <div className="pt-2 pb-2">
        <h2 className="text-2xl font-bold text-text-primary">¡Hola, {currentDemoPatient.firstName}! 👋</h2>
        <p className="text-xs text-text-secondary mt-0.5">Estamos aquí para acompañarte en tu tratamiento.</p>
      </div>

      <Button asChild variant="secondary" className="w-full justify-between">
        <Link to="/patient/request-appointment"><span className="inline-flex items-center gap-2"><CalendarPlus className="w-4 h-4" />Solicitar una cita</span><ArrowRight className="w-4 h-4" /></Link>
      </Button>
      <Button asChild variant="secondary" className="w-full justify-between">
        <Link to="/patient/appointments"><span className="inline-flex items-center gap-2"><CalendarClock className="w-4 h-4" />Mis citas</span><ArrowRight className="w-4 h-4" /></Link>
      </Button>
      <Button asChild variant="secondary" className="w-full justify-between">
        <Link to="/patient/measurements"><span className="inline-flex items-center gap-2"><Ruler className="w-4 h-4" />Registrar mediciones</span><ArrowRight className="w-4 h-4" /></Link>
      </Button>

      {/* Tarjeta 1: Estado del Check-in (STATUS-01) */}
      <Card className="space-y-3 bg-[#E9F8F7] border-[#BDE9EA]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-primary text-text-primary flex items-center justify-center font-bold shadow-xs shrink-0">
            {pendingAssignment ? (
              <Clock className="w-5 h-5" />
            ) : expiredAssignment ? (
              <AlertCircle className="w-5 h-5 text-[#902A24]" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-[#1E5235]" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-sm text-text-primary">
              {pendingAssignment
                ? 'Check-in pendiente'
                : expiredAssignment
                ? 'Check-in vencido'
                : 'Check-in al día'}
            </h3>
            <p className="text-xs text-text-secondary">
              {pendingAssignment
                ? 'Cuéntanos cómo te sientes hoy en pocos pasos.'
                : expiredAssignment
                ? 'La fecha para enviar tu reporte previo ha expirarado.'
                : 'Ya completaste tu reporte de hoy. ¡Buen trabajo!'}
            </p>
          </div>
        </div>

        {pendingAssignment ? (
          <Button asChild variant="primary" className="w-full justify-between mt-2">
            <Link to={`/patient/check-in/${pendingAssignment.id}`}>
              <span>Realizar check-in</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        ) : expiredAssignment ? (
          <div className="flex items-center gap-2 text-xs font-semibold text-[#902A24] bg-[#FCEBEA] p-2.5 rounded-xl border border-[#F8C4C1]">
            <AlertCircle className="w-4 h-4 text-[#902A24]" />
            <span>Asignación vencida</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-semibold text-[#1E5235] bg-[#E8F5EE] p-2.5 rounded-xl border border-[#BDE3CC]">
            <CheckCircle2 className="w-4 h-4" />
            <span>Respuestas registradas</span>
          </div>
        )}
      </Card>

      {patientAppointmentNotifications.length > 0 && (
        <section className="space-y-3" aria-labelledby="patient-appointment-news-title">
          <div className="flex items-center justify-between gap-3">
            <h3 id="patient-appointment-news-title" className="text-sm font-bold text-text-primary flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-brand-strong" />
              Novedades de citas
            </h3>
            <Badge variant={patientAppointmentNotifications.some(notification => !notification.readAt) ? 'info' : 'neutral'}>
              {patientAppointmentNotifications.filter(notification => !notification.readAt).length} nuevas
            </Badge>
          </div>
          <Card className="p-0 overflow-hidden">
            <ul className="divide-y divide-border-subtle">
              {patientAppointmentNotifications.slice(0, 3).map(notification => (
                <li key={notification.id} className="p-3 flex items-start gap-3">
                  <span className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${notification.readAt ? 'bg-surface-subtle text-text-secondary' : 'bg-brand-soft text-brand-strong'}`}>
                    <CalendarClock className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs font-bold text-text-primary">{notification.title}</p>
                      <span className="text-[10px] text-text-tertiary shrink-0">{formatShortDate(notification.createdAt)}</span>
                    </div>
                    <p className="text-xs text-text-secondary mt-1">{notification.message}</p>
                    {!notification.readAt && (
                      <Button type="button" variant="ghost" size="sm" className="mt-2 min-h-8 px-2 text-[11px]" onClick={() => markAppointmentNotificationRead(notification.id)}>
                        Marcar como visto
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      {/* Tarjeta 2: Recomendaciones aisladas por paciente */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-brand-strong" />
          <span>Recomendación de tu nutricionista</span>
        </h3>

        {!activeRecommendation ? (
          <Card className="text-center py-6 text-xs text-text-secondary">
            Aún no tienes recomendaciones asignadas.
          </Card>
        ) : (
            <Card className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-brand-strong uppercase tracking-wider">
                  Recomendación activa
                </span>
                <span className="text-[10px] text-text-tertiary">
                  {formatShortDate(activeRecommendation.createdAt)}
                </span>
              </div>
              <p className="text-sm font-semibold text-text-primary">"{activeRecommendation.recommendationText}"</p>
            </Card>
        )}
      </div>

      {patientNextStepList && <PatientNextStepsCard list={patientNextStepList} onUpdate={(itemId, completed, comment) => updateNextStepItemByPatient(patientNextStepList.id, itemId, completed, comment)} />}

      <section className="space-y-3" aria-labelledby="patient-plan-title">
        <div className="flex items-center justify-between gap-3">
          <h3 id="patient-plan-title" className="text-sm font-bold text-text-primary flex items-center gap-1.5"><ClipboardList className="w-4 h-4 text-brand-strong" />Tu plan alimentario</h3>
          <Badge variant={activeMealPlans.length > 0 ? 'active' : 'neutral'}>{activeMealPlans.length > 0 ? 'Activo' : 'Sin asignar'}</Badge>
        </div>
        {activeMealPlans.length === 0 ? <Card className="text-center py-6 text-xs text-text-secondary">Tu nutricionista todavía no asignó un plan alimentario.</Card> : activeMealPlans.map(assignment => <PatientMealPlanCard key={assignment.id} assignment={assignment} recipes={patientRecipes} records={mealAdherenceRecords.filter(record => record.patientId === currentDemoPatient.id)} onToggleMeal={(dayId, mealId, completed) => setMealCompleted(assignment.id, dayId, mealId, completed)} onSaveComment={(dayId, mealId, comment) => setMealComment(assignment.id, dayId, mealId, comment)} />)}
      </section>

      <section className="space-y-3" aria-labelledby="patient-resources-title">
        <div className="flex items-center justify-between gap-3">
          <h3 id="patient-resources-title" className="text-sm font-bold text-text-primary flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-brand-strong" />
            Recursos para vos
          </h3>
          <Badge variant="neutral">{patientResources.length}</Badge>
        </div>
        {patientResources.length === 0 ? (
          <Card className="text-center py-6 text-xs text-text-secondary">
            Tu nutricionista todavía no publicó recursos para tu seguimiento.
          </Card>
        ) : (
          <div className="space-y-2">
            {patientResources.slice(0, 3).map(resource => (
              <Card key={resource.id} className="flex items-center gap-3 py-3">
                <span className="w-10 h-10 rounded-xl bg-brand-soft text-brand-strong flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-text-primary truncate">{resource.title}</p>
                  <p className="text-[10px] text-text-tertiary mt-0.5">{resource.category} · Compartido por tu nutricionista</p>
                </div>
                {resource.kind === 'video' && (
                  <a href={resource.source} target="_blank" rel="noreferrer" aria-label={`Abrir ${resource.title}`} className="min-w-11 min-h-11 rounded-xl text-brand-strong flex items-center justify-center hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-brand-strong">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </Card>
            ))}
            {patientResources.length > 3 && <Button asChild variant="secondary" className="w-full"><Link to="/patient/resources">Ver todos los recursos ({patientResources.length})</Link></Button>}
          </div>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="patient-recipes-title">
        <div className="flex items-center justify-between gap-3">
          <h3 id="patient-recipes-title" className="text-sm font-bold text-text-primary flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-brand-strong" />
            Recetas recomendadas
          </h3>
          <Badge variant="neutral">{patientRecipes.length}</Badge>
        </div>
        {patientRecipes.length === 0 ? (
          <Card className="text-center py-6 text-xs text-text-secondary">
            No hay recetas publicadas para tu seguimiento todavía.
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {patientRecipes.slice(0, 3).map(recipe => (
              <Card key={recipe.id} className="flex items-center gap-3 py-3">
                <span className="w-12 h-12 rounded-xl bg-surface-tinted bg-cover bg-center shrink-0" style={{ backgroundImage: `url(${recipe.imageUrl})` }} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-text-primary truncate">{recipe.title}</p>
                  <p className="text-[10px] text-text-tertiary mt-0.5">{recipe.category} · {recipe.prepMinutes} min · {recipe.calories} kcal</p>
                </div>
              </Card>
            ))}
            {patientRecipes.length > 3 && <Button asChild variant="secondary" className="w-full"><Link to="/patient/recipes">Ver todas las recetas ({patientRecipes.length})</Link></Button>}
          </div>
        )}
      </section>

      {/* Consultorio y Nutricionista derivados dinámicamente */}
      <div className="p-4 bg-surface border border-border-subtle rounded-2xl text-xs space-y-1 text-text-secondary">
        <p className="font-semibold text-text-primary">Tu consultorio:</p>
        <p>{branding?.displayName || assignedOrg?.name || 'Organización'} • {assignedNutri?.name || 'Nutricionista asignado'}</p>
        <div className="pt-1">
          <span className="text-[11px] text-text-tertiary">Acceso al portal: </span>
          <Badge
            variant={
              currentDemoPatient.portalAccessStatus === 'active'
                ? 'active'
                : currentDemoPatient.portalAccessStatus === 'pending'
                ? 'pending'
                : 'suspended'
            }
          >
            {currentDemoPatient.portalAccessStatus === 'active'
              ? 'Acceso Habilitado'
              : currentDemoPatient.portalAccessStatus === 'pending'
              ? 'Pendiente de registro'
              : 'Acceso Revocado'}
          </Badge>
        </div>
      </div>
    </div>
  );
};
