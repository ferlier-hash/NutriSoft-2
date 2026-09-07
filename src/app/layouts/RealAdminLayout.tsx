import { useState } from 'react';
import { Building2, LayoutDashboard, LogOut, Settings, Stethoscope } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { Button } from '../../components/ui/Button';

const pendingItems = [
  { label: 'Nutricionistas', icon: Stethoscope },
  { label: 'Configuración', icon: Settings },
];

export function RealAdminLayout() {
  const { profile, signOut } = useAuth();
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const initials = profile?.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'AD';

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setSignOutError(null);
    try {
      await signOut();
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : 'No pudimos cerrar la sesión.');
      setIsSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-app flex flex-col md:flex-row">
      <aside className="hidden md:flex w-64 min-h-screen shrink-0 flex-col justify-between border-r border-border-subtle bg-surface p-4">
        <div>
          <div className="flex items-center gap-2 px-3 py-4 mb-4">
            <div className="w-9 h-9 rounded-xl bg-[linear-gradient(135deg,#8EDADD_0%,#A9DFF3_55%,#EDE196_100%)] flex items-center justify-center text-text-primary font-bold text-lg">N</div>
            <div>
              <span className="font-bold text-base text-text-primary">NutriSoft</span>
              <span className="text-[10px] text-text-secondary block font-medium">Platform Admin</span>
            </div>
          </div>

          <nav aria-label="Menú principal de administración" className="space-y-1">
            <NavLink
              to="/admin"
              end
              className={({ isActive }) => `flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${isActive ? 'bg-[linear-gradient(90deg,#D9F3F2_0%,#E3F1F8_100%)] text-brand-strong font-semibold' : 'text-text-secondary hover:bg-surface-subtle'}`}
            >
              <LayoutDashboard className="w-4 h-4" aria-hidden="true" /> Resumen
            </NavLink>
            <NavLink
              to="/admin/organizations"
              className={({ isActive }) => `flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${isActive ? 'bg-[linear-gradient(90deg,#D9F3F2_0%,#E3F1F8_100%)] text-brand-strong font-semibold' : 'text-text-secondary hover:bg-surface-subtle'}`}
            >
              <Building2 className="w-4 h-4" aria-hidden="true" /> Consultorios
            </NavLink>
            {pendingItems.map(({ label, icon: Icon }) => (
              <div key={label} aria-disabled="true" className="flex min-h-[44px] items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-text-tertiary opacity-70">
                <span className="flex items-center gap-3"><Icon className="w-4 h-4" aria-hidden="true" />{label}</span>
                <span className="text-[10px] font-semibold">Integrando</span>
              </div>
            ))}
          </nav>
        </div>

        <div className="border-t border-border-subtle pt-4">
          <div className="flex items-center gap-3 rounded-xl bg-surface-subtle px-3 py-2">
            <div className="w-8 h-8 shrink-0 rounded-full bg-brand-primary text-text-primary flex items-center justify-center font-bold text-xs">{initials}</div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-text-primary">{profile?.fullName ?? 'Platform Admin'}</p>
              <p className="truncate text-[10px] text-text-secondary">{profile?.email ?? 'Cuenta autenticada'}</p>
            </div>
          </div>
          <Button type="button" variant="ghost" size="sm" className="mt-2 w-full gap-2" disabled={isSigningOut} onClick={() => void handleSignOut()}>
            <LogOut className="w-4 h-4" aria-hidden="true" /> {isSigningOut ? 'Cerrando…' : 'Cerrar sesión'}
          </Button>
          {signOutError && <p role="alert" className="mt-2 text-xs text-semantic-critical">{signOutError}</p>}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="min-h-16 border-b border-border-subtle bg-surface px-4 sm:px-6 flex flex-wrap items-center justify-between gap-3 py-3">
          <div>
            <h1 className="text-lg font-bold text-text-primary">Panel de Administración</h1>
            <p className="text-[11px] text-text-secondary md:hidden">{profile?.fullName ?? 'Cuenta autenticada'}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-[#BDE3CC] bg-[#E8F5EE] px-3 py-1 text-[11px] font-semibold text-[#1E5235]">Datos reales</span>
            <span className="rounded-full border border-border-subtle bg-surface-subtle px-3 py-1 text-[11px] font-semibold text-text-secondary">Sólo lectura</span>
            <Button type="button" variant="ghost" size="sm" className="md:hidden" disabled={isSigningOut} onClick={() => void handleSignOut()} aria-label="Cerrar sesión">
              <LogOut className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto"><Outlet /></main>
      </div>
    </div>
  );
}
