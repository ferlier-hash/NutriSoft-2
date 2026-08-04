import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, ClipboardCheck, Sparkles, MoreHorizontal } from 'lucide-react';
import { useMock } from '../../app/provider';

export const MobileBottomNav: React.FC = () => {
  const { currentDemoPatientId, checkInAssignments } = useMock();
  
  const pendingAssign = checkInAssignments.find(
    a => a.patientId === currentDemoPatientId && a.status === 'pending'
  );

  return (
    <nav
      aria-label="Navegación inferior del portal del paciente"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#FFFFFF] border-t border-[#E2E9EC] flex items-center justify-around px-2 py-1 md:hidden shadow-lg"
    >
      {/* 1. Inicio */}
      <NavLink
        to="/patient"
        end
        className={({ isActive }) =>
          `flex flex-col items-center justify-center flex-1 py-1.5 min-h-[44px] min-w-[44px] transition-colors ${
            isActive ? 'text-[#357984] font-bold' : 'text-[#66727D] hover:text-[#151B22]'
          }`
        }
      >
        <Home className="w-5 h-5" />
        <span className="text-[10px] mt-0.5 font-medium">Inicio</span>
      </NavLink>

      {/* 2. Check-in */}
      {pendingAssign ? (
        <NavLink
          to={`/patient/check-in/${pendingAssign.id}`}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 py-1.5 min-h-[44px] min-w-[44px] transition-colors ${
              isActive ? 'text-[#357984] font-bold' : 'text-[#66727D] hover:text-[#151B22]'
            }`
          }
        >
          <ClipboardCheck className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-medium">Check-in</span>
        </NavLink>
      ) : (
        <div className="flex flex-col items-center justify-center flex-1 py-1.5 min-h-[44px] min-w-[44px] text-[#8A959D] opacity-60 cursor-not-allowed select-none">
          <ClipboardCheck className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-medium">Sin Check-in</span>
        </div>
      )}

      {/* 3. Recomendaciones (Próximamente) */}
      <div className="flex flex-col items-center justify-center flex-1 py-1.5 min-h-[44px] min-w-[44px] text-[#8A959D] opacity-60 cursor-not-allowed select-none">
        <Sparkles className="w-5 h-5" />
        <span className="text-[10px] mt-0.5 font-medium">Recomendaciones</span>
      </div>

      {/* 4. Más (Próximamente) */}
      <div className="flex flex-col items-center justify-center flex-1 py-1.5 min-h-[44px] min-w-[44px] text-[#8A959D] opacity-60 cursor-not-allowed select-none">
        <MoreHorizontal className="w-5 h-5" />
        <span className="text-[10px] mt-0.5 font-medium">Más</span>
      </div>
    </nav>
  );
};
