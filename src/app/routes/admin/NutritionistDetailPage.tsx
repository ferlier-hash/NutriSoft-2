import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMock } from '../../provider';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { NotFoundPage } from '../NotFoundPage';
import { formatShortDate, formatDateTime } from '../../../lib/dateUtils';
import { ChevronRight, Stethoscope } from 'lucide-react';

export const NutritionistDetailPage: React.FC = () => {
  const { nutritionistId } = useParams<{ nutritionistId: string }>();
  const { nutritionists, patients } = useMock();
  const [activeTab, setActiveTab] = useState<'summary' | 'orgs' | 'patients' | 'activity' | 'billing'>('patients');

  const nutritionist = nutritionists.find(n => n.id === nutritionistId);

  if (!nutritionist) {
    return (
      <NotFoundPage
        title="Nutricionista no encontrado"
        message="El perfil del nutricionista consultado no existe o no está registrado."
      />
    );
  }

  const assignedPatients = patients.filter(p => p.assignedNutritionistId === nutritionist.id);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Breadcrumbs Obligatorios */}
      <nav aria-label="Breadcrumb" className="text-xs text-[#66727D] flex items-center gap-1.5 font-medium">
        <Link to="/admin" className="hover:text-[#151B22]">Admin</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to="/admin/nutritionists" className="hover:text-[#151B22]">Nutricionistas</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-[#151B22] font-semibold">{nutritionist.name}</span>
      </nav>

      {/* Cabecera Nutricionista */}
      <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" highlighted>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#55AEB8] text-[#151B22] flex items-center justify-center font-bold text-xl shadow-sm">
            <Stethoscope className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-[#151B22]">{nutritionist.name}</h2>
              <Badge variant={nutritionist.status === 'active' ? 'active' : 'suspended'}>
                {nutritionist.status === 'active' ? 'Cuenta Activa' : 'Suspendida'}
              </Badge>
            </div>
            <p className="text-xs text-[#66727D] mt-0.5">
              Organización: <strong className="text-[#357984]">{nutritionist.organizationName}</strong> • {nutritionist.email} • {nutritionist.phone}
            </p>
          </div>
        </div>
      </Card>

      {/* Pestañas de Navegación del Perfil con ARIA Tablist */}
      <div role="tablist" aria-label="Secciones del perfil del nutricionista" className="flex items-center gap-2 border-b border-[#E2E9EC] overflow-x-auto">
        <button
          id="tab-nutri-summary"
          type="button"
          role="tab"
          aria-selected={activeTab === 'summary'}
          aria-controls="panel-nutri-summary"
          onClick={() => setActiveTab('summary')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap min-h-[44px] ${
            activeTab === 'summary' ? 'border-[#357984] text-[#357984]' : 'border-transparent text-[#66727D] hover:text-[#151B22]'
          }`}
        >
          1. Resumen
        </button>
        <button
          id="tab-nutri-orgs"
          type="button"
          role="tab"
          aria-selected={activeTab === 'orgs'}
          aria-controls="panel-nutri-orgs"
          onClick={() => setActiveTab('orgs')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap min-h-[44px] ${
            activeTab === 'orgs' ? 'border-[#357984] text-[#357984]' : 'border-transparent text-[#66727D] hover:text-[#151B22]'
          }`}
        >
          2. Organizaciones
        </button>
        <button
          id="tab-nutri-patients"
          type="button"
          role="tab"
          aria-selected={activeTab === 'patients'}
          aria-controls="panel-nutri-patients"
          onClick={() => setActiveTab('patients')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap min-h-[44px] ${
            activeTab === 'patients' ? 'border-[#357984] text-[#357984]' : 'border-transparent text-[#66727D] hover:text-[#151B22]'
          }`}
        >
          3. Pacientes asignados ({assignedPatients.length})
        </button>
        <button
          id="tab-nutri-activity"
          type="button"
          role="tab"
          aria-selected={activeTab === 'activity'}
          aria-controls="panel-nutri-activity"
          onClick={() => setActiveTab('activity')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap min-h-[44px] ${
            activeTab === 'activity' ? 'border-[#357984] text-[#357984]' : 'border-transparent text-[#66727D] hover:text-[#151B22]'
          }`}
        >
          4. Actividad operativa
        </button>
        <button
          id="tab-nutri-billing"
          type="button"
          role="tab"
          aria-selected={activeTab === 'billing'}
          aria-controls="panel-nutri-billing"
          onClick={() => setActiveTab('billing')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap min-h-[44px] ${
            activeTab === 'billing' ? 'border-[#357984] text-[#357984]' : 'border-transparent text-[#66727D] hover:text-[#151B22]'
          }`}
        >
          5. Estado de cuenta
        </button>
      </div>

      {/* Pestaña 3: Pacientes Asignados */}
      {activeTab === 'patients' && (
        <div id="panel-nutri-patients" role="tabpanel" aria-labelledby="tab-nutri-patients">
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E9EC] pb-3">
              <h3 className="text-sm font-bold text-[#151B22]">
                Pacientes asignados a {nutritionist.name}
              </h3>
              <span className="text-xs text-[#66727D]">
                Total: {assignedPatients.length} pacientes
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E9EC] text-xs text-[#66727D] font-medium">
                    <th scope="col" className="py-2.5 px-3">Nombre</th>
                    <th scope="col" className="py-2.5 px-3">Organización</th>
                    <th scope="col" className="py-2.5 px-3">Estado</th>
                    <th scope="col" className="py-2.5 px-3">Fecha de Asignación</th>
                    <th scope="col" className="py-2.5 px-3">Última Actividad</th>
                    <th scope="col" className="py-2.5 px-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E9EC] text-xs">
                  {assignedPatients.map(p => (
                    <tr key={p.id} className="hover:bg-[#F2F7F8] transition-colors">
                      <td className="py-3 px-3 font-semibold text-[#151B22]">
                        {p.firstName} {p.lastName}
                      </td>
                      <td className="py-3 px-3 text-[#357984] font-medium">{nutritionist.organizationName}</td>
                      <td className="py-3 px-3">
                        <Badge variant={p.status === 'active' ? 'active' : 'suspended'}>
                          {p.status === 'active' ? 'Activo' : 'Archivado'}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-[#66727D]">{formatShortDate(p.createdAt)}</td>
                      <td className="py-3 px-3 text-[#66727D]">{formatDateTime(p.lastActiveAt)}</td>
                      <td className="py-3 px-3 text-right">
                        <Button asChild variant="secondary" size="sm">
                          <Link to={`/admin/nutritionists/${nutritionist.id}/patients/${p.id}`} className="text-xs inline-flex items-center gap-1">
                            <span>Ver</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'summary' && (
        <div id="panel-nutri-summary" role="tabpanel" aria-labelledby="tab-nutri-summary">
          <Card className="space-y-3 text-xs">
            <h3 className="font-bold text-sm text-[#151B22]">Resumen operativo</h3>
            <p className="text-[#66727D]">Nutricionista activo desde {formatShortDate(nutritionist.joinedAt)} con {assignedPatients.length} pacientes a cargo.</p>
          </Card>
        </div>
      )}

      {activeTab === 'orgs' && (
        <div id="panel-nutri-orgs" role="tabpanel" aria-labelledby="tab-nutri-orgs">
          <Card className="space-y-3 text-xs">
            <h3 className="font-bold text-sm text-[#151B22]">Organizaciones vinculadas</h3>
            <p className="text-[#357984] font-semibold">{nutritionist.organizationName} (Organización principal)</p>
          </Card>
        </div>
      )}

      {activeTab === 'activity' && (
        <div id="panel-nutri-activity" role="tabpanel" aria-labelledby="tab-nutri-activity">
          <Card className="space-y-3 text-xs">
            <h3 className="font-bold text-sm text-[#151B22]">Actividad operativa reciente</h3>
            <p className="text-[#66727D]">Última actividad registrada en la plataforma: {formatDateTime(nutritionist.lastActiveAt)}.</p>
          </Card>
        </div>
      )}

      {activeTab === 'billing' && (
        <div id="panel-nutri-billing" role="tabpanel" aria-labelledby="tab-nutri-billing">
          <Card className="space-y-3 text-xs">
            <h3 className="font-bold text-sm text-[#151B22]">Estado de cuenta</h3>
            <Badge variant="active">Plan Pro Activo</Badge>
          </Card>
        </div>
      )}
    </div>
  );
};
