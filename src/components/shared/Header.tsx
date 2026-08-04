import React from 'react';
import { useMock } from '../../app/provider';
import { Bell, Search } from 'lucide-react';

interface HeaderProps {
  portal: 'admin' | 'professional';
}

export const Header: React.FC<HeaderProps> = ({ portal }) => {
  const { alerts } = useMock();
  const unresolvedAlertsCount = alerts.filter(a => a.status === 'unresolved').length;

  return (
    <header className="h-16 bg-[#FFFFFF] border-b border-[#E2E9EC] flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-[#151B22] tracking-tight">
          {portal === 'admin' ? 'Panel de Administración' : 'Consultorio Nutricional'}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden sm:block w-64">
          <label htmlFor="global-header-search" className="sr-only">
            Buscar en el panel
          </label>
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A959D]" />
          <input
            id="global-header-search"
            type="text"
            placeholder={
              portal === 'admin'
                ? 'Buscar organización o nutricionista...'
                : 'Buscar paciente o check-in...'
            }
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#F2F7F8] border border-[#E2E9EC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#357984] text-[#151B22]"
          />
        </div>

        <button
          type="button"
          aria-label="Ver notificaciones"
          className="relative p-2 rounded-xl text-[#66727D] hover:text-[#151B22] hover:bg-[#F2F7F8] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
        >
          <Bell className="w-5 h-5" />
          {portal === 'professional' && unresolvedAlertsCount > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#C95F59] ring-2 ring-white" />
          )}
        </button>
      </div>
    </header>
  );
};
