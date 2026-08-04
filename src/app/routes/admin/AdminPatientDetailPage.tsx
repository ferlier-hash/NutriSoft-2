import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMock } from '../../provider';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { NotFoundPage } from '../NotFoundPage';
import { formatShortDate, formatDateTime } from '../../../lib/dateUtils';
import { ShieldCheck, ChevronRight, User } from 'lucide-react';

export const AdminPatientDetailPage: React.FC = () => {
  const { nutritionistId, patientId } = useParams<{ nutritionistId: string; patientId: string }>();
  const { nutritionists, patients, checkInAssignments, recommendations } = useMock();

  const nutritionist = nutritionists.find(n => n.id === nutritionistId);
  const patient = patients.find(p => p.id === patientId);

  if (!nutritionist || !patient || patient.assignedNutritionistId !== nutritionist.id) {
    return (
      <NotFoundPage
        title="Asignación o paciente no encontrado"
        message="El paciente consultado no está asignado al nutricionista indicado o no existe."
      />
    );
  }

  const checkInsCount = checkInAssignments.filter(a => a.patientId === patient.id).length;
  const recommendationsCount = recommendations.filter(r => r.patientId === patient.id).length;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="text-xs text-[#66727D] flex items-center gap-1.5 font-medium flex-wrap">
        <Link to="/admin" className="hover:text-[#151B22]">Admin</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to="/admin/nutritionists" className="hover:text-[#151B22]">Nutricionistas</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to={`/admin/nutritionists/${nutritionist.id}`} className="hover:text-[#151B22]">{nutritionist.name}</Link>
        <ChevronRight className="w-3 h-3" />
        <span>Pacientes</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-[#151B22] font-semibold">{patient.firstName} {patient.lastName}</span>
      </nav>

      {/* Cabecera Operativa */}
      <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" highlighted>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#55AEB8] text-[#151B22] flex items-center justify-center font-bold text-xl shadow-sm">
            <User className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-[#151B22]">
                {patient.firstName} {patient.lastName}
              </h2>
              <Badge variant={patient.status === 'active' ? 'active' : 'suspended'}>
                {patient.status === 'active' ? 'Cuenta Activa' : 'Archivada'}
              </Badge>
            </div>
            <p className="text-xs text-[#66727D] mt-0.5">
              ID Interno Operativo: <code className="bg-[#E2E9EC] px-1.5 py-0.5 rounded text-[#151B22] font-mono">{patient.id}</code>
            </p>
          </div>
        </div>
      </Card>

      {/* Cartel de Privacidad Operativa */}
      <div className="p-4 bg-[#EDF8F7] border border-[#BDE9EA] rounded-2xl flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-[#357984] shrink-0 mt-0.5" />
        <div className="text-xs text-[#357984]">
          <p className="font-semibold">Privacidad de información clínica:</p>
          <p className="mt-0.5 text-[11px] text-[#66727D]">
            Por privacidad, la información clínica sólo está disponible para los profesionales autorizados de la organización. El administrador visualiza únicamente métricas e identificadores operativos.
          </p>
        </div>
      </div>

      {/* Información Operativa Mínima Permitida */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="space-y-3">
          <h3 className="text-sm font-bold text-[#151B22] border-b border-[#E2E9EC] pb-2">
            Datos de Organización & Vinculación
          </h3>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-[#66727D] block">Organización perteneciente:</span>
              <span className="font-semibold text-[#357984]">{nutritionist.organizationName}</span>
            </div>
            <div>
              <span className="text-[#66727D] block">Nutricionista responsable:</span>
              <span className="font-semibold text-[#151B22]">{nutritionist.name}</span>
            </div>
            <div>
              <span className="text-[#66727D] block">Estado del acceso al portal:</span>
              <Badge variant="active" className="mt-1">
                {patient.portalAccessStatus === 'active' ? 'Acceso Habilitado' : 'Revocado'}
              </Badge>
            </div>
          </div>
        </Card>

        <Card className="space-y-3">
          <h3 className="text-sm font-bold text-[#151B22] border-b border-[#E2E9EC] pb-2">
            Métricas de Uso Agregadas
          </h3>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-[#66727D] block">Fecha de alta en la plataforma:</span>
              <span className="font-semibold text-[#151B22]">{formatShortDate(patient.createdAt)}</span>
            </div>
            <div>
              <span className="text-[#66727D] block">Última actividad en el portal:</span>
              <span className="font-semibold text-[#151B22]">{formatDateTime(patient.lastActiveAt)}</span>
            </div>
            <div className="pt-2 border-t border-[#E2E9EC] flex justify-between">
              <div>
                <span className="text-[#66727D] block">Check-ins asignados:</span>
                <span className="font-bold text-base text-[#151B22]">{checkInsCount}</span>
              </div>
              <div>
                <span className="text-[#66727D] block">Recomendaciones:</span>
                <span className="font-bold text-base text-[#151B22]">{recommendationsCount}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
