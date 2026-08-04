import React from 'react';
import { Link } from 'react-router-dom';
import { useMock } from '../../provider';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { formatShortDate } from '../../../lib/dateUtils';
import { Stethoscope, ChevronRight, Search } from 'lucide-react';

export const NutritionistsListPage: React.FC = () => {
  const { nutritionists } = useMock();
  const [search, setSearch] = React.useState('');

  const filtered = nutritionists.filter(
    n =>
      n.name.toLowerCase().includes(search.toLowerCase()) ||
      n.organizationName.toLowerCase().includes(search.toLowerCase()) ||
      n.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#151B22] flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-[#357984]" />
            Nutricionistas
          </h2>
          <p className="text-xs text-[#66727D] mt-0.5">
            Supervisa los profesionales registrados y sus asignaciones operativas por organización.
          </p>
        </div>
      </div>

      <Card className="space-y-4">
        <div className="relative w-full sm:w-80">
          <label htmlFor="search-nutritionists-input" className="sr-only">
            Buscar nutricionista u organización
          </label>
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A959D]" />
          <input
            id="search-nutritionists-input"
            type="text"
            placeholder="Buscar nutricionista u organización..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#F2F7F8] border border-[#E2E9EC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#357984] text-[#151B22]"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E9EC] text-xs text-[#66727D] font-medium">
                <th scope="col" className="py-3 px-4">Nutricionista</th>
                <th scope="col" className="py-3 px-4">Organización</th>
                <th scope="col" className="py-3 px-4">Pacientes Asignados</th>
                <th scope="col" className="py-3 px-4">Fecha de Alta</th>
                <th scope="col" className="py-3 px-4">Estado</th>
                <th scope="col" className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E9EC] text-xs">
              {filtered.map(n => (
                <tr key={n.id} className="hover:bg-[#F2F7F8] transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-[#151B22]">
                    {n.name}
                    <span className="block text-[11px] font-normal text-[#8A959D]">{n.email}</span>
                  </td>
                  <td className="py-3.5 px-4 text-[#357984] font-medium">{n.organizationName}</td>
                  <td className="py-3.5 px-4 font-semibold text-[#151B22]">{n.assignedPatientsCount}</td>
                  <td className="py-3.5 px-4 text-[#66727D]">{formatShortDate(n.joinedAt)}</td>
                  <td className="py-3.5 px-4">
                    <Badge variant={n.status === 'active' ? 'active' : 'suspended'}>
                      {n.status === 'active' ? 'Activo' : 'Suspendido'}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Button asChild variant="secondary" size="sm">
                      <Link to={`/admin/nutritionists/${n.id}`} className="text-xs inline-flex items-center gap-1">
                        <span>Ver perfil</span>
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
  );
};
