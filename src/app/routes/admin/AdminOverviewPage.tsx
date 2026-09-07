import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CircleAlert,
  Clock3,
  Plus,
  ShieldCheck,
  Stethoscope,
  Users,
} from 'lucide-react';
import { useMock } from '../../provider';
import { Button } from '../../../components/ui/Button';
import { PlatformHistoryChart } from '../../../components/domain/PlatformHistoryChart';
import { CreateOrganizationDialog } from '../../../components/domain/CreateOrganizationDialog';
import { RegisterPaymentDialog } from '../../../components/domain/RegisterPaymentDialog';
import { daysUntil } from '../../../lib/adminCommercial';

export const AdminOverviewPage: React.FC = () => {
  const { organizations } = useMock();
  const navigate = useNavigate();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [paymentOrganizationId, setPaymentOrganizationId] = useState<string | null>(null);
  const paymentOrganization = organizations.find(item => item.id === paymentOrganizationId) ?? null;

  const activeOrganizations = organizations.filter(item => item.status === 'active').length;
  const activePatients = organizations
    .filter(item => item.status === 'active' || item.status === 'payment_due')
    .reduce((sum, item) => sum + item.patientsCount, 0);
  const nutritionists = organizations.reduce((sum, item) => sum + item.nutritionistsCount, 0);
  const dueSoonOrganizations = organizations.filter(item => item.status === 'active' && daysUntil(item.nextBillingDate) >= 0 && daysUntil(item.nextBillingDate) <= 3);
  const paymentDueOrganizations = organizations.filter(item => item.status === 'payment_due');
  const nearSuspensionOrganizations = organizations.filter(item => item.status === 'payment_due' && item.suspensionDate && daysUntil(item.suspensionDate) <= 2);
  const suspendedOrganizations = organizations.filter(item => item.status === 'suspended');

  const summaryCards = [
    { label: 'Consultorios activos', value: activeOrganizations, note: `${organizations.length} registrados`, icon: Building2, to: '/admin/organizations' },
    { label: 'Nutricionistas', value: nutritionists, note: 'Perfiles vinculados', icon: Stethoscope, to: '/admin/nutritionists' },
    { label: 'Pacientes activos', value: activePatients, note: 'Sólo conteo agregado', icon: Users },
  ];

  const operationCards = [
    { label: 'Vencen en 3 días', organizations: dueSoonOrganizations, icon: CalendarClock, tone: 'info', allowPayment: true },
    { label: 'Pendiente de pago', organizations: paymentDueOrganizations, icon: Clock3, tone: 'warning', allowPayment: true },
    { label: 'Próximo a suspensión', organizations: nearSuspensionOrganizations, icon: CircleAlert, tone: 'critical', allowPayment: true },
    { label: 'Suspendidos', organizations: suspendedOrganizations, icon: ShieldCheck, tone: 'neutral', allowPayment: false },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-7 max-w-[1440px] mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-strong">Super Admin · Vista comercial</p>
          <h2 className="text-3xl font-bold text-text-primary mt-2">Resumen General de Plataforma</h2>
          <p className="text-sm text-text-secondary mt-2 max-w-2xl">
            Estado operativo y comercial de NutriSoft. Las métricas son agregadas y no exponen información clínica identificable.
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsAddOpen(true)} className="gap-2 self-start lg:self-auto">
          <Plus className="w-4 h-4" /> Nuevo consultorio
        </Button>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4" aria-label="Indicadores principales">
        {summaryCards.map(({ label, value, note, icon: Icon, to }) => {
          const content = (
            <div className="bg-surface border border-border-subtle rounded-2xl p-5 h-full hover:border-border-hover transition-colors shadow-sm">
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl bg-brand-soft text-brand-strong flex items-center justify-center"><Icon className="w-5 h-5" /></div>
                {to && <ArrowRight className="w-4 h-4 text-text-tertiary" />}
              </div>
              <p className="text-sm text-text-secondary mt-5">{label}</p>
              <p className="text-3xl font-bold text-text-primary mt-1">{value.toLocaleString('es-AR')}</p>
              <p className="text-xs text-text-tertiary mt-1">{note}</p>
            </div>
          );
          return to ? <Link key={label} to={to} className="rounded-2xl">{content}</Link> : <div key={label}>{content}</div>;
        })}
      </section>

      <section aria-labelledby="commercial-attention-title">
        <div className="mb-3">
          <div>
            <h3 id="commercial-attention-title" className="text-lg font-bold text-text-primary">Atención comercial</h3>
            <p className="text-xs text-text-secondary mt-0.5">Prioridades calculadas sobre el próximo vencimiento y el estado actual.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {operationCards.map(({ label, organizations: matchingOrganizations, icon: Icon, tone, allowPayment }) => (
            <article key={label} className={`commercial-card commercial-card--${tone}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-text-secondary">{label}</p>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold text-text-primary mt-3">{matchingOrganizations.length}</p>
              {matchingOrganizations.length > 0 && (
                <ul className="mt-3 pt-3 border-t border-border-subtle space-y-1.5">
                  {matchingOrganizations.map(organization => (
                    <li key={organization.id} className="flex items-center justify-between gap-2 text-[11px] font-semibold text-text-secondary">
                      <span className="truncate" title={organization.name}>{organization.name}</span>
                      {allowPayment && <button type="button" onClick={() => setPaymentOrganizationId(organization.id)} className="shrink-0 text-[10px] font-bold text-brand-strong hover:underline">Registrar pago</button>}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      </section>

      <PlatformHistoryChart />

      <div className="rounded-2xl border border-[#C6D4F8] bg-[#F4F6FE] p-4 flex gap-3 text-[#2D3F99]">
        <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold">Privacidad por diseño</p>
          <p className="text-xs mt-1 leading-relaxed">El Super Admin administra consultorios, planes, pagos y métricas agregadas. El contenido clínico permanece fuera de este portal.</p>
        </div>
      </div>

      <CreateOrganizationDialog isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onCreated={organization => navigate(`/admin/organizations/${organization.id}`)} />
      <RegisterPaymentDialog organization={paymentOrganization} isOpen={Boolean(paymentOrganization)} onClose={() => setPaymentOrganizationId(null)} />
    </div>
  );
};
