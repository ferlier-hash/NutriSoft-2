import React from 'react';
import { useMock } from '../../app/provider';
import type { UserRole } from '../../types';
import { Shield, UserCheck, User, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const DevRoleSwitcher: React.FC = () => {
  if (!import.meta.env.DEV) {
    return null;
  }

  const {
    currentRole,
    setCurrentRole,
    patients,
    currentDemoPatientId,
    setCurrentDemoPatientId,
    resetToInitialMockData,
  } = useMock();
  const navigate = useNavigate();

  const handleRoleChange = (role: UserRole, targetPath: string) => {
    setCurrentRole(role);
    navigate(targetPath);
  };

  return (
    <div
      role="region"
      aria-label="Selector de demostración para desarrollo"
      className="fixed top-2 right-2 z-50 flex flex-wrap items-center gap-2 px-3 py-1.5 bg-[#151B22]/95 backdrop-blur-md text-white text-xs rounded-2xl shadow-xl border border-white/10"
    >
      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#357984]/50 font-medium text-[11px] text-[#AEE5E8]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#55AEB8] animate-pulse" />
        Modo demostración — datos ficticios
      </span>

      {/* Selector de Roles */}
      <div className="flex items-center gap-1 bg-white/10 p-0.5 rounded-full">
        <button
          type="button"
          onClick={() => handleRoleChange('admin', '/admin')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-medium transition-all min-h-[32px] cursor-pointer ${
            currentRole === 'admin'
              ? 'bg-[#55AEB8] text-[#151B22] shadow-sm font-semibold'
              : 'text-gray-300 hover:text-white hover:bg-white/10'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Admin</span>
        </button>

        <button
          type="button"
          onClick={() => handleRoleChange('nutritionist', '/professional')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-medium transition-all min-h-[32px] cursor-pointer ${
            currentRole === 'nutritionist'
              ? 'bg-[#55AEB8] text-[#151B22] shadow-sm font-semibold'
              : 'text-gray-300 hover:text-white hover:bg-white/10'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Nutricionista</span>
        </button>

        <button
          type="button"
          onClick={() => handleRoleChange('patient', '/patient')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-medium transition-all min-h-[32px] cursor-pointer ${
            currentRole === 'patient'
              ? 'bg-[#55AEB8] text-[#151B22] shadow-sm font-semibold'
              : 'text-gray-300 hover:text-white hover:bg-white/10'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Paciente</span>
        </button>
      </div>

      {/* Selector de Paciente Simulado en Portal Patient */}
      {currentRole === 'patient' && (
        <div className="flex items-center gap-1 pl-2 border-l border-white/20">
          <label htmlFor="demo-patient-select" className="text-[11px] text-gray-300 font-medium">
            Simulando:
          </label>
          <select
            id="demo-patient-select"
            value={currentDemoPatientId}
            onChange={e => setCurrentDemoPatientId(e.target.value)}
            className="bg-[#151B22] text-white border border-white/20 text-xs rounded-lg px-2 py-1 focus:ring-1 focus:ring-[#55AEB8]"
          >
            {patients.map(p => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName}
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        type="button"
        onClick={() => navigate('/design-system')}
        className="px-2 py-1 text-gray-300 hover:text-white underline text-[11px] font-medium"
      >
        /design-system
      </button>

      <button
        type="button"
        onClick={resetToInitialMockData}
        title="Reiniciar datos ficticios"
        aria-label="Reiniciar datos ficticios"
        className="p-1 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
      >
        <RefreshCw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
