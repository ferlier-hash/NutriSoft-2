import React from 'react';
import type { Alert } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ChevronRight, Clock, CheckCircle2 } from 'lucide-react';

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
  const isResolved = alert.status === 'resolved';

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-all gap-4 ${
        alert.priority === 'high' && !isResolved
          ? 'bg-[#FCEBEA]/40 border-[#F8C4C1]'
          : alert.priority === 'medium' && !isResolved
          ? 'bg-[#FDF6E2]/40 border-[#F6E5B3]'
          : 'bg-[#FFFFFF] border-[#E2E9EC]'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#EDF8F7] flex items-center justify-center font-semibold text-[#357984] text-sm border border-[#BDE9EA]">
          {alert.patientName.substring(0, 2).toUpperCase()}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-[#151B22] text-sm">{alert.patientName}</h4>
            <Badge
              variant={
                isResolved
                  ? 'active'
                  : alert.priority === 'high'
                  ? 'high'
                  : alert.priority === 'medium'
                  ? 'medium'
                  : 'normal'
              }
            >
              {isResolved
                ? 'Resuelta'
                : alert.priority === 'high'
                ? 'Alta'
                : alert.priority === 'medium'
                ? 'Media'
                : 'Normal'}
            </Badge>
          </div>

          <p className="text-xs text-[#66727D] mt-0.5">{alert.reasonText}</p>

          {alert.recommendedAction && (
            <p className="text-[11px] text-[#357984] font-medium mt-1">
              💡 {alert.recommendedAction}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E2E9EC]">
        <div className="flex items-center gap-1 text-[11px] text-[#8A959D]">
          <Clock className="w-3 h-3" />
          <span>{alert.createdAt}</span>
        </div>

        <div className="flex items-center gap-2">
          {!isResolved && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onResolveAlert(alert.id)}
              className="text-xs flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#39835A]" />
              Resolver
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectPatient(alert.patientId)}
            className="text-xs flex items-center gap-1"
          >
            <span>Ver ficha</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
