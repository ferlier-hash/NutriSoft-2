import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMock } from '../../provider';
import { useToast } from '../../../components/ui/Toast';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { Building2, Search, ChevronRight } from 'lucide-react';

export const OrganizationsPage: React.FC = () => {
  const { organizations, toggleOrganizationStatus } = useMock();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [confirmOrgId, setConfirmOrgId] = useState<string | null>(null);

  const orgToConfirm = organizations.find(o => o.id === confirmOrgId);

  const filteredOrgs = organizations.filter(org => {
    const matchesSearch =
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || org.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleConfirmToggle = () => {
    if (!orgToConfirm) return;
    const actionName = orgToConfirm.status === 'active' ? 'suspendida' : 'habilitada';
    toggleOrganizationStatus(orgToConfirm.id);
    showToast('Estado actualizado', `La organización ${orgToConfirm.name} ha sido ${actionName}.`);
    setConfirmOrgId(null);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Building2 className="w-6 h-6 text-brand-strong" />
            Organizaciones Registradas
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Gestiona los planes, altas y estados operativos de las organizaciones cliente.
          </p>
        </div>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-2 border-b border-border-subtle">
          <div className="relative w-full sm:w-72">
            <label htmlFor="search-orgs-input" className="sr-only">
              Buscar organización
            </label>
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              id="search-orgs-input"
              type="text"
              placeholder="Buscar por nombre o ubicación..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-surface-subtle border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-strong text-text-primary"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label htmlFor="status-filter" className="text-xs text-text-secondary font-medium">
              Estado:
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-xs bg-surface-subtle border border-border-subtle rounded-xl px-3 py-2 text-text-primary focus:ring-2 focus:ring-brand-strong"
            >
              <option value="all">Todos</option>
              <option value="active">Activas</option>
              <option value="suspended">Suspendidas</option>
              <option value="pending">Pendientes de alta</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-subtle text-xs text-text-secondary font-medium">
                <th scope="col" className="py-3 px-4">Organización</th>
                <th scope="col" className="py-3 px-4">Estado</th>
                <th scope="col" className="py-3 px-4">Nutricionistas</th>
                <th scope="col" className="py-3 px-4">Pacientes</th>
                <th scope="col" className="py-3 px-4">Plan</th>
                <th scope="col" className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle text-xs">
              {filteredOrgs.map(org => (
                <tr key={org.id} className="hover:bg-surface-subtle transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-text-primary">
                    {org.name}
                    <span className="block text-[11px] font-normal text-text-tertiary">{org.location}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    {/* STATUS-01: Mapeo de estados exacto */}
                    <Badge variant={org.status === 'active' ? 'active' : org.status === 'suspended' ? 'suspended' : 'pending'}>
                      {org.status === 'active' ? 'Activa' : org.status === 'suspended' ? 'Suspendida' : 'Pendiente de alta'}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-text-primary font-medium">{org.nutritionistsCount}</td>
                  <td className="py-3.5 px-4 text-text-primary font-medium">{org.patientsCount}</td>
                  <td className="py-3.5 px-4 font-medium text-brand-strong">{org.plan}</td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant={org.status === 'active' ? 'destructive' : 'secondary'}
                        size="sm"
                        onClick={() => setConfirmOrgId(org.id)}
                        className="text-xs"
                      >
                        {org.status === 'active' ? 'Suspender' : 'Habilitar'}
                      </Button>

                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/admin/organizations/${org.id}`}>
                          <span>Detalle</span>
                          <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Dialog UX-01: Confirmación de Cambio de Estado */}
      <Dialog
        isOpen={!!confirmOrgId}
        onClose={() => setConfirmOrgId(null)}
        title={orgToConfirm?.status === 'active' ? '¿Suspender organización?' : '¿Habilitar organización?'}
        description={
          orgToConfirm?.status === 'active'
            ? `Estás a punto de suspender la organización ${orgToConfirm?.name}. Sus profesionales perderán acceso temporal a la plataforma.`
            : `Habilitarás el acceso completo a la plataforma para la organización ${orgToConfirm?.name}.`
        }
      >
        <div className="flex justify-end gap-2 pt-2 border-t border-border-subtle">
          <Button variant="secondary" onClick={() => setConfirmOrgId(null)}>
            Cancelar
          </Button>
          <Button
            variant={orgToConfirm?.status === 'active' ? 'destructive' : 'primary'}
            onClick={handleConfirmToggle}
          >
            {orgToConfirm?.status === 'active' ? 'Sí, suspender' : 'Sí, habilitar'}
          </Button>
        </div>
      </Dialog>
    </div>
  );
};
