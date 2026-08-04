import React from 'react';
import { Link } from 'react-router-dom';
import { useMock } from '../../provider';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { NotFoundPage } from '../NotFoundPage';
import { formatShortDate } from '../../../lib/dateUtils';
import { Sparkles, ArrowRight, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export const PatientDashboard: React.FC = () => {
  const { currentDemoPatient, checkInAssignments, recommendations, nutritionists, organizations } = useMock();

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

  const pendingAssignment = checkInAssignments.find(
    a => a.patientId === currentDemoPatient.id && a.status === 'pending'
  );

  const expiredAssignment = checkInAssignments.find(
    a => a.patientId === currentDemoPatient.id && a.status === 'expired'
  );

  const patientRecs = recommendations.filter(r => r.patientId === currentDemoPatient.id);

  return (
    <div className="pb-20 p-4 space-y-5 max-w-md mx-auto min-h-screen bg-bg-app">
      {/* Cabecera Dinámica Aislada por Paciente */}
      <div className="pt-2 pb-2">
        <h2 className="text-2xl font-bold text-text-primary">¡Hola, {currentDemoPatient.firstName}! 👋</h2>
        <p className="text-xs text-text-secondary mt-0.5">Estamos aquí para acompañarte en tu tratamiento.</p>
      </div>

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

      {/* Tarjeta 2: Recomendaciones aisladas por paciente */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-brand-strong" />
          <span>Recomendación de tu nutricionista</span>
        </h3>

        {patientRecs.length === 0 ? (
          <Card className="text-center py-6 text-xs text-text-secondary">
            Aún no tienes recomendaciones asignadas.
          </Card>
        ) : (
          patientRecs.map(rec => (
            <Card key={rec.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-brand-strong uppercase tracking-wider">
                  Recomendación activa
                </span>
                <span className="text-[10px] text-text-tertiary">
                  {formatShortDate(rec.createdAt)}
                </span>
              </div>
              <p className="text-sm font-semibold text-text-primary">"{rec.recommendationText}"</p>
            </Card>
          ))
        )}
      </div>

      {/* Consultorio y Nutricionista derivados dinámicamente */}
      <div className="p-4 bg-surface border border-border-subtle rounded-2xl text-xs space-y-1 text-text-secondary">
        <p className="font-semibold text-text-primary">Tu consultorio:</p>
        <p>{assignedOrg?.name || 'Organización'} • {assignedNutri?.name || 'Nutricionista asignado'}</p>
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
