import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { RealBrandIdentity, RealBrandHeader } from '../../components/domain/RealBranding';
import { Activity, CalendarDays, ClipboardCheck, ClipboardList, CookingPot, CreditCard, FileText, Inbox, Library, ListChecks, LogOut, Menu, Settings, Sparkles, UserRound, Users } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';

const items = [
  { label: 'Seguimiento', path: 'followup', icon: Activity },
  { label: 'Mi perfil', path: 'profile', icon: UserRound },
  { label: 'Pacientes', path: 'patients', icon: Users },
  { label: 'Bandeja de atención', path: 'inbox', icon: Inbox },
  { label: 'Agenda', path: 'agenda', icon: CalendarDays },
  { label: 'Citas', path: 'appointments', icon: CalendarDays, pending: true },
  { label: 'Ingresos', path: 'income', icon: CreditCard },
  { label: 'Planes alimentarios', path: 'meal-plans', icon: ClipboardList },
  { label: 'Recetario', path: 'recipes', icon: CookingPot },
  { label: 'Próximos pasos', path: 'next-steps', icon: ListChecks },
  { label: 'Recursos', path: 'resources', icon: Library },
  { label: 'Check-ins', path: 'checkins', icon: ClipboardCheck },
  { label: 'Recomendaciones', path: 'recommendations', icon: Sparkles },
  { label: 'Reportes', path: 'reports', icon: FileText, pending: true },
  { label: 'Configuración', path: 'settings', icon: Settings },
];
export function RealProfessionalShell() {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigation = () => <nav aria-label="Menú profesional" className="space-y-1">{items.map(({ label, path, icon: Icon, pending }) => pending ?
    <div key={path} aria-disabled="true" className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-tertiary"><Icon aria-hidden="true" className="h-4 w-4 shrink-0" /><span className="flex-1">{label}</span><span className="text-[10px]">Pendiente</span></div> :
    <NavLink key={path} to={`/professional/${path}`} onClick={() => setMenuOpen(false)} className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium ${isActive ? 'bg-[image:var(--grad-nav-active)] text-brand-strong' : 'text-text-secondary hover:bg-surface-subtle'}`}><Icon aria-hidden="true" className="h-4 w-4 shrink-0" />{label}</NavLink>
  )}</nav>;
  return <div className="min-h-screen bg-bg-app lg:pl-64">
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border-subtle bg-surface lg:flex">
      <div className="p-6"><RealBrandIdentity /></div><div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{navigation()}</div>
      <div className="border-t border-border-subtle p-4"><p className="break-words text-xs font-semibold">{profile?.fullName}</p><Button variant="ghost" size="sm" onClick={() => void signOut()}><LogOut aria-hidden="true" className="mr-2 h-4 w-4" />Cerrar sesión</Button></div>
    </aside>
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-border-subtle bg-surface/95 px-4 backdrop-blur sm:px-6">
      <div className="lg:hidden"><RealBrandIdentity /></div><p className="hidden text-sm font-semibold lg:block">Espacio profesional</p>
      <p className="hidden max-w-sm truncate text-xs text-text-secondary sm:block">{profile?.fullName}</p>
      <Button className="lg:hidden" variant="ghost" aria-label="Abrir menú" onClick={() => setMenuOpen(true)}><Menu aria-hidden="true" className="h-5 w-5" /></Button>
    </header>
    <main className="min-w-0 pb-20 lg:pb-0">{['/professional','/professional/followup'].includes(location.pathname)&&<RealBrandHeader/>}<Outlet /></main>
    <nav aria-label="Accesos rápidos" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border-subtle bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
      {[items[2]!, items[4]!, items[7]!].map(({label,path,icon:Icon}) => <NavLink key={path} to={`/professional/${path}`} className={({isActive}) => `flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] ${isActive ? 'text-brand-strong bg-surface-tinted' : 'text-text-secondary'}`}><Icon aria-hidden="true" className="h-5 w-5" />{label === 'Planes alimentarios' ? 'Planes' : label}</NavLink>)}
      <button className="flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] text-text-secondary" onClick={() => setMenuOpen(true)}><Menu aria-hidden="true" className="h-5 w-5" />Más</button>
    </nav>
    <Dialog isOpen={menuOpen} onClose={() => setMenuOpen(false)} title="Menú profesional" description="Los módulos pendientes todavía no están conectados en REAL.">{navigation()}<Button variant="ghost" onClick={() => void signOut()}><LogOut aria-hidden="true" className="mr-2 h-4 w-4" />Cerrar sesión</Button></Dialog>
  </div>;
}
