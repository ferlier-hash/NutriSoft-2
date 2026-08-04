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
import { UserPlus, Send, ArrowRight, UserCheck } from 'lucide-react';

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
    resolveAlert,
    addPatient,
    createCheckInAssignment,
    checkInResponses,
    professionalAssignments,
    currentDemoNutritionist,
  } = useMock();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [selectedPatientId, setSelectedPatientId] = useState<string>(professionalPatients[0]?.id || '');
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [isSendCheckInOpen, setIsSendCheckInOpen] = useState(false);
  const [selectedForCheckIn, setSelectedForCheckIn] = useState<string>(professionalPatients[0]?.id || '');

  const selectedPatient = professionalPatients.find(p => p.id === selectedPatientId) || professionalPatients[0];
  const unresolvedAlerts = professionalAlerts.filter(a => a.status === 'unresolved').slice(0, 3);

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
      showToast('Paciente creado exitosamente', `Ficha creada para ${created.firstName} ${created.lastName}`);
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Sección Superior: Bandeja de Atención + Acciones Rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-text-primary">Bandeja de atención</h3>
              <Badge variant="high">{unresolvedAlerts.length}</Badge>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/professional/inbox" className="text-xs text-brand-strong font-semibold flex items-center gap-1">
                <span>Ver todas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>

          <div className="space-y-3">
            {unresolvedAlerts.length === 0 ? (
              <p className="text-xs text-text-secondary py-4 text-center">
                No hay alertas pendientes en tu bandeja ({currentDemoNutritionist?.name || 'Profesional'}).
              </p>
            ) : (
              unresolvedAlerts.map(alert => (
                <PriorityInboxCard
                  key={alert.id}
                  alert={alert}
                  onSelectPatient={id => navigate(`/professional/patients/${id}`)}
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
                <p className="font-semibold text-xs text-text-primary">Nuevo paciente</p>
                <p className="text-[11px] text-text-secondary">Agregar paciente a mi consultorio</p>
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
                          className="text-xs"
                        >
                          Seleccionar
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
        title="Agregar nuevo paciente"
        description="Ingresa los datos básicos para dar de alta al paciente en tu consultorio."
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
              Guardar paciente
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
