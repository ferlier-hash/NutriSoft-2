import React from 'react';
import { useMock } from '../../app/provider';
import { Bell, Search } from 'lucide-react';

export const Header: React.FC = () => {
  const { currentRole } = useMock();

  if (currentRole === 'patient') {
    return null;
  }

  return (
    <header className="h-16 bg-[#FFFFFF] border-b border-[#E2E9EC] px-6 flex items-center justify-between">
      <div>
        <h1 className="text-lg font-bold text-[#151B22]">
          {currentRole === 'admin' ? 'Panel de Administración' : '¡Hola, Andrea! 👋'}
        </h1>
        <p className="text-xs text-[#66727D]">
          {currentRole === 'admin'
            ? 'Gestiona las organizaciones y métricas de la plataforma.'
            : 'Revisa tu bandeja de atención y el estado de tus pacientes.'}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Buscador Rápido */}
        <div className="relative hidden sm:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A959D]" />
          <input
            type="text"
            placeholder="Buscar..."
            className="pl-9 pr-4 py-1.5 text-xs bg-[#F2F7F8] border border-[#E2E9EC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#357984] w-48 text-[#151B22]"
          />
        </div>

        {/* Notificaciones */}
        <button
          type="button"
          aria-label="Notificaciones"
          className="p-2 text-[#66727D] hover:text-[#151B22] hover:bg-[#F2F7F8] rounded-xl transition-colors relative min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
        >
          <Bell className="w-5 h-5" />
          <span className="w-2 h-2 rounded-full bg-[#C95F59] absolute top-2.5 right-2.5" />
        </button>
      </div>
    </header>
  );
};
