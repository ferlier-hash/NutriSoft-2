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
  const { patients, alerts, resolveAlert, addPatient, createCheckInAssignment, checkInResponses, checkInAssignments } = useMock();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.id || 'pat-1');
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [isSendCheckInOpen, setIsSendCheckInOpen] = useState(false);
  const [selectedForCheckIn, setSelectedForCheckIn] = useState<string>(patients[0]?.id || 'pat-1');

  const selectedPatient = patients.find(p => p.id === selectedPatientId) || patients[0];
  const unresolvedAlerts = alerts.filter(a => a.status === 'unresolved').slice(0, 3);

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
      const created = addPatient({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || '',
        objective: data.objective || 'Plan personalizado',
        currentPlan: 'Plan inicio 12 semanas',
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
          <div className="flex items-center justify-between pb-2 border-b border-[#E2E9EC]">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-[#151B22]">Bandeja de atención</h3>
              <Badge variant="high">{unresolvedAlerts.length}</Badge>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/professional/inbox" className="text-xs text-[#357984] font-semibold flex items-center gap-1">
                <span>Ver todas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>

          <div className="space-y-3">
            {unresolvedAlerts.length === 0 ? (
              <p className="text-xs text-[#66727D] py-4 text-center">No hay alertas pendientes en la bandeja.</p>
            ) : (
              unresolvedAlerts.map(alert => (
                <PriorityInboxCard
                  key={alert.id}
                  alert={alert}
                  onSelectPatient={id => navigate(`/professional/patients/${id}`)}
                  onResolveAlert={alertId => {
                    resolveAlert(alertId);
                    showToast('Alerta resuelta', 'Se ha marcado la atención como completada');
                  }}
                />
              ))
            )}
          </div>
        </Card>

        {/* Acciones Rápidas */}
        <Card className="space-y-4">
          <h3 className="font-bold text-base text-[#151B22] pb-2 border-b border-[#E2E9EC]">
            Acciones rápidas
          </h3>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setIsAddPatientOpen(true)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-[#E2E9EC] bg-[#FFFFFF] hover:bg-[#F2F7F8] hover:border-[#CCD9DE] transition-all text-left cursor-pointer group outline-none focus-visible:ring-2 focus-visible:ring-[#357984]"
            >
              <div className="w-10 h-10 rounded-xl bg-[#EDF8F7] text-[#357984] flex items-center justify-center group-hover:scale-105 transition-transform">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-xs text-[#151B22]">Nuevo paciente</p>
                <p className="text-[11px] text-[#66727D]">Agregar un paciente al consultorio</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIsSendCheckInOpen(true)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-[#E2E9EC] bg-[#FFFFFF] hover:bg-[#F2F7F8] hover:border-[#CCD9DE] transition-all text-left cursor-pointer group outline-none focus-visible:ring-2 focus-visible:ring-[#357984]"
            >
              <div className="w-10 h-10 rounded-xl bg-[#EAEFFC] text-[#2D3F99] flex items-center justify-center group-hover:scale-105 transition-transform">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-xs text-[#151B22]">Enviar check-in</p>
                <p className="text-[11px] text-[#66727D]">Solicitar check-in a mis pacientes</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/professional/patients')}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-[#E2E9EC] bg-[#FFFFFF] hover:bg-[#F2F7F8] hover:border-[#CCD9DE] transition-all text-left cursor-pointer group outline-none focus-visible:ring-2 focus-visible:ring-[#357984]"
            >
              <div className="w-10 h-10 rounded-xl bg-[#EDF8F7] text-[#357984] flex items-center justify-center group-hover:scale-105 transition-transform">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-xs text-[#151B22]">Ver pacientes</p>
                <p className="text-[11px] text-[#66727D]">Buscar y abrir fichas clínicas</p>
              </div>
            </button>
          </div>
        </Card>
      </div>

      {/* Tabla Mis Pacientes con Datos Derivados Realmente del Mock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E2E9EC]">
            <h3 className="font-bold text-base text-[#151B22]">Mis pacientes</h3>
            <Button asChild variant="ghost" size="sm">
              <Link to="/professional/patients" className="text-xs text-[#357984] font-semibold">
                Ver todos mis pacientes →
              </Link>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E9EC] text-xs text-[#66727D] font-medium">
                  <th scope="col" className="py-2.5 px-3">Paciente</th>
                  <th scope="col" className="py-2.5 px-3">Último check-in</th>
                  <th scope="col" className="py-2.5 px-3">Energía</th>
                  <th scope="col" className="py-2.5 px-3">Adherencia</th>
                  <th scope="col" className="py-2.5 px-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E9EC] text-xs">
                {patients.map(p => {
                  const isSelected = p.id === selectedPatientId;

                  // Derivar último check-in y scores reales
                  const pResponses = checkInResponses.filter(r => r.patientId === p.id);
                  const lastResp = pResponses.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
                  
                  const pPendingAssign = checkInAssignments.find(a => a.patientId === p.id && a.status === 'pending');
                  const pAlert = alerts.find(a => a.patientId === p.id && a.status === 'unresolved');

                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedPatientId(p.id)}
                      onKeyDown={e => e.key === 'Enter' && setSelectedPatientId(p.id)}
                      tabIndex={0}
                      role="button"
                      className={`cursor-pointer transition-colors outline-none focus-visible:bg-[#F2F7F8] ${
                        isSelected ? 'bg-[#EDF8F7] font-semibold' : 'hover:bg-[#F2F7F8]'
                      }`}
                    >
                      <td className="py-3 px-3 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#357984] text-white flex items-center justify-center font-bold text-[10px]">
                          {p.firstName[0]}
                          {p.lastName[0]}
                        </div>
                        <span className="text-[#151B22]">
                          {p.firstName} {p.lastName}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#66727D]">
                        {lastResp ? formatRelativeTime(lastResp.submittedAt) : 'Sin check-in'}
                      </td>
                      <td className="py-3 px-3 text-[#151B22]">
                        {lastResp ? `${lastResp.energyScore}/5` : 'Sin datos'}
                      </td>
                      <td className="py-3 px-3 text-[#151B22]">
                        {lastResp ? `${lastResp.adherenceScore}/5` : 'Sin datos'}
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant={pAlert ? 'high' : pPendingAssign ? 'pending' : 'active'}>
                          {pAlert ? 'Atención' : pPendingAssign ? 'Pendiente' : 'Estable'}
                        </Badge>
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
            <div className="flex items-center gap-3 pb-3 border-b border-[#BDE9EA]">
              <div className="w-12 h-12 rounded-full bg-[#55AEB8] text-[#151B22] flex items-center justify-center font-bold text-base shadow-sm">
                {selectedPatient.firstName[0]}
                {selectedPatient.lastName[0]}
              </div>
              <div>
                <h4 className="font-bold text-base text-[#151B22]">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </h4>
                <p className="text-xs text-[#66727D]">
                  {selectedPatient.age > 0 ? `${selectedPatient.age} años` : ''} {selectedPatient.city ? `• ${selectedPatient.city}` : ''}
                </p>
                <Badge variant={selectedPatient.status === 'active' ? 'active' : 'suspended'} className="mt-1">
                  {selectedPatient.status === 'active' ? 'Paciente activo' : 'Archivado'}
                </Badge>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[#66727D] block">Objetivo nutricional:</span>
                <span className="font-semibold text-[#151B22]">{selectedPatient.objective}</span>
              </div>

              <div>
                <span className="text-[#66727D] block">Plan actual:</span>
                <span className="font-semibold text-[#357984]">{selectedPatient.currentPlan}</span>
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
        description="Ingresa los datos básicos para dar de alta al paciente en el consultorio."
      >
        <form onSubmit={handleSubmit(onAddPatientSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="new-firstname" className="block text-xs font-medium text-[#151B22] mb-1">
                Nombre *
              </label>
              <input
                id="new-firstname"
                type="text"
                {...register('firstName')}
                aria-invalid={!!errors.firstName}
                aria-describedby={errors.firstName ? 'firstname-error' : undefined}
                placeholder="Ej. Ana"
                className="w-full px-3 py-2 text-xs bg-[#F2F7F8] border border-[#E2E9EC] rounded-xl focus:ring-2 focus:ring-[#357984] text-[#151B22]"
              />
              {errors.firstName && (
                <p id="firstname-error" className="text-xs text-[#902A24] font-semibold mt-1">
                  {errors.firstName.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="new-lastname" className="block text-xs font-medium text-[#151B22] mb-1">
                Apellido *
              </label>
              <input
                id="new-lastname"
                type="text"
                {...register('lastName')}
                aria-invalid={!!errors.lastName}
                aria-describedby={errors.lastName ? 'lastname-error' : undefined}
                placeholder="Ej. Martínez"
                className="w-full px-3 py-2 text-xs bg-[#F2F7F8] border border-[#E2E9EC] rounded-xl focus:ring-2 focus:ring-[#357984] text-[#151B22]"
              />
              {errors.lastName && (
                <p id="lastname-error" className="text-xs text-[#902A24] font-semibold mt-1">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="new-email" className="block text-xs font-medium text-[#151B22] mb-1">
              Correo electrónico *
            </label>
            <input
              id="new-email"
              type="email"
              {...register('email')}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              placeholder="ana.martinez@example.com"
              className="w-full px-3 py-2 text-xs bg-[#F2F7F8] border border-[#E2E9EC] rounded-xl focus:ring-2 focus:ring-[#357984] text-[#151B22]"
            />
            {errors.email && (
              <p id="email-error" className="text-xs text-[#902A24] font-semibold mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="new-phone" className="block text-xs font-medium text-[#151B22] mb-1">
              Teléfono (opcional)
            </label>
            <input
              id="new-phone"
              type="tel"
              {...register('phone')}
              placeholder="+52 55 1234 5678"
              className="w-full px-3 py-2 text-xs bg-[#F2F7F8] border border-[#E2E9EC] rounded-xl focus:ring-2 focus:ring-[#357984] text-[#151B22]"
            />
          </div>

          <div>
            <label htmlFor="new-objective" className="block text-xs font-medium text-[#151B22] mb-1">
              Objetivo nutricional
            </label>
            <input
              id="new-objective"
              type="text"
              {...register('objective')}
              placeholder="Ej. Reeducación alimentaria y energía"
              className="w-full px-3 py-2 text-xs bg-[#F2F7F8] border border-[#E2E9EC] rounded-xl focus:ring-2 focus:ring-[#357984] text-[#151B22]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E9EC]">
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
        description="Selecciona el paciente al que deseas asignar un reporte de seguimiento."
      >
        <form onSubmit={handleSendCheckInSubmit} className="space-y-4">
          <div>
            <label htmlFor="select-patient-checkin" className="block text-xs font-medium text-[#151B22] mb-1">
              Seleccionar paciente *
            </label>
            <select
              id="select-patient-checkin"
              value={selectedForCheckIn}
              onChange={e => setSelectedForCheckIn(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#F2F7F8] border border-[#E2E9EC] rounded-xl focus:ring-2 focus:ring-[#357984] text-[#151B22]"
            >
              {patients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName} ({p.email})
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs text-[#66727D]">
            Se habilitará la asignación para que el paciente la complete desde su portal.
          </p>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E9EC]">
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
