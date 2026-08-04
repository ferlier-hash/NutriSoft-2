import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMock } from '../../provider';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Building2, Stethoscope, Users, TrendingUp, Search, Plus } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { organizations, toggleOrganizationStatus } = useMock();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredOrgs = organizations.filter(org => {
    const matchesSearch =
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || org.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalOrgs = organizations.length;
  const totalNutris = organizations.reduce((sum, o) => sum + o.nutritionistsCount, 0);
  const totalPatients = organizations.reduce((sum, o) => sum + o.patientsCount, 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Cabecera & Acción */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#151B22]">Organizaciones</h2>
          <p className="text-xs text-[#66727D] mt-0.5">
            Gestiona las organizaciones de la plataforma y supervisa métricas de uso agregadas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/admin/nutritionists">
            <Button variant="secondary" className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4" />
              <span>Ver nutricionistas</span>
            </Button>
          </Link>

          <Button variant="primary" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>Nueva organización</span>
          </Button>
        </div>
      </div>

      {/* Tarjetas de Métricas Consolidadas (Concepto A) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#EDF8F7] border border-[#BDE9EA] flex items-center justify-center text-[#357984]">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#66727D] font-medium">Organizaciones</p>
            <h3 className="text-2xl font-bold text-[#151B22]">{totalOrgs}</h3>
            <span className="text-[11px] text-[#39835A] font-semibold flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> +12 este mes
            </span>
          </div>
        </Card>

        <Card
          className="flex items-center gap-4 cursor-pointer hover:border-[#55AEB8] transition-colors"
          onClick={() => navigate('/admin/nutritionists')}
        >
          <div className="w-12 h-12 rounded-2xl bg-[#EAEFFC] border border-[#C6D4F8] flex items-center justify-center text-[#5267C7]">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#66727D] font-medium">Nutricionistas</p>
            <h3 className="text-2xl font-bold text-[#151B22]">{totalNutris}</h3>
            <span className="text-[11px] text-[#5267C7] font-semibold flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> +28 este mes
            </span>
          </div>
        </Card>

        {/* Métrica Informativa Agregada No Interactiva a lista global */}
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#EDF8F7] border border-[#BDE9EA] flex items-center justify-center text-[#357984]">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#66727D] font-medium">Pacientes activos (Métrica)</p>
            <h3 className="text-2xl font-bold text-[#151B22]">{totalPatients.toLocaleString()}</h3>
            <span className="text-[11px] text-[#39835A] font-semibold flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> +196 este mes
            </span>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#EAEFFC] border border-[#C6D4F8] flex items-center justify-center text-[#5267C7]">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#66727D] font-medium">Retención (30 días)</p>
            <h3 className="text-2xl font-bold text-[#151B22]">97%</h3>
            <span className="text-[11px] text-[#5267C7] font-semibold flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> +4 pp vs. mes anterior
            </span>
          </div>
        </Card>
      </div>

      {/* Tabla de Organizaciones */}
      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-2 border-b border-[#E2E9EC]">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A959D]" />
            <input
              type="text"
              placeholder="Buscar organización..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-[#F2F7F8] border border-[#E2E9EC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#357984]"
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
                <th className="py-3 px-4">Organización</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4">Nutricionistas</th>
                <th className="py-3 px-4">Pacientes</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4 text-right">Acciones</th>
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
                    <Button
                      variant={org.status === 'active' ? 'destructive' : 'secondary'}
                      size="sm"
                      onClick={() => toggleOrganizationStatus(org.id)}
                      className="text-xs"
                    >
                      {org.status === 'active' ? 'Suspender' : 'Habilitar'}
                    </Button>
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
