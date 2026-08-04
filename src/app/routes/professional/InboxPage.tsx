import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMock } from '../../provider';
import { useToast } from '../../../components/ui/Toast';
import { Card } from '../../../components/ui/Card';
import { PriorityInboxCard } from '../../../components/domain/PriorityInboxCard';
import { Inbox, CheckCircle2, ShieldAlert } from 'lucide-react';

export const InboxPage: React.FC = () => {
  // SCOPE-01: Usar las alertas del profesional actual
  const { professionalAlerts, resolveAlert, currentDemoNutritionist } = useMock();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'high'>('unresolved');

  const filteredAlerts = professionalAlerts.filter(a => {
    if (filter === 'unresolved') return a.status === 'unresolved';
    if (filter === 'high') return a.priority === 'high' && a.status === 'unresolved';
    return true;
  });

  const handleSelectPatient = (patientId: string) => {
    navigate(`/professional/patients/${patientId}`);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Cabecera de la Bandeja */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Inbox className="w-6 h-6 text-brand-strong" />
            <h2 className="text-2xl font-bold text-text-primary">Bandeja de atención</h2>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Alertas asignadas a tu consultorio ({currentDemoNutritionist?.name || 'Profesional'}).
          </p>
        </div>

        {/* Filtros de la Bandeja */}
        <div className="flex items-center gap-1 bg-surface-subtle p-1 rounded-xl border border-border-subtle">
          <button
            type="button"
            onClick={() => setFilter('unresolved')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer min-h-[36px] ${
              filter === 'unresolved'
                ? 'bg-surface text-brand-strong shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Pendientes ({professionalAlerts.filter(a => a.status === 'unresolved').length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('high')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer min-h-[36px] ${
              filter === 'high'
                ? 'bg-[#FCEBEA] text-[#902A24] shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            🚨 Altas
          </button>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer min-h-[36px] ${
              filter === 'all'
                ? 'bg-surface text-text-primary shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Todas
          </button>
        </div>
      </div>

      {/* Lista de Tarjetas de Alerta */}
      {filteredAlerts.length === 0 ? (
        <Card className="text-center py-12 space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#E8F5EE] text-[#1E5235] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-text-primary">¡Bandeja al día!</h3>
          <p className="text-xs text-text-secondary max-w-sm mx-auto">
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
              onResolveAlert={alertId => {
                try {
                  resolveAlert(alertId);
                  showToast('Alerta resuelta', 'La alerta ha sido marcada como atendida');
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : 'Error al resolver alerta';
                  showToast('Error', msg, 'error');
                }
              }}
            />
          ))}
        </div>
      )}

      <div className="p-4 bg-surface-tinted border border-border-subtle rounded-2xl flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-brand-strong shrink-0 mt-0.5" />
        <div className="text-xs text-brand-strong">
          <p className="font-semibold">Reglas dinámicas de atención activas:</p>
          <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-text-secondary">
            <li><strong>🚨 Alta:</strong> Paciente solicita ayuda explícita, energía ≤ 2 o adherencia ≤ 2.</li>
            <li><strong>ℹ️ Ninguna:</strong> Respuesta con indicadores normales (≥ 3) sin pedido de ayuda.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
