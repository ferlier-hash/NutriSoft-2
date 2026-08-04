import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMock } from '../../app/provider';
import { Shield, UserCheck, User, RefreshCw, Stethoscope } from 'lucide-react';

export const DevRoleSwitcher: React.FC = () => {
  const {
    patients,
    currentDemoPatientId,
    setCurrentDemoPatientId,
    nutritionists,
    currentDemoNutritionistId,
    setCurrentDemoNutritionistId,
    resetToInitialMockData,
  } = useMock();
  const navigate = useNavigate();
  const location = useLocation();

  if (!import.meta.env.DEV) {
    return null;
  }

  const activePortal = location.pathname.startsWith('/admin')
    ? 'admin'
    : location.pathname.startsWith('/patient')
    ? 'patient'
    : 'professional';

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

      {/* Selector de Portales mediante Navegación */}
      <div className="flex items-center gap-1 bg-white/10 p-0.5 rounded-full">
        <button
          type="button"
          onClick={() => navigate('/admin')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-medium transition-all min-h-[32px] cursor-pointer ${
            activePortal === 'admin'
              ? 'bg-[#55AEB8] text-[#151B22] shadow-sm font-semibold'
              : 'text-gray-300 hover:text-white hover:bg-white/10'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Admin</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/professional')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-medium transition-all min-h-[32px] cursor-pointer ${
            activePortal === 'professional'
              ? 'bg-[#55AEB8] text-[#151B22] shadow-sm font-semibold'
              : 'text-gray-300 hover:text-white hover:bg-white/10'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Nutricionista</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/patient')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-medium transition-all min-h-[32px] cursor-pointer ${
            activePortal === 'patient'
              ? 'bg-[#55AEB8] text-[#151B22] shadow-sm font-semibold'
              : 'text-gray-300 hover:text-white hover:bg-white/10'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Paciente</span>
        </button>
      </div>

      {/* SCOPE-01: Selector de Nutricionista Simulado en Portal Profesional */}
      {activePortal === 'professional' && (
        <div className="flex items-center gap-1 pl-2 border-l border-white/20">
          <Stethoscope className="w-3.5 h-3.5 text-[#55AEB8]" />
          <label htmlFor="demo-nutri-select" className="text-[11px] text-gray-300 font-medium">
            Profesional:
          </label>
          <select
            id="demo-nutri-select"
            value={currentDemoNutritionistId}
            onChange={e => setCurrentDemoNutritionistId(e.target.value)}
            className="bg-[#151B22] text-white border border-white/20 text-xs rounded-lg px-2 py-1 focus:ring-1 focus:ring-[#55AEB8]"
          >
            {nutritionists.map(n => (
              <option key={n.id} value={n.id}>
                {n.name} ({n.organizationName})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Selector de Paciente Simulado en Portal Patient */}
      {activePortal === 'patient' && (
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
        className="px-2 py-1 text-gray-300 hover:text-white underline text-[11px] font-medium cursor-pointer"
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
