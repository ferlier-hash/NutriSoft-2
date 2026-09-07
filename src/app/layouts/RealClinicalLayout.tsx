import { Outlet, NavLink } from 'react-router-dom';
import { CalendarDays, ClipboardList, LogOut, Settings, UserRound, Users } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { Button } from '../../components/ui/Button';
import { RealDailyHome } from '../../components/domain/RealDailyHome';
import { useLocation } from 'react-router-dom';
import { RealProfessionalShell } from './RealProfessionalShell';
import { RealBrandingProvider, RealBrandIdentity, RealBrandHeader } from '../../components/domain/RealBranding';

export function RealClinicalLayout({ portal }: { portal: 'professional' | 'patient' }) {
  return <RealBrandingProvider><ClinicalContent portal={portal}/></RealBrandingProvider>;
}
function ClinicalContent({ portal }: { portal: 'professional' | 'patient' }) {
  const { profile, signOut } = useAuth();
  const location=useLocation();
  const isProfessional = portal === 'professional';
  const home = isProfessional ? '/professional/meal-plans' : '/patient';
  if (isProfessional) return <RealProfessionalShell />;
  return <div className="min-h-screen bg-bg-app">
    <header className="sticky top-0 z-30 border-b border-border-subtle bg-surface/95 backdrop-blur px-4 sm:px-6 py-3">
      <div className="mx-auto flex flex-wrap max-w-6xl items-center justify-between gap-3">
        <NavLink to={home} className="flex items-center gap-2 text-sm font-bold text-text-primary">
          <RealBrandIdentity patient />
        </NavLink>
        <nav aria-label="Navegación clínica real" className="flex flex-wrap items-center gap-1">
          <NavLink to={`/${portal}/followup`} className={({isActive})=>`min-h-11 rounded-xl px-3 inline-flex items-center text-xs font-semibold ${isActive?'bg-surface-tinted text-brand-strong':'text-text-secondary hover:bg-surface-subtle'}`}>Seguimiento</NavLink>
          {['recipes','resources'].map((section,index)=><NavLink key={section} to={`/${portal}/${section}`} className={({isActive})=>`min-h-11 rounded-xl px-3 inline-flex items-center text-xs font-semibold ${isActive?'bg-surface-tinted text-brand-strong':'text-text-secondary hover:bg-surface-subtle'}`}>{index?'Recursos':'Recetario'}</NavLink>)}
          <NavLink to={home} end className={({ isActive }) => `min-h-11 rounded-xl px-3 inline-flex items-center gap-2 text-xs font-semibold ${isActive ? 'bg-surface-tinted text-brand-strong' : 'text-text-secondary hover:bg-surface-subtle'}`}>
            <ClipboardList className="h-4 w-4" />{isProfessional ? 'Planes' : 'Mi plan'}
          </NavLink>
          {!isProfessional && <NavLink to="/patient/appointments" className={({ isActive }) => `min-h-11 rounded-xl px-3 inline-flex items-center gap-2 text-xs font-semibold ${isActive ? 'bg-surface-tinted text-brand-strong' : 'text-text-secondary hover:bg-surface-subtle'}`}><CalendarDays className="h-4 w-4" />Citas</NavLink>}
          {isProfessional && <NavLink to="/professional/agenda" className={({ isActive }) => `min-h-11 rounded-xl px-3 inline-flex items-center gap-2 text-xs font-semibold ${isActive ? 'bg-surface-tinted text-brand-strong' : 'text-text-secondary hover:bg-surface-subtle'}`}>
            <CalendarDays className="h-4 w-4" />Agenda
          </NavLink>}
          {isProfessional && <NavLink to="/professional/patients" className={({ isActive }) => `min-h-11 rounded-xl px-3 inline-flex items-center gap-2 text-xs font-semibold ${isActive ? 'bg-surface-tinted text-brand-strong' : 'text-text-secondary hover:bg-surface-subtle'}`}><Users className="h-4 w-4" />Pacientes</NavLink>}
          {isProfessional && <NavLink to="/professional/settings" className={({ isActive }) => `min-h-11 rounded-xl px-3 inline-flex items-center gap-2 text-xs font-semibold ${isActive ? 'bg-surface-tinted text-brand-strong' : 'text-text-secondary hover:bg-surface-subtle'}`}>
            <Settings className="h-4 w-4" />Configuración
          </NavLink>}
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 text-xs text-text-secondary"><UserRound className="h-4 w-4" />{profile?.fullName}</span>
          <Button variant="ghost" size="sm" aria-label="Cerrar sesión" onClick={() => void signOut()}><LogOut className="h-4 w-4" /></Button>
        </nav>
      </div>
    </header>
    <main>{!isProfessional&&location.pathname==='/patient'&&<><RealBrandHeader patient/><div className="max-w-md mx-auto px-4 pt-4"><RealDailyHome/></div></>}<Outlet /></main>
  </div>;
}
