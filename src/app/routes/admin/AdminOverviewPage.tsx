import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMock } from '../../provider';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Building2, Stethoscope, Users, TrendingUp, Plus } from 'lucide-react';

export const AdminOverviewPage: React.FC = () => {
  const { organizations } = useMock();
  const navigate = useNavigate();

  const totalOrgs = organizations.length;
  const totalNutris = organizations.reduce((sum, o) => sum + o.nutritionistsCount, 0);
  const totalPatients = organizations.reduce((sum, o) => sum + o.patientsCount, 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Cabecera & Acción */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#151B22]">Resumen General de Plataforma</h2>
          <p className="text-xs text-[#66727D] mt-0.5">
            Supervisa los indicadores globales de uso, organizaciones activas y profesionales registrados.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => navigate('/admin/nutritionists')} className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4" />
            <span>Ver nutricionistas</span>
          </Button>

          <Button variant="primary" onClick={() => navigate('/admin/organizations')} className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            <span>Ver organizaciones</span>
          </Button>
        </div>
      </div>

      {/* Tarjetas de Métricas Consolidadas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/admin/organizations')}
          onKeyDown={e => e.key === 'Enter' && navigate('/admin/organizations')}
          className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#357984] rounded-2xl"
        >
          <Card className="flex items-center gap-4 hover:border-[#55AEB8] transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-[#EDF8F7] border border-[#BDE9EA] flex items-center justify-center text-[#357984]">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-[#66727D] font-medium">Organizaciones</p>
              <h3 className="text-2xl font-bold text-[#151B22]">{totalOrgs}</h3>
              <span className="text-[11px] text-[#1E5235] font-semibold flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" /> +12 este mes
              </span>
            </div>
          </Card>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/admin/nutritionists')}
          onKeyDown={e => e.key === 'Enter' && navigate('/admin/nutritionists')}
          className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#357984] rounded-2xl"
        >
          <Card className="flex items-center gap-4 hover:border-[#55AEB8] transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-[#EAEFFC] border border-[#C6D4F8] flex items-center justify-center text-[#2D3F99]">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-[#66727D] font-medium">Nutricionistas</p>
              <h3 className="text-2xl font-bold text-[#151B22]">{totalNutris}</h3>
              <span className="text-[11px] text-[#2D3F99] font-semibold flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" /> +28 este mes
              </span>
            </div>
          </Card>
        </div>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#EDF8F7] border border-[#BDE9EA] flex items-center justify-center text-[#357984]">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#66727D] font-medium">Pacientes activos (Métrica)</p>
            <h3 className="text-2xl font-bold text-[#151B22]">{totalPatients.toLocaleString()}</h3>
            <span className="text-[11px] text-[#1E5235] font-semibold flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> +196 este mes
            </span>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#EAEFFC] border border-[#C6D4F8] flex items-center justify-center text-[#2D3F99]">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#66727D] font-medium">Retención (30 días)</p>
            <h3 className="text-2xl font-bold text-[#151B22]">97%</h3>
            <span className="text-[11px] text-[#2D3F99] font-semibold flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> +4 pp vs. mes anterior
            </span>
          </div>
        </Card>
      </div>

      {/* Sección Acciones Rápidas */}
      <Card className="space-y-4">
        <h3 className="font-bold text-base text-[#151B22] border-b border-[#E2E9EC] pb-2">
          Acciones administrativas principales
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Button
            variant="secondary"
            onClick={() => navigate('/admin/organizations')}
            className="flex items-center justify-start gap-3 p-4 h-auto"
          >
            <Building2 className="w-5 h-5 text-[#357984]" />
            <div className="text-left">
              <p className="font-semibold text-xs text-[#151B22]">Gestionar Organizaciones</p>
              <p className="text-[11px] font-normal text-[#66727D]">Ver planes, altas y estados</p>
            </div>
          </Button>

          <Button
            variant="secondary"
            onClick={() => navigate('/admin/nutritionists')}
            className="flex items-center justify-start gap-3 p-4 h-auto"
          >
            <Stethoscope className="w-5 h-5 text-[#2D3F99]" />
            <div className="text-left">
              <p className="font-semibold text-xs text-[#151B22]">Directorio de Nutricionistas</p>
              <p className="text-[11px] font-normal text-[#66727D]">Ver asignaciones y profesionales</p>
            </div>
          </Button>

          <Button
            variant="primary"
            onClick={() => navigate('/admin/organizations')}
            className="flex items-center justify-start gap-3 p-4 h-auto"
          >
            <Plus className="w-5 h-5 text-[#151B22]" />
            <div className="text-left">
              <p className="font-semibold text-xs text-[#151B22]">Nueva Organización</p>
              <p className="text-[11px] font-normal text-[#151B22]">Registrar consultorio o clínica</p>
            </div>
          </Button>
        </div>
      </Card>
    </div>
  );
};
