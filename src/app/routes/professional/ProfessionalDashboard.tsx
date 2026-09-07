import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMock } from '../../provider';
import { useToast } from '../../../components/ui/Toast';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { PriorityInboxCard } from '../../../components/domain/PriorityInboxCard';
import { formatRelativeTime } from '../../../lib/dateUtils';
import { UserPlus, Send, ArrowRight, UserCheck, CheckCircle2, Circle, CalendarDays, ClipboardList, CircleUserRound, ClipboardCheck } from 'lucide-react';

const newPatientSchema = z.object({
  firstName: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(50, 'Máximo 50 caracteres'),
  lastName: z.string().trim().min(2, 'El apellido debe tener al menos 2 caracteres').max(50, 'Máximo 50 caracteres'),
  email: z.string().trim().email('Ingresa un correo electrónico válido'),
  phone: z.string().trim().max(30, 'Máximo 30 caracteres').optional(),
  objective: z.string().trim().max(150, 'Máximo 150 caracteres').optional(),
});

type NewPatientFormData = z.infer<typeof newPatientSchema>;

export const ProfessionalDashboard: React.FC = () => {
  // SCOPE-01: Usar selectores del profesional actual
  const {
    professionalPatients,
    professionalAlerts,
    acknowledgeAlert,
    resolveAlert,
    addPatient,
    createCheckInAssignment,
    checkInResponses,
    professionalAssignments,
    professionalMealPlans,
    currentDemoNutritionist,
    organizations,
  } = useMock();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const organization = organizations.find(item => item.id === currentDemoNutritionist?.organizationId);
  const branding = organization?.plan === 'CUSTOM' ? organization.branding : undefined;

  const [selectedPatientId, setSelectedPatientId] = useState<string>(professionalPatients[0]?.id || '');
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [isSendCheckInOpen, setIsSendCheckInOpen] = useState(false);
  const [selectedForCheckIn, setSelectedForCheckIn] = useState<string>(professionalPatients[0]?.id || '');

  const selectedPatient = professionalPatients.find(p => p.id === selectedPatientId) || professionalPatients[0];
  const activeAlerts = professionalAlerts.filter(a => a.status !== 'resolved').slice(0, 3);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewPatientFormData>({
    resolver: zodResolver(newPatientSchema),
  });

  const onAddPatientSubmit = (data: NewPatientFormData) => {
    try {
      // DATA-01: Sin inventar datos
      const created = addPatient({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || undefined,
        objective: data.objective || undefined,
      });

      setIsAddPatientOpen(false);
      reset();
      showToast('Invitación preparada', `En modo real enviaremos el acceso a ${created.email}.`);
      navigate(`/professional/patients/${created.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear paciente';
      showToast('Error', msg, 'error');
    }
  };

  const handleSendCheckInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForCheckIn) {
      showToast('Error', 'Selecciona un paciente válido para asignar check-in', 'error');
      return;
    }
    try {
      createCheckInAssignment(selectedForCheckIn);
      setIsSendCheckInOpen(false);
      showToast('Check-in asignado', 'El paciente ya puede responderlo desde su portal');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al asignar check-in';
      showToast('Error', msg, 'error');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {branding?.professionalHeaderImageDataUrl && (
        <section aria-label="Cabecera del portal Profesional" className="relative h-36 sm:h-48 overflow-hidden rounded-2xl border border-border-subtle bg-brand-soft">
          <img src={branding.professionalHeaderImageDataUrl} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 text-white">
            <p className="text-lg sm:text-xl font-bold break-words">{branding.displayName}</p>
            {branding.tagline && <p className="mt-1 text-sm break-words">{branding.tagline}</p>}
          </div>
        </section>
      )}
      <Card highlighted className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-brand-strong">Tu puesta en marcha</p>
            <h2 className="text-lg font-bold text-text-primary mt-1">Prepará tu espacio profesional</h2>
            <p className="text-xs text-text-secondary mt-1">Esta guía no bloquea ninguna función. Podés completarla a tu ritmo.</p>
          </div>
          <Badge variant="info">{[
            Boolean(currentDemoNutritionist?.firstName && currentDemoNutritionist?.lastName && currentDemoNutritionist?.email),
            professionalPatients.length > 0,
            professionalMealPlans.length > 0,
          ].filter(Boolean).length} de 5</Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2">
          {[
            { label: 'Completar perfil', done: Boolean(currentDemoNutritionist?.firstName && currentDemoNutritionist?.lastName && currentDemoNutritionist?.email), path: '/professional/profile', icon: CircleUserRound },
            { label: 'Configurar horarios', done: false, path: '/professional/settings', icon: CalendarDays },
            { label: 'Invitar paciente', done: professionalPatients.length > 0, path: '/professional/patients', icon: UserPlus },
            { label: 'Crear primer plan', done: professionalMealPlans.length > 0, path: '/professional/meal-plans', icon: ClipboardList },
            { label: 'Compartir reservas', done: false, icon: Send },
          ].map(step => {
            const StepIcon = step.icon;
            const content = <><div className="flex items-center justify-between gap-2"><StepIcon className="w-4 h-4 text-brand-strong" />{step.done ? <CheckCircle2 className="w-4 h-4 text-semantic-success" /> : <Circle className="w-4 h-4 text-text-tertiary" />}</div><p className="text-xs font-semibold text-text-primary mt-3">{step.label}</p><p className="text-[10px] text-text-tertiary mt-1">{step.done ? 'Completado' : step.path ? 'Continuar' : 'Próximamente'}</p></>;
            return step.path ? <Link key={step.label} to={step.path} className="rounded-xl border border-border-subtle bg-surface p-3 hover:border-border-hover hover:bg-surface-subtle transition-colors focus-visible:ring-2 focus-visible:ring-brand-strong">{content}</Link> : <div key={step.label} className="rounded-xl border border-border-subtle bg-surface-subtle p-3 opacity-70">{content}</div>;
          })}
        </div>
      </Card>

      {/* Sección Superior: Bandeja de Atención + Acciones Rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-text-primary">Bandeja de atención</h3>
              <Badge variant="high">{activeAlerts.length}</Badge>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/professional/inbox" className="text-xs text-brand-strong font-semibold flex items-center gap-1">
                <span>Ver todas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>

          <div className="space-y-3">
            {activeAlerts.length === 0 ? (
              <p className="text-xs text-text-secondary py-4 text-center">
                No hay alertas pendientes en tu bandeja ({currentDemoNutritionist?.name || 'Profesional'}).
              </p>
            ) : (
              activeAlerts.map(alert => (
                <PriorityInboxCard
                  key={alert.id}
                  alert={alert}
                  onSelectPatient={id => navigate(`/professional/patients/${id}`)}
                  onAcknowledgeAlert={alertId => {
                    try {
                      acknowledgeAlert(alertId);
                      showToast('Alerta en revisión', 'La alerta sigue pendiente hasta resolverla.');
                    } catch (err: unknown) {
                      const msg = err instanceof Error ? err.message : 'Error al revisar alerta';
                      showToast('Error', msg, 'error');
                    }
                  }}
                  onResolveAlert={alertId => {
                    try {
                      resolveAlert(alertId);
                      showToast('Alerta resuelta', 'Se ha marcado la atención como completada');
                    } catch (err: unknown) {
                      const msg = err instanceof Error ? err.message : 'Error al resolver alerta';
                      showToast('Error', msg, 'error');
                    }
                  }}
                />
              ))
            )}
          </div>
        </Card>

        {/* Acciones Rápidas */}
        <Card className="space-y-4">
          <h3 className="font-bold text-base text-text-primary pb-2 border-b border-border-subtle">
            Acciones rápidas
          </h3>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setIsAddPatientOpen(true)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border-subtle bg-surface hover:bg-surface-subtle hover:border-border-hover transition-all text-left cursor-pointer group outline-none focus-visible:ring-2 focus-visible:ring-brand-strong"
            >
              <div className="w-10 h-10 rounded-xl bg-surface-tinted text-brand-strong flex items-center justify-center group-hover:scale-105 transition-transform">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-xs text-text-primary">Invitar paciente</p>
                <p className="text-[11px] text-text-secondary">Generar acceso pendiente por email</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIsSendCheckInOpen(true)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border-subtle bg-surface hover:bg-surface-subtle hover:border-border-hover transition-all text-left cursor-pointer group outline-none focus-visible:ring-2 focus-visible:ring-brand-strong"
            >
              <div className="w-10 h-10 rounded-xl bg-[#EAEFFC] text-[#2D3F99] flex items-center justify-center group-hover:scale-105 transition-transform">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-xs text-text-primary">Enviar check-in</p>
                <p className="text-[11px] text-text-secondary">Solicitar check-in a mis pacientes</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/professional/patients')}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border-subtle bg-surface hover:bg-surface-subtle hover:border-border-hover transition-all text-left cursor-pointer group outline-none focus-visible:ring-2 focus-visible:ring-brand-strong"
            >
              <div className="w-10 h-10 rounded-xl bg-surface-tinted text-brand-strong flex items-center justify-center group-hover:scale-105 transition-transform">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-xs text-text-primary">Ver mis pacientes</p>
                <p className="text-[11px] text-text-secondary">Buscar y abrir fichas clínicas</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/professional/checkins')}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border-subtle bg-surface hover:bg-surface-subtle hover:border-border-hover transition-all text-left cursor-pointer group outline-none focus-visible:ring-2 focus-visible:ring-brand-strong"
            >
              <div className="w-10 h-10 rounded-xl bg-surface-tinted text-brand-strong flex items-center justify-center group-hover:scale-105 transition-transform">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-xs text-text-primary">Revisar check-ins</p>
                <p className="text-[11px] text-text-secondary">Priorizar respuestas y abrir historiales</p>
              </div>
            </button>
          </div>
        </Card>
      </div>

      {/* Tabla Mis Pacientes Aislados (SCOPE-01 & A11Y-01) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
            <h3 className="font-bold text-base text-text-primary">
              Mis pacientes ({professionalPatients.length})
            </h3>
            <Button asChild variant="ghost" size="sm">
              <Link to="/professional/patients" className="text-xs text-brand-strong font-semibold">
                Ver todos mis pacientes →
              </Link>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-subtle text-xs text-text-secondary font-medium">
                  <th scope="col" className="py-2.5 px-3">Paciente</th>
                  <th scope="col" className="py-2.5 px-3">Último check-in</th>
                  <th scope="col" className="py-2.5 px-3">Energía</th>
                  <th scope="col" className="py-2.5 px-3">Adherencia</th>
                  <th scope="col" className="py-2.5 px-3">Estado</th>
                  <th scope="col" className="py-2.5 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-xs">
                {professionalPatients.map(p => {
                  const isSelected = p.id === (selectedPatient?.id || '');

                  const pResponses = checkInResponses.filter(r => r.patientId === p.id);
                  const lastResp = pResponses.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
                  
                  const pPendingAssign = professionalAssignments.find(a => a.patientId === p.id && a.status === 'pending');
                  const pExpiredAssign = professionalAssignments.find(a => a.patientId === p.id && a.status === 'expired');
                  const pAlert = professionalAlerts.find(a => a.patientId === p.id && a.status === 'unresolved');

                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-surface-tinted font-semibold' : 'hover:bg-surface-subtle'
                      }`}
                    >
                      <td className="py-3 px-3 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-brand-strong text-white flex items-center justify-center font-bold text-[10px]">
                          {p.firstName[0]}
                          {p.lastName[0]}
                        </div>
                        <span className="text-text-primary">
                          {p.firstName} {p.lastName}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-text-secondary">
                        {lastResp ? formatRelativeTime(lastResp.submittedAt) : 'Sin check-in'}
                      </td>
                      <td className="py-3 px-3 text-text-primary">
                        {lastResp ? `${lastResp.energyScore}/5` : 'Sin datos'}
                      </td>
                      <td className="py-3 px-3 text-text-primary">
                        {lastResp ? `${lastResp.adherenceScore}/5` : 'Sin datos'}
                      </td>
                      <td className="py-3 px-3">
                        {/* STATUS-01: Mapeo de estados exacto */}
                        <Badge
                          variant={
                            pAlert
                              ? 'high'
                              : pExpiredAssign
                              ? 'high'
                              : pPendingAssign
                              ? 'pending'
                              : 'active'
                          }
                        >
                          {pAlert
                            ? 'Atención'
                            : pExpiredAssign
                            ? 'Vencido'
                            : pPendingAssign
                            ? 'Pendiente'
                            : 'Estable'}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPatientId(p.id)}
                          aria-pressed={selectedPatientId === p.id}
                          className="text-xs"
                        >
                          Ver resumen
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {selectedPatient && (
          <Card className="space-y-4" highlighted>
            <div className="flex items-center gap-3 pb-3 border-b border-border-subtle">
              <div className="w-12 h-12 rounded-full bg-brand-primary text-text-primary flex items-center justify-center font-bold text-base shadow-xs">
                {selectedPatient.firstName[0]}
                {selectedPatient.lastName[0]}
              </div>
              <div>
                <h4 className="font-bold text-base text-text-primary">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </h4>
                <p className="text-xs text-text-secondary">
                  {selectedPatient.age ? `${selectedPatient.age} años ` : ''}{selectedPatient.city ? `• ${selectedPatient.city}` : ''}
                </p>
                <Badge variant={selectedPatient.status === 'active' ? 'active' : 'suspended'} className="mt-1">
                  {selectedPatient.status === 'active' ? 'Paciente activo' : 'Archivado'}
                </Badge>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-text-secondary block">Objetivo nutricional:</span>
                <span className="font-semibold text-text-primary">{selectedPatient.objective}</span>
              </div>

              <div>
                <span className="text-text-secondary block">Plan actual:</span>
                <span className="font-semibold text-brand-strong">{selectedPatient.currentPlan || 'Sin plan asignado'}</span>
              </div>
            </div>

            <Button
              variant="primary"
              className="w-full mt-4"
              onClick={() => navigate(`/professional/patients/${selectedPatient.id}`)}
            >
              Ver ficha completa
            </Button>
          </Card>
        )}
      </div>

      {/* Dialog Accesible Radix UI: Nuevo Paciente */}
      <Dialog
        isOpen={isAddPatientOpen}
        onClose={() => setIsAddPatientOpen(false)}
        title="Invitar paciente"
        description="La invitación quedará pendiente por 7 días. El email real todavía no está conectado."
      >
        <form onSubmit={handleSubmit(onAddPatientSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="new-firstname" className="block text-xs font-medium text-text-primary mb-1">
                Nombre *
              </label>
              <input
                id="new-firstname"
                type="text"
                {...register('firstName')}
                aria-invalid={!!errors.firstName}
                aria-describedby={errors.firstName ? 'firstname-error' : undefined}
                placeholder="Ej. Ana"
                className="w-full px-3 py-2 text-xs bg-surface-subtle border border-border-subtle rounded-xl focus:ring-2 focus:ring-brand-strong text-text-primary"
              />
              {errors.firstName && (
                <p id="firstname-error" className="text-xs text-[#902A24] font-semibold mt-1">
                  {errors.firstName.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="new-lastname" className="block text-xs font-medium text-text-primary mb-1">
                Apellido *
              </label>
              <input
                id="new-lastname"
                type="text"
                {...register('lastName')}
                aria-invalid={!!errors.lastName}
                aria-describedby={errors.lastName ? 'lastname-error' : undefined}
                placeholder="Ej. Martínez"
                className="w-full px-3 py-2 text-xs bg-surface-subtle border border-border-subtle rounded-xl focus:ring-2 focus:ring-brand-strong text-text-primary"
              />
              {errors.lastName && (
                <p id="lastname-error" className="text-xs text-[#902A24] font-semibold mt-1">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="new-email" className="block text-xs font-medium text-text-primary mb-1">
              Correo electrónico *
            </label>
            <input
              id="new-email"
              type="email"
              {...register('email')}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              placeholder="ana.martinez@example.com"
              className="w-full px-3 py-2 text-xs bg-surface-subtle border border-border-subtle rounded-xl focus:ring-2 focus:ring-brand-strong text-text-primary"
            />
            {errors.email && (
              <p id="email-error" className="text-xs text-[#902A24] font-semibold mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="new-phone" className="block text-xs font-medium text-text-primary mb-1">
              Teléfono (opcional)
            </label>
            <input
              id="new-phone"
              type="tel"
              {...register('phone')}
              placeholder="+52 55 1234 5678"
              className="w-full px-3 py-2 text-xs bg-surface-subtle border border-border-subtle rounded-xl focus:ring-2 focus:ring-brand-strong text-text-primary"
            />
          </div>

          <div>
            <label htmlFor="new-objective" className="block text-xs font-medium text-text-primary mb-1">
              Objetivo nutricional (opcional)
            </label>
            <input
              id="new-objective"
              type="text"
              {...register('objective')}
              placeholder="Ej. Reeducación alimentaria y energía"
              className="w-full px-3 py-2 text-xs bg-surface-subtle border border-border-subtle rounded-xl focus:ring-2 focus:ring-brand-strong text-text-primary"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border-subtle">
            <Button variant="secondary" type="button" onClick={() => setIsAddPatientOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Generar invitación
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Dialog Accesible Radix UI: Enviar Check-in */}
      <Dialog
        isOpen={isSendCheckInOpen}
        onClose={() => setIsSendCheckInOpen(false)}
        title="Enviar check-in a paciente"
        description="Selecciona el paciente de tu consultorio al que deseas asignar un reporte de seguimiento."
      >
        <form onSubmit={handleSendCheckInSubmit} className="space-y-4">
          <div>
            <label htmlFor="select-patient-checkin" className="block text-xs font-medium text-text-primary mb-1">
              Seleccionar paciente *
            </label>
            <select
              id="select-patient-checkin"
              value={selectedForCheckIn}
              onChange={e => setSelectedForCheckIn(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-surface-subtle border border-border-subtle rounded-xl focus:ring-2 focus:ring-brand-strong text-text-primary"
            >
              {professionalPatients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName} ({p.email})
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs text-text-secondary">
            Se habilitará la asignación para que el paciente la complete desde su portal.
          </p>

          <div className="flex justify-end gap-2 pt-2 border-t border-border-subtle">
            <Button variant="secondary" type="button" onClick={() => setIsSendCheckInOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Asignar check-in
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
