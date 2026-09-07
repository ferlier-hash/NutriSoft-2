import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Building2, CalendarDays, ChevronRight, CreditCard, Database, Mail, Plus, ShieldCheck, Stethoscope, UserRound, Users } from 'lucide-react';
import { useMock } from '../../provider';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { NotFoundPage } from '../NotFoundPage';
import { InvitePersonDialog } from '../../../components/domain/InvitePersonDialog';
import { RegisterPaymentDialog } from '../../../components/domain/RegisterPaymentDialog';
import { useToast } from '../../../components/ui/Toast';
import { formatShortDate } from '../../../lib/dateUtils';
import { formatCurrency, formatStorage, PLAN_LABELS, STATUS_LABELS, storagePercent } from '../../../lib/adminCommercial';

export const OrganizationDetailPage: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { organizations, nutritionists, inviteAdditionalManager, inviteNutritionist } = useMock();
  const { showToast } = useToast();
  const [isManagerInviteOpen, setIsManagerInviteOpen] = useState(false);
  const [isProfessionalInviteOpen, setIsProfessionalInviteOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const organization = organizations.find(item => item.id === organizationId);

  if (!organization) {
    return <NotFoundPage title="Consultorio no encontrado" message="El consultorio consultado no existe o no está registrado en la plataforma." />;
  }

  const organizationNutritionists = nutritionists.filter(item => item.organizationId === organization.id);
  const usedPercent = storagePercent(organization);
  const statusVariant = organization.status === 'active' ? 'active' : organization.status === 'payment_due' ? 'pending' : organization.status === 'suspended' ? 'suspended' : 'neutral';

  const submitManagerInvitation = (name: string, email: string) => {
    try {
      const invitation = inviteAdditionalManager(organization.id, name, email);
      showToast('Invitación preparada', `${invitation.name} quedó pendiente de aceptación como responsable adicional.`);
      setIsManagerInviteOpen(false);
    } catch (error) {
      showToast('No se pudo invitar', error instanceof Error ? error.message : 'Revisá los datos ingresados.', 'error');
    }
  };

  const submitProfessionalInvitation = (name: string, email: string) => {
    try {
      const invitation = inviteNutritionist(organization.id, name, email);
      showToast('Invitación preparada', `${invitation.name} quedó pendiente de aceptación como profesional.`);
      setIsProfessionalInviteOpen(false);
    } catch (error) {
      showToast('No se pudo invitar', error instanceof Error ? error.message : 'Revisá los datos ingresados.', 'error');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1180px] mx-auto">
      <nav aria-label="Breadcrumb" className="text-xs text-text-secondary flex items-center gap-1.5 font-medium">
        <Link to="/admin" className="hover:text-text-primary">Admin</Link><ChevronRight className="w-3 h-3" />
        <Link to="/admin/organizations" className="hover:text-text-primary">Consultorios</Link><ChevronRight className="w-3 h-3" />
        <span className="text-text-primary font-semibold">{organization.name}</span>
      </nav>

      <section className="rounded-3xl border border-border-subtle bg-[linear-gradient(135deg,#E9F8F7_0%,#EEF7FB_58%,#FCF9E8_100%)] p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/80 border border-white flex items-center justify-center text-brand-strong"><Building2 className="w-7 h-7" /></div>
            <div>
              <div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-bold text-text-primary">{organization.name}</h2><Badge variant={statusVariant}>{STATUS_LABELS[organization.status]}</Badge>{organization.onboardingStatus === 'invited' && <Badge variant="info">Invitación pendiente</Badge>}</div>
              <p className="text-sm text-text-secondary mt-1">{organization.location} · Plan {PLAN_LABELS[organization.plan]}</p>
            </div>
          </div>
          <Button asChild variant="secondary"><Link to="/admin/organizations">Gestionar estado</Link></Button>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3" aria-label="Resumen del consultorio">
        {[
          { label: 'Tarifa mensual', value: formatCurrency(organization.monthlyPrice), icon: CreditCard },
          { label: 'Próximo vencimiento', value: formatShortDate(organization.nextBillingDate), icon: CalendarDays },
          { label: 'Profesionales activos', value: organization.nutritionistsCount, icon: Stethoscope },
          { label: 'Pacientes activos', value: organization.patientsCount, icon: Users },
        ].map(({ label, value, icon: Icon }) => <div key={label} className="bg-surface border border-border-subtle rounded-2xl p-4 shadow-sm"><Icon className="w-4 h-4 text-brand-strong" /><p className="text-[11px] text-text-secondary mt-3">{label}</p><p className="text-lg font-bold text-text-primary mt-1">{value}</p></div>)}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-border-subtle pb-3"><div className="flex items-center gap-2"><UserRound className="w-4 h-4 text-brand-strong" /><h3 className="font-bold text-text-primary">Responsables</h3></div><Button variant="secondary" size="sm" onClick={() => setIsManagerInviteOpen(true)} className="gap-1"><Plus className="w-3.5 h-3.5" /> Agregar responsable adicional</Button></div>
          <div className="space-y-2">
            {organization.responsibleMembers.map(member => (
              <div key={member.id} className="rounded-xl bg-surface-subtle p-3">
                <div className="flex items-start justify-between gap-3"><div><p className="font-bold text-sm text-text-primary">{member.name}</p><p className="text-[11px] text-text-secondary mt-0.5">{member.isPrimary ? 'Responsable principal · recibe comunicaciones comerciales' : 'Responsable adicional · gestión operativa'}</p></div><Badge variant={member.isPrimary ? 'active' : member.invitationStatus === 'pending' ? 'pending' : 'info'}>{member.isPrimary ? 'Principal' : member.invitationStatus === 'pending' ? 'Invitación pendiente' : 'Adicional'}</Badge></div>
                <a href={`mailto:${member.email}`} className="text-xs text-brand-strong mt-2 inline-flex items-center gap-1.5 hover:underline"><Mail className="w-3.5 h-3.5" />{member.email}</a>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border-subtle pb-3"><Database className="w-4 h-4 text-brand-strong" /><h3 className="font-bold text-text-primary">Almacenamiento compartido</h3></div>
          <div className="flex items-end justify-between gap-3"><div><p className="text-3xl font-bold text-text-primary">{usedPercent}%</p><p className="text-xs text-text-secondary mt-1">{formatStorage(organization.storageUsedMb)} utilizados</p></div><p className="text-xs font-semibold text-text-secondary">Límite: {organization.storageLimitMb ? formatStorage(organization.storageLimitMb) : 'Configurable'}</p></div>
          <div className="h-3 rounded-full bg-border-subtle overflow-hidden"><div className={`h-full rounded-full ${usedPercent >= 90 ? 'bg-semantic-critical' : usedPercent >= 80 ? 'bg-semantic-warning' : 'bg-brand-primary'}`} style={{ width: `${usedPercent}%` }} /></div>
          <p className="text-[11px] text-text-secondary">La cuota es agregada. El Super Admin no puede inspeccionar los archivos clínicos que componen este consumo.</p>
        </Card>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-3"><div className="flex items-center gap-2"><Stethoscope className="w-4 h-4 text-brand-strong" /><h3 className="font-bold text-text-primary">Profesionales del consultorio</h3><Badge variant="info">{organization.invitedNutritionists} invitados</Badge></div><Button variant="primary" size="sm" onClick={() => setIsProfessionalInviteOpen(true)} className="gap-1 self-start sm:self-auto"><Plus className="w-3.5 h-3.5" /> Agregar profesionales al consultorio</Button></div>
        {organizationNutritionists.length ? <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{organizationNutritionists.map(item => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface-subtle p-3"><div><p className="text-sm font-bold text-text-primary">{item.name}</p><p className="text-[11px] text-text-secondary">{item.email} · {item.assignedPatientsCount} pacientes asignados</p></div><Button asChild variant="secondary" size="sm"><Link to={`/admin/nutritionists/${item.id}`}>Perfil</Link></Button></div>)}</div> : <p className="text-sm text-text-secondary">No hay profesionales activos.</p>}
        {organization.professionalInvitations.length > 0 && <div><p className="text-[11px] font-bold uppercase tracking-wide text-text-tertiary mb-2">Invitaciones pendientes</p><div className="grid grid-cols-1 md:grid-cols-2 gap-2">{organization.professionalInvitations.filter(invitation => invitation.invitationStatus === 'pending').map(invitation => <div key={invitation.id} className="rounded-xl border border-[#EBD891] bg-[#FFF8DD] p-3"><p className="text-xs font-bold text-text-primary">{invitation.name}</p><p className="text-[11px] text-text-secondary mt-0.5">{invitation.email}</p></div>)}</div></div>}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-border-subtle pb-3"><div className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-brand-strong" /><h3 className="font-bold text-text-primary">Facturación y pagos</h3></div><Button variant="primary" size="sm" onClick={() => setIsPaymentOpen(true)}>Registrar pago</Button></div>
          {organization.payments.length ? <div className="space-y-3">{organization.payments.map(payment => <div key={payment.id} className="flex items-center justify-between gap-3"><div><p className="text-sm font-bold text-text-primary">{formatCurrency(payment.amount)}</p><p className="text-[11px] text-text-secondary">{formatShortDate(payment.paidAt)} · {payment.method} · Plan {PLAN_LABELS[payment.plan]}</p></div><Badge variant="active">Confirmado</Badge></div>)}</div> : <p className="text-sm text-text-secondary">Todavía no hay pagos confirmados.</p>}
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border-subtle pb-3"><ShieldCheck className="w-4 h-4 text-brand-strong" /><h3 className="font-bold text-text-primary">Historial de estados</h3></div>
          <div className="space-y-3">{organization.statusHistory.map(event => <div key={event.id} className="flex gap-3"><div className="w-2 h-2 rounded-full bg-brand-primary mt-1.5 shrink-0" /><div><p className="text-xs font-bold text-text-primary">{STATUS_LABELS[event.status]}</p><p className="text-[11px] text-text-secondary mt-0.5">{event.note} · {formatShortDate(event.occurredAt)}</p></div></div>)}</div>
        </Card>
      </div>

      <div className="rounded-2xl border border-[#C6D4F8] bg-[#F4F6FE] p-4 flex gap-3 text-[#2D3F99]"><ShieldCheck className="w-5 h-5 shrink-0" /><p className="text-xs leading-relaxed"><strong>Frontera de privacidad:</strong> esta ficha contiene sólo información administrativa, comercial y agregada. Los historiales clínicos siguen accesibles únicamente para profesionales autorizados.</p></div>

      <InvitePersonDialog isOpen={isManagerInviteOpen} onClose={() => setIsManagerInviteOpen(false)} title="Agregar responsable adicional" description={`Prepará una invitación para sumar gestión operativa a ${organization.name}.`} nameLabel="Nombre y apellido" submitLabel="Preparar invitación" onSubmit={submitManagerInvitation} />
      <InvitePersonDialog isOpen={isProfessionalInviteOpen} onClose={() => setIsProfessionalInviteOpen(false)} title="Agregar profesional al consultorio" description={`Invitá un nutricionista para vincularlo formalmente con ${organization.name}.`} nameLabel="Nombre completo" submitLabel="Preparar invitación" onSubmit={submitProfessionalInvitation} />
      <RegisterPaymentDialog organization={organization} isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} />
    </div>
  );
};
