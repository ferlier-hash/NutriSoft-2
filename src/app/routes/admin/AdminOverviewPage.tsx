import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMock } from '../../provider';
import { useToast } from '../../../components/ui/Toast';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { Building2, Stethoscope, Users, TrendingUp, Plus } from 'lucide-react';

export const AdminOverviewPage: React.FC = () => {
  const { organizations, addOrganization } = useMock();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [isAddOrgOpen, setIsAddOrgOpen] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgLocation, setOrgLocation] = useState('');
  const [orgPlan, setOrgPlan] = useState<'Básico' | 'Pro' | 'Enterprise'>('Pro');

  const totalOrgs = organizations.length;
  const totalNutris = organizations.reduce((sum, o) => sum + o.nutritionistsCount, 0);
  const totalPatients = organizations.reduce((sum, o) => sum + o.patientsCount, 0);

  const handleCreateOrgSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = addOrganization(orgName, orgLocation, orgPlan);
      setIsAddOrgOpen(false);
      setOrgName('');
      setOrgLocation('');
      showToast('Organización creada', `Se registró ${created.name} exitosamente.`);
      navigate(`/admin/organizations/${created.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear la organización';
      showToast('Error', msg, 'error');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Cabecera & Acción */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Resumen General de Plataforma</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Supervisa los indicadores globales de uso, organizaciones activas y profesionales registrados.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="secondary">
            <Link to="/admin/nutritionists" className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4" />
              <span>Ver nutricionistas</span>
            </Link>
          </Button>

          <Button asChild variant="primary">
            <Link to="/admin/organizations" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span>Ver organizaciones</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Tarjetas de Métricas Consolidadas con Link Reales (A11Y-01) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/admin/organizations"
          className="block outline-none focus-visible:ring-2 focus-visible:ring-brand-strong rounded-2xl transition-all hover:scale-[1.01]"
        >
          <Card className="flex items-center gap-4 hover:border-brand-primary h-full">
            <div className="w-12 h-12 rounded-2xl bg-surface-tinted border border-border-subtle flex items-center justify-center text-brand-strong shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-text-secondary font-medium">Organizaciones</p>
              <h3 className="text-2xl font-bold text-text-primary">{totalOrgs}</h3>
              <span className="text-[11px] text-[#1E5235] font-semibold flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" /> +12 este mes
              </span>
            </div>
          </Card>
        </Link>

        <Link
          to="/admin/nutritionists"
          className="block outline-none focus-visible:ring-2 focus-visible:ring-brand-strong rounded-2xl transition-all hover:scale-[1.01]"
        >
          <Card className="flex items-center gap-4 hover:border-brand-primary h-full">
            <div className="w-12 h-12 rounded-2xl bg-[#EAEFFC] border border-[#C6D4F8] flex items-center justify-center text-[#2D3F99] shrink-0">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-text-secondary font-medium">Nutricionistas</p>
              <h3 className="text-2xl font-bold text-text-primary">{totalNutris}</h3>
              <span className="text-[11px] text-[#2D3F99] font-semibold flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" /> +28 este mes
              </span>
            </div>
          </Card>
        </Link>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-surface-tinted border border-border-subtle flex items-center justify-center text-brand-strong shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-text-secondary font-medium">Pacientes activos (Métrica)</p>
            <h3 className="text-2xl font-bold text-text-primary">{totalPatients.toLocaleString()}</h3>
            <span className="text-[11px] text-[#1E5235] font-semibold flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> +196 este mes
            </span>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#EAEFFC] border border-[#C6D4F8] flex items-center justify-center text-[#2D3F99] shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-text-secondary font-medium">Retención (30 días)</p>
            <h3 className="text-2xl font-bold text-text-primary">97%</h3>
            <span className="text-[11px] text-[#2D3F99] font-semibold flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> +4 pp vs. mes anterior
            </span>
          </div>
        </Card>
      </div>

      {/* Sección Acciones Rápidas */}
      <Card className="space-y-4">
        <h3 className="font-bold text-base text-text-primary border-b border-border-subtle pb-2">
          Acciones administrativas principales
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Button
            asChild
            variant="secondary"
            className="flex items-center justify-start gap-3 p-4 h-auto text-left"
          >
            <Link to="/admin/organizations">
              <Building2 className="w-5 h-5 text-brand-strong" />
              <div>
                <p className="font-semibold text-xs text-text-primary">Gestionar Organizaciones</p>
                <p className="text-[11px] font-normal text-text-secondary">Ver planes, altas y estados</p>
              </div>
            </Link>
          </Button>

          <Button
            asChild
            variant="secondary"
            className="flex items-center justify-start gap-3 p-4 h-auto text-left"
          >
            <Link to="/admin/nutritionists">
              <Stethoscope className="w-5 h-5 text-[#2D3F99]" />
              <div>
                <p className="font-semibold text-xs text-text-primary">Directorio de Nutricionistas</p>
                <p className="text-[11px] font-normal text-text-secondary">Ver asignaciones y profesionales</p>
              </div>
            </Link>
          </Button>

          <Button
            variant="primary"
            onClick={() => setIsAddOrgOpen(true)}
            className="flex items-center justify-start gap-3 p-4 h-auto text-left"
          >
            <Plus className="w-5 h-5 text-text-primary" />
            <div>
              <p className="font-semibold text-xs text-text-primary">Nueva Organización</p>
              <p className="text-[11px] font-normal text-text-primary">Registrar consultorio o clínica</p>
            </div>
          </Button>
        </div>
      </Card>

      {/* Dialog UX-01: Registro de Nueva Organización */}
      <Dialog
        isOpen={isAddOrgOpen}
        onClose={() => setIsAddOrgOpen(false)}
        title="Registrar nueva organización"
        description="Ingresa los datos para dar de alta una nueva clínica o consultorio en la plataforma."
      >
        <form onSubmit={handleCreateOrgSubmit} className="space-y-4">
          <div>
            <label htmlFor="new-org-name" className="block text-xs font-medium text-text-primary mb-1">
              Nombre de la Organización *
            </label>
            <input
              id="new-org-name"
              type="text"
              required
              value={orgName}
              onChange={e => setOrgName(e.target.value)}
              placeholder="Ej. Centro Médico NutriSalud"
              className="w-full px-3 py-2 text-xs bg-surface-subtle border border-border-subtle rounded-xl focus:ring-2 focus:ring-brand-strong text-text-primary"
            />
          </div>

          <div>
            <label htmlFor="new-org-location" className="block text-xs font-medium text-text-primary mb-1">
              Ubicación *
            </label>
            <input
              id="new-org-location"
              type="text"
              required
              value={orgLocation}
              onChange={e => setOrgLocation(e.target.value)}
              placeholder="Ej. Buenos Aires, AR"
              className="w-full px-3 py-2 text-xs bg-surface-subtle border border-border-subtle rounded-xl focus:ring-2 focus:ring-brand-strong text-text-primary"
            />
          </div>

          <div>
            <label htmlFor="new-org-plan" className="block text-xs font-medium text-text-primary mb-1">
              Plan Suscripto *
            </label>
            <select
              id="new-org-plan"
              value={orgPlan}
              onChange={e => setOrgPlan(e.target.value as 'Básico' | 'Pro' | 'Enterprise')}
              className="w-full px-3 py-2 text-xs bg-surface-subtle border border-border-subtle rounded-xl focus:ring-2 focus:ring-brand-strong text-text-primary"
            >
              <option value="Básico">Básico</option>
              <option value="Pro">Pro</option>
              <option value="Enterprise">Enterprise</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border-subtle">
            <Button variant="secondary" type="button" onClick={() => setIsAddOrgOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Guardar organización
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
