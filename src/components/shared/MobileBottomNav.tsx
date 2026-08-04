import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, ClipboardCheck, Sparkles, MoreHorizontal } from 'lucide-react';
import { useMock } from '../../app/provider';

export const MobileBottomNav: React.FC = () => {
  const { currentDemoPatientId, checkInAssignments } = useMock();
  
  const activeAssign = checkInAssignments.find(
    a => a.patientId === currentDemoPatientId && a.status === 'pending'
  );

  return (
    <nav
      aria-label="Navegación inferior del portal del paciente"
      className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border-subtle flex items-center justify-around px-2 py-1 md:hidden shadow-lg"
    >
      {/* 1. Inicio */}
      <NavLink
        to="/patient"
        end
        className={({ isActive }) =>
          `flex flex-col items-center justify-center flex-1 py-1.5 min-h-[44px] min-w-[44px] transition-colors ${
            isActive ? 'text-brand-strong font-bold' : 'text-text-secondary hover:text-text-primary'
          }`
        }
      >
        <Home className="w-5 h-5" />
        <span className="text-[10px] mt-0.5 font-medium">Inicio</span>
      </NavLink>

      {/* 2. Check-in */}
      {activeAssign ? (
        <NavLink
          to={`/patient/check-in/${activeAssign.id}`}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 py-1.5 min-h-[44px] min-w-[44px] transition-colors ${
              isActive ? 'text-brand-strong font-bold' : 'text-text-secondary hover:text-text-primary'
            }`
          }
        >
          <ClipboardCheck className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-medium">Check-in</span>
        </NavLink>
      ) : (
        <div
          aria-disabled="true"
          className="flex flex-col items-center justify-center flex-1 py-1.5 min-h-[44px] min-w-[44px] text-text-tertiary opacity-60 cursor-not-allowed select-none"
        >
          <ClipboardCheck className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-medium">Sin Check-in</span>
        </div>
      )}

      {/* 3. Recomendaciones (Próximamente UX-01) */}
      <div
        aria-disabled="true"
        className="flex flex-col items-center justify-center flex-1 py-1.5 min-h-[44px] min-w-[44px] text-text-tertiary opacity-60 cursor-not-allowed select-none relative"
      >
        <Sparkles className="w-5 h-5" />
        <span className="text-[10px] mt-0.5 font-medium">Recomendaciones</span>
        <span className="text-[8px] bg-surface-subtle text-text-tertiary px-1 rounded border border-border-subtle absolute top-0">
          Próximamente
        </span>
      </div>

      {/* 4. Más (Próximamente UX-01) */}
      <div
        aria-disabled="true"
        className="flex flex-col items-center justify-center flex-1 py-1.5 min-h-[44px] min-w-[44px] text-text-tertiary opacity-60 cursor-not-allowed select-none relative"
      >
        <MoreHorizontal className="w-5 h-5" />
        <span className="text-[10px] mt-0.5 font-medium">Más</span>
        <span className="text-[8px] bg-surface-subtle text-text-tertiary px-1 rounded border border-border-subtle absolute top-0">
          Próximamente
        </span>
      </div>
    </nav>
  );
};
