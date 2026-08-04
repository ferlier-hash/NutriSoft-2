import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMock } from '../../provider';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { NotFoundPage } from '../NotFoundPage';
import { formatShortDate } from '../../../lib/dateUtils';
import { Building2, ChevronRight, Stethoscope, Users } from 'lucide-react';

export const OrganizationDetailPage: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { organizations, nutritionists } = useMock();

  const org = organizations.find(o => o.id === organizationId);

  if (!org) {
    return (
      <NotFoundPage
        title="Organización no encontrada"
        message="La organización consultada no existe o no está registrada en la plataforma."
      />
    );
  }

  const orgNutritionists = nutritionists.filter(n => n.organizationId === org.id);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="text-xs text-[#66727D] flex items-center gap-1.5 font-medium">
        <Link to="/admin" className="hover:text-[#151B22]">Admin</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to="/admin/organizations" className="hover:text-[#151B22]">Organizaciones</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-[#151B22] font-semibold">{org.name}</span>
      </nav>

      {/* Cabecera Organización */}
      <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" highlighted>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#55AEB8] text-[#151B22] flex items-center justify-center font-bold text-xl shadow-sm">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-[#151B22]">{org.name}</h2>
              <Badge variant={org.status === 'active' ? 'active' : 'suspended'}>
                {org.status === 'active' ? 'Organización Activa' : 'Suspendida'}
              </Badge>
            </div>
            <p className="text-xs text-[#66727D] mt-0.5">
              Ubicación: {org.location} • Plan: <strong className="text-[#357984]">{org.plan}</strong>
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="space-y-3">
          <h3 className="text-sm font-bold text-[#151B22] border-b border-[#E2E9EC] pb-2">
            Métricas de la Organización
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-[#66727D]">Nutricionistas vinculados:</span>
              <span className="font-bold text-[#151B22] flex items-center gap-1">
                <Stethoscope className="w-3.5 h-3.5 text-[#357984]" /> {org.nutritionistsCount}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#66727D]">Pacientes en tratamiento:</span>
              <span className="font-bold text-[#151B22] flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-[#357984]" /> {org.patientsCount}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-[#E2E9EC]">
              <span className="text-[#66727D]">Fecha de alta en plataforma:</span>
              <span className="font-semibold text-[#151B22]">{formatShortDate(org.createdAt)}</span>
            </div>
          </div>
        </Card>

        <Card className="space-y-3">
          <h3 className="text-sm font-bold text-[#151B22] border-b border-[#E2E9EC] pb-2">
            Nutricionistas de esta Organización
          </h3>
          {orgNutritionists.length === 0 ? (
            <p className="text-xs text-[#66727D]">No hay nutricionistas registrados en esta organización.</p>
          ) : (
            <div className="space-y-2">
              {orgNutritionists.map(n => (
                <div key={n.id} className="flex items-center justify-between p-2 bg-[#F2F7F8] rounded-xl text-xs">
                  <div>
                    <p className="font-semibold text-[#151B22]">{n.name}</p>
                    <p className="text-[11px] text-[#66727D]">{n.email}</p>
                  </div>
                  <Button asChild variant="secondary" size="sm">
                    <Link to={`/admin/nutritionists/${n.id}`}>
                      <span>Perfil</span>
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
