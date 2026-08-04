import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, ClipboardCheck, Sparkles, MoreHorizontal } from 'lucide-react';
import { useMock } from '../../app/provider';

export const MobileBottomNav: React.FC = () => {
  const { currentDemoPatientId, checkInAssignments } = useMock();
  const pendingAssign = checkInAssignments.find(
    a => a.patientId === currentDemoPatientId && a.status === 'pending'
  );
  const checkInPath = pendingAssign
    ? `/patient/check-in/${pendingAssign.id}`
    : `/patient/check-in/completed`;

  const navItems = [
    { label: 'Inicio', icon: <Home className="w-5 h-5" />, path: '/patient', end: true },
    { label: 'Check-in', icon: <ClipboardCheck className="w-5 h-5" />, path: checkInPath },
    { label: 'Recomendaciones', icon: <Sparkles className="w-5 h-5" />, path: '/patient', end: true },
    { label: 'Más', icon: <MoreHorizontal className="w-5 h-5" />, path: '/patient', end: true },
  ];

  return (
    <nav
      aria-label="Navegación inferior del portal del paciente"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#FFFFFF] border-t border-[#E2E9EC] flex items-center justify-around px-2 py-1 md:hidden shadow-lg"
    >
      {navItems.map(item => (
        <NavLink
          key={item.label}
          to={item.path}
          end={item.end}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 py-2 min-h-[44px] min-w-[44px] transition-colors ${
              isActive ? 'text-[#357984] font-bold' : 'text-[#8A959D] hover:text-[#151B22]'
            }`
          }
        >
          {item.icon}
          <span className="text-[10px] mt-1 font-medium">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};
