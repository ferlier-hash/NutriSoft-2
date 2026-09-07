import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, ChevronRight, CreditCard, Plus, Search } from 'lucide-react';
import { useMock } from '../../provider';
import { useToast } from '../../../components/ui/Toast';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { CreateOrganizationDialog } from '../../../components/domain/CreateOrganizationDialog';
import { RegisterPaymentDialog } from '../../../components/domain/RegisterPaymentDialog';
import { formatShortDate } from '../../../lib/dateUtils';
import { formatCurrency, formatStorage, PLAN_LABELS, PLAN_PRICES, STATUS_LABELS, storagePercent } from '../../../lib/adminCommercial';
import type { OrganizationPlan, OrganizationStatus } from '../../../types';

const STATUS_STYLES: Record<OrganizationStatus, string> = {
  active: 'status-trigger--active',
  payment_due: 'status-trigger--payment-due',
  suspended: 'status-trigger--suspended',
  closed: 'status-trigger--closed',
};

const StatusBadgeMenu: React.FC<{
  name: string;
  status: OrganizationStatus;
  onSelect: (status: OrganizationStatus) => void;
}> = ({ name, status, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [isOpen]);

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`${STATUS_LABELS[status]}, cambiar estado de ${name}`}
        onClick={() => setIsOpen(open => !open)}
        onKeyDown={event => event.key === 'Escape' && setIsOpen(false)}
        className={`status-trigger ${STATUS_STYLES[status]}`}
      >
        <span className="status-trigger__dot" />
        {STATUS_LABELS[status]}
        <span className={`status-trigger__chevron ${isOpen ? 'rotate-180' : ''}`}>⌄</span>
      </button>

      {isOpen && (
        <div role="menu" aria-label={`Estados disponibles para ${name}`} className="status-menu">
          {(Object.keys(STATUS_LABELS) as OrganizationStatus[]).map(option => (
            <button
              key={option}
              type="button"
              role="menuitem"
              aria-current={option === status ? 'true' : undefined}
              onClick={() => {
                setIsOpen(false);
                if (option !== status) onSelect(option);
              }}
              className={`status-menu__item ${option === status ? 'status-menu__item--current' : ''}`}
            >
              <span className={`status-menu__dot ${STATUS_STYLES[option]}`} />
              {STATUS_LABELS[option]}
              {option === status && <span className="ml-auto text-[10px] text-text-tertiary">Actual</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const PlanBadgeMenu: React.FC<{
  name: string;
  plan: OrganizationPlan;
  onSelect: (plan: OrganizationPlan) => void;
}> = ({ name, plan, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const close = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [isOpen]);

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button type="button" aria-haspopup="menu" aria-expanded={isOpen} aria-label={`Plan ${PLAN_LABELS[plan]}, cambiar plan de ${name}`} onClick={() => setIsOpen(open => !open)} className="plan-trigger">
        {PLAN_LABELS[plan]} <span className={`status-trigger__chevron ${isOpen ? 'rotate-180' : ''}`}>⌄</span>
      </button>
      {isOpen && <div role="menu" aria-label={`Planes disponibles para ${name}`} className="status-menu">
        {(Object.keys(PLAN_LABELS) as OrganizationPlan[]).map(option => <button key={option} type="button" role="menuitem" onClick={() => { setIsOpen(false); if (option !== plan) onSelect(option); }} className={`status-menu__item ${option === plan ? 'status-menu__item--current' : ''}`}><span className="w-2 h-2 rounded-full bg-brand-primary" />{PLAN_LABELS[option]}<span className="ml-auto text-[10px] text-text-tertiary">{option === plan ? 'Actual' : formatCurrency(PLAN_PRICES[option])}</span></button>)}
      </div>}
    </div>
  );
};

export const OrganizationsPage: React.FC = () => {
  const { organizations, setOrganizationStatus, changeOrganizationPlan } = useMock();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrganizationStatus>('all');
  const [planFilter, setPlanFilter] = useState<'all' | OrganizationPlan>('all');
  const [pendingChange, setPendingChange] = useState<{ id: string; status: OrganizationStatus } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('Transferencia');
  const [paymentNote, setPaymentNote] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [paymentOrganizationId, setPaymentOrganizationId] = useState<string | null>(null);
  const paymentOrganization = organizations.find(item => item.id === paymentOrganizationId) ?? null;

  const target = organizations.find(item => item.id === pendingChange?.id);
  const requiresPayment = Boolean(target && pendingChange?.status === 'active' && ['suspended', 'closed'].includes(target.status));

  const filtered = useMemo(() => organizations.filter(item => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || item.name.toLowerCase().includes(query) || item.location.toLowerCase().includes(query) || item.primaryContact.name.toLowerCase().includes(query);
    return matchesSearch && (statusFilter === 'all' || item.status === statusFilter) && (planFilter === 'all' || item.plan === planFilter);
  }), [organizations, planFilter, search, statusFilter]);

  const requestStatusChange = (id: string, status: OrganizationStatus) => {
    const organization = organizations.find(item => item.id === id);
    if (!organization || organization.status === status) return;
    setPendingChange({ id, status });
    setPaymentAmount(String(organization.monthlyPrice));
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentMethod('Transferencia');
    setPaymentNote('');
  };

  const confirmStatusChange = () => {
    if (!target || !pendingChange) return;
    try {
      setOrganizationStatus(
        target.id,
        pendingChange.status,
        requiresPayment
          ? {
              amount: Number(paymentAmount),
              paidAt: new Date(`${paymentDate}T12:00:00`).toISOString(),
              method: paymentMethod,
              note: paymentNote.trim() || undefined,
            }
          : undefined
      );
      showToast('Estado actualizado', `${target.name} ahora figura como ${STATUS_LABELS[pendingChange.status].toLowerCase()}.`);
      setPendingChange(null);
    } catch (error) {
      showToast('No se pudo actualizar', error instanceof Error ? error.message : 'Revisá los datos del cambio.', 'error');
    }
  };

  const updatePlan = (id: string, plan: OrganizationPlan) => {
    try {
      const organization = organizations.find(item => item.id === id);
      changeOrganizationPlan(id, plan);
      showToast('Plan actualizado', `${organization?.name ?? 'El consultorio'} ahora tiene el plan ${PLAN_LABELS[plan]}.`);
    } catch (error) {
      showToast('No se pudo actualizar', error instanceof Error ? error.message : 'Revisá el cambio de plan.', 'error');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-strong">Cuentas y acceso</p>
          <h2 className="text-3xl font-bold text-text-primary mt-2 flex items-center gap-2"><Building2 className="w-7 h-7 text-brand-strong" /> Consultorios registrados</h2>
          <p className="text-sm text-text-secondary mt-2">Gestioná planes, vencimientos, almacenamiento y estado operativo.</p>
        </div>
        <Button variant="primary" onClick={() => setIsCreateOpen(true)} className="gap-2 self-start sm:self-auto"><Plus className="w-4 h-4" /> Nuevo consultorio</Button>
      </div>

      <section className="bg-surface border border-border-subtle rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border-subtle flex flex-col xl:flex-row gap-3 xl:items-center justify-between">
          <div className="relative w-full xl:max-w-sm">
            <label htmlFor="consultorio-search" className="sr-only">Buscar consultorio</label>
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input id="consultorio-search" value={search} onChange={event => setSearch(event.target.value)} className="form-control pl-11" placeholder="Buscar consultorio, ciudad o responsable..." />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <label className="sr-only" htmlFor="commercial-status-filter">Filtrar por estado</label>
            <select id="commercial-status-filter" value={statusFilter} onChange={event => setStatusFilter(event.target.value as 'all' | OrganizationStatus)} className="form-control sm:w-48">
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="payment_due">Pago pendiente</option>
              <option value="suspended">Suspendidos</option>
              <option value="closed">Cerrados</option>
            </select>
            <label className="sr-only" htmlFor="plan-filter">Filtrar por plan</label>
            <select id="plan-filter" value={planFilter} onChange={event => setPlanFilter(event.target.value as 'all' | OrganizationPlan)} className="form-control sm:w-40">
              <option value="all">Todos los planes</option>
              <option value="BASIC">Basic</option>
              <option value="PRO">Pro</option>
              <option value="ULTRA">Ultra</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1260px] text-left border-collapse">
            <thead className="bg-surface-subtle">
              <tr className="text-[11px] uppercase tracking-wide text-text-secondary">
                <th scope="col" className="table-cell-admin">Consultorio</th>
                <th scope="col" className="table-cell-admin">Estado</th>
                <th scope="col" className="table-cell-admin">Plan y tarifa</th>
                <th scope="col" className="table-cell-admin">Profesionales</th>
                <th scope="col" className="table-cell-admin">Pacientes</th>
                <th scope="col" className="table-cell-admin">Próximo vencimiento</th>
                <th scope="col" className="table-cell-admin">Facturación</th>
                <th scope="col" className="table-cell-admin">Almacenamiento</th>
                <th scope="col" className="table-cell-admin text-right">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle text-xs">
              {filtered.map(item => {
                const percent = storagePercent(item);
                return (
                  <tr key={item.id} className="hover:bg-surface-subtle/70 transition-colors">
                    <td className="table-cell-admin">
                      <p className="font-bold text-text-primary">{item.name}</p>
                      <p className="text-[11px] text-text-tertiary mt-0.5">{item.location}</p>
                      {item.onboardingStatus === 'invited' && <Badge variant="info" className="mt-1">Invitación pendiente</Badge>}
                    </td>
                    <td className="table-cell-admin">
                      <StatusBadgeMenu name={item.name} status={item.status} onSelect={status => requestStatusChange(item.id, status)} />
                    </td>
                    <td className="table-cell-admin"><PlanBadgeMenu name={item.name} plan={item.plan} onSelect={plan => updatePlan(item.id, plan)} /><p className="text-[11px] text-text-secondary mt-1">{formatCurrency(item.monthlyPrice)}/mes</p></td>
                    <td className="table-cell-admin font-semibold text-text-primary">{item.nutritionistsCount}<span className="block text-[11px] font-normal text-text-tertiary">{item.invitedNutritionists} invitados</span></td>
                    <td className="table-cell-admin font-semibold text-text-primary">{item.patientsCount}</td>
                    <td className="table-cell-admin"><p className="font-semibold text-text-primary">{formatShortDate(item.nextBillingDate)}</p>{item.suspensionDate && <p className="text-[11px] text-semantic-critical mt-0.5">Suspende {formatShortDate(item.suspensionDate)}</p>}</td>
                    <td className="table-cell-admin"><Button variant="secondary" size="sm" onClick={() => setPaymentOrganizationId(item.id)} className="gap-1.5"><CreditCard className="w-3.5 h-3.5" /> Registrar pago</Button></td>
                    <td className="table-cell-admin min-w-40">
                      <div className="flex justify-between text-[11px] text-text-secondary mb-1"><span>{formatStorage(item.storageUsedMb)}</span><span>{item.storageLimitMb ? formatStorage(item.storageLimitMb) : 'Flexible'}</span></div>
                      <div className="h-1.5 rounded-full bg-border-subtle overflow-hidden"><div className={`h-full rounded-full ${percent >= 90 ? 'bg-semantic-critical' : percent >= 80 ? 'bg-semantic-warning' : 'bg-brand-primary'}`} style={{ width: `${percent}%` }} /></div>
                    </td>
                    <td className="table-cell-admin text-right">
                      <Button asChild variant="ghost" size="sm"><Link to={`/admin/organizations/${item.id}`}>Ver <ChevronRight className="w-3.5 h-3.5 ml-1" /></Link></Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="p-10 text-center text-sm text-text-secondary">No encontramos consultorios con esos filtros.</div>}
      </section>

      <Dialog
        isOpen={Boolean(pendingChange)}
        onClose={() => setPendingChange(null)}
        title={requiresPayment ? 'Reactivar y registrar pago' : `Cambiar estado a ${pendingChange ? STATUS_LABELS[pendingChange.status] : ''}`}
        description={requiresPayment ? `La reactivación de ${target?.name ?? 'este consultorio'} debe registrar el cobro real de forma simultánea.` : `Confirmá el cambio de acceso para ${target?.name ?? 'el consultorio'}. La acción quedará registrada en el historial.`}
      >
        {requiresPayment && (
          <div className="space-y-4 mb-5">
            <div><label htmlFor="payment-amount" className="form-label">Importe confirmado (ARS)</label><input id="payment-amount" type="number" min="1" required value={paymentAmount} onChange={event => setPaymentAmount(event.target.value)} className="form-control" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label htmlFor="payment-date" className="form-label">Fecha real del pago</label><input id="payment-date" type="date" required value={paymentDate} onChange={event => setPaymentDate(event.target.value)} className="form-control" /></div>
              <div><label htmlFor="payment-method" className="form-label">Medio de pago</label><select id="payment-method" value={paymentMethod} onChange={event => setPaymentMethod(event.target.value)} className="form-control"><option>Transferencia</option><option>Mercado Pago</option><option>Efectivo</option><option>Otro</option></select></div>
            </div>
            <div><label htmlFor="payment-note" className="form-label">Observación opcional</label><textarea id="payment-note" rows={2} value={paymentNote} onChange={event => setPaymentNote(event.target.value)} className="form-control resize-none" /></div>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
          <Button variant="secondary" onClick={() => setPendingChange(null)}>Cancelar</Button>
          <Button variant={pendingChange?.status === 'suspended' || pendingChange?.status === 'closed' ? 'destructive' : 'primary'} onClick={confirmStatusChange} disabled={requiresPayment && (!paymentAmount || Number(paymentAmount) <= 0)}>Confirmar cambio</Button>
        </div>
      </Dialog>
      <CreateOrganizationDialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreated={organization => navigate(`/admin/organizations/${organization.id}`)} />
      <RegisterPaymentDialog organization={paymentOrganization} isOpen={Boolean(paymentOrganization)} onClose={() => setPaymentOrganizationId(null)} />
    </div>
  );
};
