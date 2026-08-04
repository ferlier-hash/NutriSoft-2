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
      <nav aria-label="Breadcrumb" className="text-xs text-text-secondary flex items-center gap-1.5 font-medium flex-wrap">
        <Link to="/admin" className="hover:text-text-primary">Admin</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to="/admin/nutritionists" className="hover:text-text-primary">Nutricionistas</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to={`/admin/nutritionists/${nutritionist.id}`} className="hover:text-text-primary">{nutritionist.name}</Link>
        <ChevronRight className="w-3 h-3" />
        <span>Pacientes</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-text-primary font-semibold">{patient.firstName} {patient.lastName}</span>
      </nav>

      {/* Cabecera Operativa */}
      <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" highlighted>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-primary text-text-primary flex items-center justify-center font-bold text-xl shadow-xs">
            <User className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-text-primary">
                {patient.firstName} {patient.lastName}
              </h2>
              <Badge variant={patient.status === 'active' ? 'active' : 'suspended'}>
                {patient.status === 'active' ? 'Cuenta Activa' : 'Archivada'}
              </Badge>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              ID Interno Operativo: <code className="bg-border-subtle px-1.5 py-0.5 rounded text-text-primary font-mono">{patient.id}</code>
            </p>
          </div>
        </div>
      </Card>

      {/* Cartel de Privacidad Operativa */}
      <div className="p-4 bg-surface-tinted border border-border-subtle rounded-2xl flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-brand-strong shrink-0 mt-0.5" />
        <div className="text-xs text-brand-strong">
          <p className="font-semibold">Privacidad de información clínica:</p>
          <p className="mt-0.5 text-[11px] text-text-secondary">
            Por privacidad, la información clínica sólo está disponible para los profesionales autorizados de la organización. El administrador visualiza únicamente métricas e identificadores operativos.
          </p>
        </div>
      </div>

      {/* Información Operativa Mínima Permitida */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="space-y-3">
          <h3 className="text-sm font-bold text-text-primary border-b border-border-subtle pb-2">
            Datos de Organización & Vinculación
          </h3>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-text-secondary block">Organización perteneciente:</span>
              <span className="font-semibold text-brand-strong">{nutritionist.organizationName}</span>
            </div>
            <div>
              <span className="text-text-secondary block">Nutricionista responsable:</span>
              <span className="font-semibold text-text-primary">{nutritionist.name}</span>
            </div>
            <div>
              <span className="text-text-secondary block">Estado del acceso al portal:</span>
              {/* STATUS-01: Mapeo de estados exacto */}
              <Badge
                variant={
                  patient.portalAccessStatus === 'active'
                    ? 'active'
                    : patient.portalAccessStatus === 'pending'
                    ? 'pending'
                    : 'suspended'
                }
                className="mt-1"
              >
                {patient.portalAccessStatus === 'active'
                  ? 'Acceso Habilitado'
                  : patient.portalAccessStatus === 'pending'
                  ? 'Pendiente de registro'
                  : 'Acceso Revocado'}
              </Badge>
            </div>
          </div>
        </Card>

        <Card className="space-y-3">
          <h3 className="text-sm font-bold text-text-primary border-b border-border-subtle pb-2">
            Métricas de Uso Agregadas
          </h3>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-text-secondary block">Fecha de alta en la plataforma:</span>
              <span className="font-semibold text-text-primary">{formatShortDate(patient.createdAt)}</span>
            </div>
            <div>
              <span className="text-text-secondary block">Última actividad en el portal:</span>
              <span className="font-semibold text-text-primary">{formatDateTime(patient.lastActiveAt)}</span>
            </div>
            <div className="pt-2 border-t border-border-subtle flex justify-between">
              <div>
                <span className="text-text-secondary block">Check-ins asignados:</span>
                <span className="font-bold text-base text-text-primary">{checkInsCount}</span>
              </div>
              <div>
                <span className="text-text-secondary block">Recomendaciones:</span>
                <span className="font-bold text-base text-text-primary">{recommendationsCount}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
