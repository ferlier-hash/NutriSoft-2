import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMock } from '../../provider';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Building2, Search, ChevronRight } from 'lucide-react';

export const OrganizationsPage: React.FC = () => {
  const { organizations, toggleOrganizationStatus } = useMock();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredOrgs = organizations.filter(org => {
    const matchesSearch =
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || org.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#151B22] flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[#357984]" />
            Organizaciones Registradas
          </h2>
          <p className="text-xs text-[#66727D] mt-0.5">
            Gestiona los planes, altas y estados operativos de las organizaciones cliente.
          </p>
        </div>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-2 border-b border-[#E2E9EC]">
          <div className="relative w-full sm:w-72">
            <label htmlFor="search-orgs-input" className="sr-only">
              Buscar organización
            </label>
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A959D]" />
            <input
              id="search-orgs-input"
              type="text"
              placeholder="Buscar por nombre o ubicación..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-[#F2F7F8] border border-[#E2E9EC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#357984] text-[#151B22]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label htmlFor="status-filter" className="text-xs text-[#66727D] font-medium">
              Estado:
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-xs bg-[#F2F7F8] border border-[#E2E9EC] rounded-xl px-3 py-2 text-[#151B22] focus:ring-2 focus:ring-[#357984]"
            >
              <option value="all">Todos</option>
              <option value="active">Activas</option>
              <option value="suspended">Suspendidas</option>
              <option value="pending">Pendientes</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E9EC] text-xs text-[#66727D] font-medium">
                <th scope="col" className="py-3 px-4">Organización</th>
                <th scope="col" className="py-3 px-4">Estado</th>
                <th scope="col" className="py-3 px-4">Nutricionistas</th>
                <th scope="col" className="py-3 px-4">Pacientes</th>
                <th scope="col" className="py-3 px-4">Plan</th>
                <th scope="col" className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E9EC] text-xs">
              {filteredOrgs.map(org => (
                <tr key={org.id} className="hover:bg-[#F2F7F8] transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-[#151B22]">
                    {org.name}
                    <span className="block text-[11px] font-normal text-[#8A959D]">{org.location}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant={org.status === 'active' ? 'active' : org.status === 'suspended' ? 'suspended' : 'pending'}>
                      {org.status === 'active' ? 'Activa' : org.status === 'suspended' ? 'Suspendida' : 'Pendiente'}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-[#151B22] font-medium">{org.nutritionistsCount}</td>
                  <td className="py-3.5 px-4 text-[#151B22] font-medium">{org.patientsCount}</td>
                  <td className="py-3.5 px-4 font-medium text-[#357984]">{org.plan}</td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant={org.status === 'active' ? 'destructive' : 'secondary'}
                        size="sm"
                        onClick={() => toggleOrganizationStatus(org.id)}
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
    </div>
  );
};
