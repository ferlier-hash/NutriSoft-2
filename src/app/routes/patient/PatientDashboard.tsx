import React from 'react';
import { Link } from 'react-router-dom';
import { useMock } from '../../provider';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { NotFoundPage } from '../NotFoundPage';
import { formatShortDate } from '../../../lib/dateUtils';
import { Sparkles, ArrowRight, CheckCircle2, Clock } from 'lucide-react';

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

  const patientRecs = recommendations.filter(r => r.patientId === currentDemoPatient.id);

  return (
    <div className="pb-20 p-4 space-y-5 max-w-md mx-auto min-h-screen bg-[#F7F9FA]">
      {/* Cabecera Dinámica Aislada por Paciente */}
      <div className="pt-2 pb-2">
        <h2 className="text-2xl font-bold text-[#151B22]">¡Hola, {currentDemoPatient.firstName}! 👋</h2>
        <p className="text-xs text-[#66727D] mt-0.5">Estamos aquí para acompañarte en tu tratamiento.</p>
      </div>

      {/* Tarjeta 1: Check-in pendiente */}
      <Card className="space-y-3 bg-[linear-gradient(135deg,#E9F8F7_0%,#EEF7FB_58%,#FCF9E8_100%)] border-[#BDE9EA]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#55AEB8] text-[#151B22] flex items-center justify-center font-bold shadow-sm">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#151B22]">
              {pendingAssignment ? 'Check-in pendiente' : 'Check-in al día'}
            </h3>
            <p className="text-xs text-[#66727D]">
              {pendingAssignment
                ? 'Cuéntanos cómo te sientes hoy en pocos pasos.'
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
        ) : (
          <div className="flex items-center gap-2 text-xs font-semibold text-[#1E5235] bg-[#E8F5EE] p-2.5 rounded-xl border border-[#BDE3CC]">
            <CheckCircle2 className="w-4 h-4" />
            <span>Respuestas registradas hoy</span>
          </div>
        )}
      </Card>

      {/* Tarjeta 2: Recomendaciones aisladas por paciente */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[#151B22] flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-[#357984]" />
          <span>Recomendación de tu nutricionista</span>
        </h3>

        {patientRecs.length === 0 ? (
          <Card className="text-center py-6 text-xs text-[#66727D]">
            Aún no tienes recomendaciones asignadas.
          </Card>
        ) : (
          patientRecs.map(rec => (
            <Card key={rec.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#357984] uppercase tracking-wider">
                  Recomendación activa
                </span>
                <span className="text-[10px] text-[#8A959D]">
                  {formatShortDate(rec.createdAt)}
                </span>
              </div>
              <p className="text-sm font-semibold text-[#151B22]">"{rec.recommendationText}"</p>
            </Card>
          ))
        )}
      </div>

      {/* Consultorio y Nutricionista derivados dinámicamente */}
      <div className="p-4 bg-[#FFFFFF] border border-[#E2E9EC] rounded-2xl text-xs space-y-1 text-[#66727D]">
        <p className="font-semibold text-[#151B22]">Tu consultorio:</p>
        <p>{assignedOrg?.name || 'Organización'} • {assignedNutri?.name || 'Nutricionista asignado'}</p>
      </div>
    </div>
  );
};
