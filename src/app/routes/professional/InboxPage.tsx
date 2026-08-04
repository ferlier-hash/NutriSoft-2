import React, { useState } from 'react';
import { useMock } from '../../provider';
import { Card } from '../../../components/ui/Card';
import { PriorityInboxCard } from '../../../components/domain/PriorityInboxCard';
import { Inbox, CheckCircle2, ShieldAlert } from 'lucide-react';

export const InboxPage: React.FC = () => {
  const { alerts, resolveAlert } = useMock();
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'high'>('unresolved');

  const filteredAlerts = alerts.filter(a => {
    if (filter === 'unresolved') return a.status === 'unresolved';
    if (filter === 'high') return a.priority === 'high' && a.status === 'unresolved';
    return true;
  });

  const handleSelectPatient = (patientId: string) => {
    window.location.hash = `#/professional/patients/${patientId}`;
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Cabecera de la Bandeja */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Inbox className="w-6 h-6 text-[#357984]" />
            <h2 className="text-2xl font-bold text-[#151B22]">Bandeja de atención</h2>
          </div>
          <p className="text-xs text-[#66727D] mt-0.5">
            Diferencial central: Identifica qué paciente requiere atención, por qué importa y qué acción tomar.
          </p>
        </div>

        {/* Filtros de la Bandeja */}
        <div className="flex items-center gap-1 bg-[#F2F7F8] p-1 rounded-xl border border-[#E2E9EC]">
          <button
            type="button"
            onClick={() => setFilter('unresolved')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer min-h-[36px] ${
              filter === 'unresolved'
                ? 'bg-[#FFFFFF] text-[#357984] shadow-xs'
                : 'text-[#66727D] hover:text-[#151B22]'
            }`}
          >
            Pendientes ({alerts.filter(a => a.status === 'unresolved').length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('high')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer min-h-[36px] ${
              filter === 'high'
                ? 'bg-[#FCEBEA] text-[#C95F59] shadow-xs'
                : 'text-[#66727D] hover:text-[#151B22]'
            }`}
          >
            🚨 Altas
          </button>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer min-h-[36px] ${
              filter === 'all'
                ? 'bg-[#FFFFFF] text-[#151B22] shadow-xs'
                : 'text-[#66727D] hover:text-[#151B22]'
            }`}
          >
            Todas
          </button>
        </div>
      </div>

      {/* Lista de Tarjetas de Alerta */}
      {filteredAlerts.length === 0 ? (
        <Card className="text-center py-12 space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#E8F5EE] text-[#39835A] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-[#151B22]">¡Bandeja al día!</h3>
          <p className="text-xs text-[#66727D] max-w-sm mx-auto">
            No tienes alertas pendientes en esta vista. Los pacientes están respondiendo dentro de los rangos esperados.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map(alert => (
            <PriorityInboxCard
              key={alert.id}
              alert={alert}
              onSelectPatient={handleSelectPatient}
              onResolveAlert={resolveAlert}
            />
          ))}
        </div>
      )}

      <div className="p-4 bg-[#EDF8F7] border border-[#BDE9EA] rounded-2xl flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-[#357984] shrink-0 mt-0.5" />
        <div className="text-xs text-[#357984]">
          <p className="font-semibold">Reglas dinámicas de atención activas:</p>
          <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-[#66727D]">
            <li><strong>🚨 Alta:</strong> Paciente solicita ayuda explícita, energía $\le 2$ o adherencia $\le 2$.</li>
            <li><strong>ℹ️ Ninguna:</strong> Respuesta con indicadores normales ($\ge 3$) sin pedido de ayuda.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
