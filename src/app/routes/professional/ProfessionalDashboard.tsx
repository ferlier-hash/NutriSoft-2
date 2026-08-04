import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { UserPlus, Send, ArrowRight, UserCheck } from 'lucide-react';

const newPatientSchema = z.object({
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  email: z.string().email('Ingresa un correo electrónico válido'),
  phone: z.string().optional(),
  objective: z.string().optional(),
});

type NewPatientFormData = z.infer<typeof newPatientSchema>;

export const ProfessionalDashboard: React.FC = () => {
  const { patients, alerts, resolveAlert, addPatient, createCheckInAssignment } = useMock();
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
    const created = addPatient({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone || '+52 55 0000 0000',
      age: 30,
      city: 'Ciudad de México',
      status: 'active',
      objective: data.objective || 'Plan personalizado',
      currentPlan: 'Plan inicio 12 semanas',
    });

    setIsAddPatientOpen(false);
    reset();
    showToast('Paciente creado exitosamente', `Ficha creada para ${created.firstName} ${created.lastName}`);
    navigate(`/professional/patients/${created.id}`);
  };

  const handleSendCheckInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCheckInAssignment(selectedForCheckIn);
    setIsSendCheckInOpen(false);
    showToast('Check-in asignado', 'El paciente ya puede responderlo desde su portal');
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
            <button
              type="button"
              onClick={() => navigate('/professional/inbox')}
              className="text-xs text-[#357984] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Ver todas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {unresolvedAlerts.map(alert => (
              <PriorityInboxCard
                key={alert.id}
                alert={alert}
                onSelectPatient={id => navigate(`/professional/patients/${id}`)}
                onResolveAlert={alertId => {
                  resolveAlert(alertId);
                  showToast('Alerta resuelta', 'Se ha marcado la atención como completada');
                }}
              />
            ))}
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
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-[#E2E9EC] bg-[#FFFFFF] hover:bg-[#F2F7F8] hover:border-[#CCD9DE] transition-all text-left cursor-pointer group"
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
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-[#E2E9EC] bg-[#FFFFFF] hover:bg-[#F2F7F8] hover:border-[#CCD9DE] transition-all text-left cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#EAEFFC] text-[#5267C7] flex items-center justify-center group-hover:scale-105 transition-transform">
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
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-[#E2E9EC] bg-[#FFFFFF] hover:bg-[#F2F7F8] hover:border-[#CCD9DE] transition-all text-left cursor-pointer group"
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

      {/* Tabla Mis Pacientes + Ficha lateral */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E2E9EC]">
            <h3 className="font-bold text-base text-[#151B22]">Mis pacientes</h3>
            <button
              type="button"
              onClick={() => navigate('/professional/patients')}
              className="text-xs text-[#357984] font-semibold hover:underline cursor-pointer"
            >
              Ver todos mis pacientes →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E9EC] text-xs text-[#66727D] font-medium">
                  <th className="py-2.5 px-3">Paciente</th>
                  <th className="py-2.5 px-3">Último check-in</th>
                  <th className="py-2.5 px-3">Energía</th>
                  <th className="py-2.5 px-3">Adherencia</th>
                  <th className="py-2.5 px-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E9EC] text-xs">
                {patients.map(p => {
                  const isSelected = p.id === selectedPatientId;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedPatientId(p.id)}
                      className={`cursor-pointer transition-colors ${
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
                      <td className="py-3 px-3 text-[#66727D]">Hoy, 09:15</td>
                      <td className="py-3 px-3 text-[#151B22]">3/5 🟠</td>
                      <td className="py-3 px-3 text-[#151B22]">2/5 🔴</td>
                      <td className="py-3 px-3">
                        <Badge variant={p.id === 'pat-1' ? 'high' : 'active'}>
                          {p.id === 'pat-1' ? 'Atención' : 'Estable'}
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
              <div className="w-12 h-12 rounded-full bg-[#55AEB8] text-white flex items-center justify-center font-bold text-base shadow-sm">
                {selectedPatient.firstName[0]}
                {selectedPatient.lastName[0]}
              </div>
              <div>
                <h4 className="font-bold text-base text-[#151B22]">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </h4>
                <p className="text-xs text-[#66727D]">
                  {selectedPatient.age} años • {selectedPatient.city}
                </p>
                <Badge variant="active" className="mt-1">
                  Paciente activa
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
        <form onSubmit={handleSubmit(onAddPatientSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="new-firstname" className="block text-xs font-medium text-[#151B22] mb-1">
                Nombre *
              </label>
              <input
                id="new-firstname"
                type="text"
                {...register('firstName')}
                placeholder="Ej. Ana"
                className="w-full px-3 py-2 text-xs bg-[#F2F7F8] border border-[#E2E9EC] rounded-xl focus:ring-2 focus:ring-[#357984]"
              />
              {errors.firstName && (
                <p className="text-xs text-[#C95F59] mt-1">{errors.firstName.message}</p>
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
                placeholder="Ej. Martínez"
                className="w-full px-3 py-2 text-xs bg-[#F2F7F8] border border-[#E2E9EC] rounded-xl focus:ring-2 focus:ring-[#357984]"
              />
              {errors.lastName && (
                <p className="text-xs text-[#C95F59] mt-1">{errors.lastName.message}</p>
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
              placeholder="ana.martinez@example.com"
              className="w-full px-3 py-2 text-xs bg-[#F2F7F8] border border-[#E2E9EC] rounded-xl focus:ring-2 focus:ring-[#357984]"
            />
            {errors.email && (
              <p className="text-xs text-[#C95F59] mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="new-phone" className="block text-xs font-medium text-[#151B22] mb-1">
              Teléfono
            </label>
            <input
              id="new-phone"
              type="tel"
              {...register('phone')}
              placeholder="+52 55 1234 5678"
              className="w-full px-3 py-2 text-xs bg-[#F2F7F8] border border-[#E2E9EC] rounded-xl focus:ring-2 focus:ring-[#357984]"
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
              className="w-full px-3 py-2 text-xs bg-[#F2F7F8] border border-[#E2E9EC] rounded-xl focus:ring-2 focus:ring-[#357984]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E9EC]">
            <Button variant="secondary" onClick={() => setIsAddPatientOpen(false)}>
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
              className="w-full px-3 py-2 text-xs bg-[#F2F7F8] border border-[#E2E9EC] rounded-xl focus:ring-2 focus:ring-[#357984]"
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
            <Button variant="secondary" onClick={() => setIsSendCheckInOpen(false)}>
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
