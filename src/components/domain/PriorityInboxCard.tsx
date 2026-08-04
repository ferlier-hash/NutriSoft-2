import React from 'react';
import type { Alert } from '../../types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { formatRelativeTime } from '../../lib/dateUtils';
import { AlertTriangle, Info, CheckCircle2, User } from 'lucide-react';

interface PriorityInboxCardProps {
  alert: Alert;
  onSelectPatient: (patientId: string) => void;
  onResolveAlert: (alertId: string) => void;
}

export const PriorityInboxCard: React.FC<PriorityInboxCardProps> = ({
  alert,
  onSelectPatient,
  onResolveAlert,
}) => {
  const isHigh = alert.priority === 'high';
  const isResolved = alert.status === 'resolved';

  return (
    <Card
      className={`space-y-3 transition-all ${
        isResolved
          ? 'opacity-60 bg-[#F2F7F8] border-[#E2E9EC]'
          : isHigh
          ? 'bg-[linear-gradient(135deg,#FCEBEA_0%,#FFFFFF_100%)] border-[#F8C4C1] shadow-xs'
          : 'bg-[#FFFFFF] border-[#E2E9EC]'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E2E9EC]/60">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
              isHigh ? 'bg-[#FCEBEA] text-[#902A24]' : 'bg-[#EAEFFC] text-[#2D3F99]'
            }`}
          >
            {isHigh ? <AlertTriangle className="w-4 h-4 text-[#902A24]" /> : <Info className="w-4 h-4 text-[#2D3F99]" />}
          </div>

          <div>
            <h4 className="font-bold text-sm text-[#151B22] flex items-center gap-1.5">
              <span>{alert.patientName}</span>
              <span className="text-xs font-normal text-[#66727D]">— {alert.reasonText}</span>
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={isHigh ? 'high' : 'medium'}>
            {isHigh ? '🚨 Alta Prioridad' : 'ℹ️ Prioridad Media'}
          </Badge>
          <span className="text-[11px] text-[#66727D] font-medium">
            {formatRelativeTime(alert.createdAt)}
          </span>
        </div>
      </div>

      <div className="text-xs text-[#151B22] bg-[#FFFFFF]/80 p-3 rounded-xl border border-[#E2E9EC]">
        <p className="font-semibold text-[#357984] mb-0.5">Acción sugerida:</p>
        <p className="text-[#151B22] font-medium">{alert.recommendedAction}</p>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSelectPatient(alert.patientId)}
          className="flex items-center gap-1"
        >
          <User className="w-3.5 h-3.5 text-[#357984]" />
          <span>Ver ficha del paciente</span>
        </Button>

        {!isResolved ? (
          <Button
            variant="brand"
            size="sm"
            onClick={() => onResolveAlert(alert.id)}
            className="flex items-center gap-1"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Marcar atendidada</span>
          </Button>
        ) : (
          <span className="text-xs text-[#1E5235] font-semibold flex items-center gap-1 px-2 py-1 bg-[#E8F5EE] rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#1E5235]" /> Atendida por {alert.resolvedBy}
          </span>
        )}
      </div>
    </Card>
  );
};
