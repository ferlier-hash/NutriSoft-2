import React from 'react';
import { NavLink } from 'react-router-dom';
import { useMock } from '../../app/provider';
import {
  LayoutDashboard,
  Users,
  Inbox,
  ClipboardCheck,
  Sparkles,
  FileText,
  Settings,
  Building2,
  Stethoscope,
  CreditCard,
} from 'lucide-react';

interface SidebarProps {
  portal: 'admin' | 'professional';
}

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  end?: boolean;
  badge?: number;
  disabled?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ portal }) => {
  const { professionalAlerts, currentDemoNutritionist } = useMock();
  const unresolvedAlertsCount = professionalAlerts.filter(a => a.status === 'unresolved').length;

  const professionalNav: NavItem[] = [
    { label: 'Inicio', icon: <LayoutDashboard className="w-4 h-4" />, path: '/professional', end: true },
    { label: 'Pacientes', icon: <Users className="w-4 h-4" />, path: '/professional/patients' },
    {
      label: 'Bandeja de atención',
      icon: <Inbox className="w-4 h-4" />,
      path: '/professional/inbox',
      badge: unresolvedAlertsCount > 0 ? unresolvedAlertsCount : undefined,
    },
    { label: 'Check-ins', icon: <ClipboardCheck className="w-4 h-4" />, path: '/professional/checkins', disabled: true },
    { label: 'Recomendaciones', icon: <Sparkles className="w-4 h-4" />, path: '/professional/recommendations', disabled: true },
    { label: 'Reportes', icon: <FileText className="w-4 h-4" />, path: '/professional/reports', disabled: true },
    { label: 'Configuración', icon: <Settings className="w-4 h-4" />, path: '/professional/settings', disabled: true },
  ];

  const adminNav: NavItem[] = [
    { label: 'Resumen', icon: <LayoutDashboard className="w-4 h-4" />, path: '/admin', end: true },
    { label: 'Organizaciones', icon: <Building2 className="w-4 h-4" />, path: '/admin/organizations' },
    { label: 'Nutricionistas', icon: <Stethoscope className="w-4 h-4" />, path: '/admin/nutritionists' },
    { label: 'Facturación', icon: <CreditCard className="w-4 h-4" />, path: '/admin/billing', disabled: true },
    { label: 'Configuración', icon: <Settings className="w-4 h-4" />, path: '/admin/settings', disabled: true },
  ];

  const navItems = portal === 'admin' ? adminNav : professionalNav;

  return (
    <aside className="w-64 bg-surface border-r border-border-subtle flex flex-col justify-between p-4 min-h-screen hidden md:flex shrink-0">
      <div>
        <div className="flex items-center gap-2 px-3 py-4 mb-4">
          <div className="w-9 h-9 rounded-xl bg-[linear-gradient(135deg,#8EDADD_0%,#A9DFF3_55%,#EDE196_100%)] flex items-center justify-center text-text-primary font-bold text-lg shadow-xs">
            N
          </div>
          <div>
            <span className="font-bold text-base text-text-primary tracking-tight">NutriSoft</span>
            <span className="text-[10px] text-text-secondary block font-medium">
              {portal === 'admin'
                ? 'Platform Admin'
                : currentDemoNutritionist
                ? currentDemoNutritionist.organizationName
                : 'Consultorio Nutricional'}
            </span>
          </div>
        </div>

        <nav aria-label="Menú principal de navegación" className="space-y-1">
          {navItems.map(item => {
            if (item.disabled) {
              return (
                <div
                  key={item.label}
                  aria-disabled="true"
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-sm text-text-tertiary opacity-60 cursor-not-allowed select-none min-h-[44px]"
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  <span className="text-[10px] font-semibold bg-surface-subtle text-text-tertiary px-2 py-0.5 rounded-full border border-border-subtle">
                    Próximamente
                  </span>
                </div>
              );
            }

            return (
              <NavLink
                key={item.label}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-sm transition-all min-h-[44px] ${
                    isActive
                      ? 'bg-[linear-gradient(90deg,#D9F3F2_0%,#E3F1F8_100%)] text-brand-strong font-semibold shadow-xs'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-subtle'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-[#FCEBEA] text-[#902A24] rounded-full border border-[#F8C4C1]">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 border-t border-border-subtle">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-surface-subtle">
          <div className="w-8 h-8 rounded-full bg-brand-primary text-text-primary flex items-center justify-center font-bold text-xs">
            {portal === 'admin' ? 'AD' : currentDemoNutritionist ? currentDemoNutritionist.name.split(' ').map(n => n[0]).join('') : 'AN'}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-text-primary truncate">
              {portal === 'admin' ? 'Platform Admin' : currentDemoNutritionist ? currentDemoNutritionist.name : 'Lic. Andrea N.'}
            </p>
            <p className="text-[10px] text-text-secondary truncate">
              {portal === 'admin' ? 'admin@nutrisoft.app' : currentDemoNutritionist ? currentDemoNutritionist.email : 'andrea@clinicabienestar.com'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
