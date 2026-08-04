import React from 'react';
import { useMock } from '../../app/provider';
import { useToast } from '../ui/Toast';
import { Bell, Search } from 'lucide-react';

interface HeaderProps {
  portal: 'admin' | 'professional';
}

export const Header: React.FC<HeaderProps> = ({ portal }) => {
  const { professionalAlerts, alerts, currentDemoNutritionist } = useMock();
  const { showToast } = useToast();

  const relevantAlerts = portal === 'professional' ? professionalAlerts : alerts;
  const unresolvedAlertsCount = relevantAlerts.filter(a => a.status === 'unresolved').length;

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      showToast('Búsqueda global', 'La búsqueda global asistida estará disponible en la próxima versión.', 'info');
    }
  };

  const handleBellClick = () => {
    if (unresolvedAlertsCount > 0) {
      showToast('Notificaciones activas', `Tienes ${unresolvedAlertsCount} atención(es) prioritaria(s) pendiente(s) en la bandeja.`, 'info');
    } else {
      showToast('Notificaciones', 'No tienes notificaciones pendientes por el momento.', 'info');
    }
  };

  return (
    <header className="h-16 bg-surface border-b border-border-subtle flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-text-primary tracking-tight">
          {portal === 'admin'
            ? 'Panel de Administración'
            : currentDemoNutritionist
            ? `Consultorio — ${currentDemoNutritionist.organizationName}`
            : 'Consultorio Nutricional'}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden sm:block w-64">
          <label htmlFor="global-header-search" className="sr-only">
            Buscar en el panel
          </label>
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            id="global-header-search"
            type="text"
            onKeyDown={handleSearchKeyDown}
            placeholder={
              portal === 'admin'
                ? 'Buscar organización o nutricionista...'
                : 'Buscar paciente o check-in...'
            }
            className="w-full pl-9 pr-4 py-2 text-xs bg-surface-subtle border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-strong text-text-primary placeholder:text-text-tertiary"
          />
        </div>

        <button
          type="button"
          onClick={handleBellClick}
          aria-label={`Ver notificaciones (${unresolvedAlertsCount} pendientes)`}
          className="relative p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-subtle transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand-strong"
        >
          <Bell className="w-5 h-5" />
          {unresolvedAlertsCount > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-semantic-critical ring-2 ring-white" />
          )}
        </button>
      </div>
    </header>
  );
};
