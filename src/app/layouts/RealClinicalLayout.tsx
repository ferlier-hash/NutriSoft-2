import { Outlet, NavLink } from 'react-router-dom';
import { Activity, CalendarDays, ClipboardList, CookingPot, FileText, Home, LogOut, Menu, UserRound } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { Button } from '../../components/ui/Button';
import { RealDailyHome } from '../../components/domain/RealDailyHome';
import { useLocation } from 'react-router-dom';
import { RealProfessionalShell } from './RealProfessionalShell';
import { RealBrandingProvider, RealBrandIdentity, RealBrandHeader } from '../../components/domain/RealBranding';
import { Dialog } from '../../components/ui/Dialog';
import { useState } from 'react';

export function RealClinicalLayout({ portal }: { portal: 'professional' | 'patient' }) {
  return <RealBrandingProvider><ClinicalContent portal={portal}/></RealBrandingProvider>;
}
function ClinicalContent({ portal }: { portal: 'professional' | 'patient' }) {
  const { profile, signOut } = useAuth();
  const location=useLocation();
  const isProfessional = portal === 'professional';
  const home = isProfessional ? '/professional/meal-plans' : '/patient';
  if (isProfessional) return <RealProfessionalShell />;
  return <PatientMobileShell home={home} profileName={profile?.fullName} signOut={signOut} locationPath={location.pathname}/>;
}

function PatientMobileShell({home,profileName,signOut,locationPath}:{home:string;profileName?:string;signOut:()=>Promise<void>;locationPath:string}){
  const [menuOpen,setMenuOpen]=useState(false);
  const links=[{to:'/patient',label:'Inicio',Icon:Home,end:true},{to:'/patient/followup',label:'Seguimiento',Icon:Activity},{to:'/patient/appointments',label:'Citas',Icon:CalendarDays}];
  return <div className="min-h-screen bg-bg-app pb-20">
    <header className="sticky top-0 z-30 border-b border-border-subtle bg-surface/95 backdrop-blur px-4 sm:px-6 py-3">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <NavLink to={home} className="flex min-h-11 items-center gap-2 text-sm font-bold text-text-primary">
          <RealBrandIdentity patient />
        </NavLink>
        <button type="button" className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-text-secondary hover:bg-surface-subtle" aria-label="Abrir menú del paciente" onClick={()=>setMenuOpen(true)}><Menu className="h-5 w-5"/></button>
      </div>
    </header>
    <main>{locationPath==='/patient'&&<><RealBrandHeader patient/><div className="max-w-md mx-auto px-4 pt-4"><RealDailyHome/></div></>}<Outlet /></main>
    <nav aria-label="Navegación del paciente" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border-subtle bg-surface pb-[env(safe-area-inset-bottom)]">
      {links.map(({to,label,Icon,end})=><NavLink key={to} to={to} end={end} className={({isActive})=>`flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] ${isActive?'bg-surface-tinted text-brand-strong':'text-text-secondary'}`}><Icon className="h-5 w-5"/>{label}</NavLink>)}
      <NavLink to="/patient/recipes" className={({isActive})=>`flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] ${isActive?'bg-surface-tinted text-brand-strong':'text-text-secondary'}`}><CookingPot className="h-5 w-5"/>Recetas</NavLink>
      <button type="button" className="flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] text-text-secondary" onClick={()=>setMenuOpen(true)}><Menu className="h-5 w-5"/>Más</button>
    </nav>
    <Dialog isOpen={menuOpen} onClose={()=>setMenuOpen(false)} title="Tu cuenta" description="Accesos personales y contenido compartido por tu profesional."><nav className="space-y-1"><p className="mb-3 flex items-center gap-2 rounded-xl bg-surface-subtle p-3 text-sm"><UserRound className="h-4 w-4 text-brand-strong"/>{profileName}</p><NavLink to="/patient/resources" onClick={()=>setMenuOpen(false)} className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold hover:bg-surface-subtle"><FileText className="h-4 w-4 text-brand-strong"/>Recursos</NavLink><NavLink to="/patient/measurements" onClick={()=>setMenuOpen(false)} className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold hover:bg-surface-subtle"><ClipboardList className="h-4 w-4 text-brand-strong"/>Registrar peso</NavLink><Button className="mt-3 w-full" variant="ghost" onClick={()=>void signOut()}><LogOut className="mr-2 h-4 w-4"/>Cerrar sesión</Button></nav></Dialog>
  </div>;
}
