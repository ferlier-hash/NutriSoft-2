import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { RealBrandIdentity, RealBrandHeader } from '../../components/domain/RealBranding';
import { Activity, CalendarDays, ClipboardCheck, ClipboardList, CookingPot, CreditCard, FileText, Home, Inbox, Library, ListChecks, LogOut, Menu, Settings, Sparkles, UserRound, Users } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { getSupabaseClient } from '../../auth/supabase-client';

const items = [
  { label: 'Inicio', path: '', icon: Home },
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
  { label: 'Reportes', path: 'reports', icon: FileText },
  { label: 'Configuración', path: 'settings', icon: Settings },
];
export function RealProfessionalShell() {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [alertCount,setAlertCount]=useState(0);
  useEffect(()=>{let active=true;const load=async()=>{try{const {count}=await getSupabaseClient().schema('api').from('attention_inbox').select('id',{count:'exact',head:true}).in('status',['unresolved','acknowledged']);if(active)setAlertCount(count??0);}catch{/* La navegación sigue disponible si la bandeja no responde. */}};void load();const focus=()=>void load();window.addEventListener('focus',focus);return()=>{active=false;window.removeEventListener('focus',focus);};},[]);
  const navigation = () => <nav aria-label="Menú profesional" className="space-y-1">{items.map(({ label, path, icon: Icon, pending }) => pending ?
    <div key={path} aria-disabled="true" className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-tertiary"><Icon aria-hidden="true" className="h-4 w-4 shrink-0" /><span className="flex-1">{label}</span><span className="text-[10px]">Pendiente</span></div> :
    <NavLink key={path||'home'} end={!path} to={path?`/professional/${path}`:'/professional'} onClick={() => setMenuOpen(false)} className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium ${isActive ? 'bg-[image:var(--grad-nav-active)] text-brand-strong' : 'text-text-secondary hover:bg-surface-subtle'}`}><Icon aria-hidden="true" className="h-4 w-4 shrink-0" /><span className="flex-1">{label}</span>{path==='inbox'&&alertCount>0&&<span className="rounded-full bg-critical px-2 py-0.5 text-[10px] font-bold text-white" aria-label={`${alertCount} avisos pendientes`}>{alertCount}</span>}</NavLink>
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
    <nav aria-label="Accesos rápidos" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border-subtle bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
      {[items[0]!,items[3]!,items[5]!,items[4]!].map(({label,path,icon:Icon}) => <NavLink key={path||'home'} end={!path} to={path?`/professional/${path}`:'/professional'} className={({isActive}) => `relative flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] ${isActive ? 'text-brand-strong bg-surface-tinted' : 'text-text-secondary'}`}><Icon aria-hidden="true" className="h-5 w-5" />{label==='Bandeja de atención'?'Bandeja':label}{path==='inbox'&&alertCount>0&&<span className="absolute right-[22%] top-1.5 min-w-4 rounded-full bg-critical px-1 text-center text-[9px] font-bold text-white">{alertCount}</span>}</NavLink>)}
      <button className="flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] text-text-secondary" onClick={() => setMenuOpen(true)}><Menu aria-hidden="true" className="h-5 w-5" />Más</button>
    </nav>
    <Dialog isOpen={menuOpen} onClose={() => setMenuOpen(false)} title="Menú profesional" description="Los módulos pendientes todavía no están conectados en REAL.">{navigation()}<Button variant="ghost" onClick={() => void signOut()}><LogOut aria-hidden="true" className="mr-2 h-4 w-4" />Cerrar sesión</Button></Dialog>
  </div>;
}
