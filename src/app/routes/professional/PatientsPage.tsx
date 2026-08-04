import React, { useState } from 'react';
import { useMock } from '../../provider';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Search, UserPlus, ChevronRight } from 'lucide-react';

export const PatientsPage: React.FC = () => {
  const { patients } = useMock();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPatients = patients.filter(
    p =>
      p.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#151B22]">Lista de pacientes</h2>
          <p className="text-xs text-[#66727D] mt-0.5">
            Gestiona la nómina de pacientes registrados en tu consultorio.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => (window.location.hash = '#/professional')}
          className="flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          <span>Nuevo paciente</span>
        </Button>
      </div>

      <Card className="space-y-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A959D]" />
          <input
            type="text"
            placeholder="Buscar por nombre o correo..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#F2F7F8] border border-[#E2E9EC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#357984]"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E9EC] text-xs text-[#66727D] font-medium">
                <th className="py-3 px-4">Paciente</th>
                <th className="py-3 px-4">Correo</th>
                <th className="py-3 px-4">Teléfono</th>
                <th className="py-3 px-4">Objetivo</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E9EC] text-xs">
              {filteredPatients.map(p => (
                <tr key={p.id} className="hover:bg-[#F2F7F8] transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-[#151B22] flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#EDF8F7] text-[#357984] flex items-center justify-center font-bold text-xs border border-[#BDE9EA]">
                      {p.firstName[0]}
                      {p.lastName[0]}
                    </div>
                    <div>
                      <span>
                        {p.firstName} {p.lastName}
                      </span>
                      <span className="block text-[11px] font-normal text-[#8A959D]">
                        {p.age} años • {p.city}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-[#66727D]">{p.email}</td>
                  <td className="py-3.5 px-4 text-[#66727D]">{p.phone}</td>
                  <td className="py-3.5 px-4 text-[#151B22] font-medium max-w-xs truncate">
                    {p.objective}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant={p.status === 'active' ? 'active' : 'suspended'}>
                      {p.status === 'active' ? 'Activo' : 'Archivado'}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => (window.location.hash = `#/professional/patients/${p.id}`)}
                      className="text-xs flex items-center gap-1 ml-auto"
                    >
                      <span>Abrir ficha</span>
                      <ChevronRight className="w-3.5 h-3.5" />
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
