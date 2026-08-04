import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMock } from '../../provider';
import { useToast } from '../../../components/ui/Toast';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { Search, UserPlus, ChevronRight } from 'lucide-react';

const newPatientSchema = z.object({
  firstName: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(50, 'Máximo 50 caracteres'),
  lastName: z.string().trim().min(2, 'El apellido debe tener al menos 2 caracteres').max(50, 'Máximo 50 caracteres'),
  email: z.string().trim().email('Ingresa un correo electrónico válido'),
  phone: z.string().trim().max(30, 'Máximo 30 caracteres').optional(),
  objective: z.string().trim().max(150, 'Máximo 150 caracteres').optional(),
});

type NewPatientFormData = z.infer<typeof newPatientSchema>;

export const PatientsPage: React.FC = () => {
  // SCOPE-01: Usar selectores del profesional actual
  const { professionalPatients, addPatient, currentDemoNutritionist } = useMock();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewPatientFormData>({
    resolver: zodResolver(newPatientSchema),
  });

  const filteredPatients = professionalPatients.filter(
    p =>
      p.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Lista de mis pacientes</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Gestiona los pacientes asignados a tu consultorio ({currentDemoNutritionist?.name || 'Profesional'}).
          </p>
        </div>

        {/* UX-01: Abre el formulario real de nuevo paciente */}
        <Button
          variant="primary"
          onClick={() => setIsAddPatientOpen(true)}
          className="flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          <span>Nuevo paciente</span>
        </Button>
      </div>

      <Card className="space-y-4">
        <div className="relative w-full sm:w-80">
          <label htmlFor="search-patients-input" className="sr-only">
            Buscar paciente por nombre o correo
          </label>
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            id="search-patients-input"
            type="text"
            placeholder="Buscar por nombre o correo..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-surface-subtle border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-strong text-text-primary"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-subtle text-xs text-text-secondary font-medium">
                <th scope="col" className="py-3 px-4">Paciente</th>
                <th scope="col" className="py-3 px-4">Correo</th>
                <th scope="col" className="py-3 px-4">Teléfono</th>
                <th scope="col" className="py-3 px-4">Objetivo</th>
                <th scope="col" className="py-3 px-4">Estado</th>
                <th scope="col" className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle text-xs">
              {filteredPatients.map(p => (
                <tr key={p.id} className="hover:bg-surface-subtle transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-text-primary flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-surface-tinted text-brand-strong flex items-center justify-center font-bold text-xs border border-border-subtle">
                      {p.firstName[0]}
                      {p.lastName[0]}
                    </div>
                    <div>
                      <span>
                        {p.firstName} {p.lastName}
                      </span>
                      <span className="block text-[11px] font-normal text-text-tertiary">
                        {p.age ? `${p.age} años • ` : ''}{p.city || 'Consultorio'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-text-secondary">{p.email}</td>
                  <td className="py-3.5 px-4 text-text-secondary">{p.phone || 'Sin registro'}</td>
                  <td className="py-3.5 px-4 text-text-primary font-medium max-w-xs truncate">
                    {p.objective}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant={p.status === 'active' ? 'active' : 'suspended'}>
                      {p.status === 'active' ? 'Activo' : 'Archivado'}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Button asChild variant="secondary" size="sm">
                      <Link to={`/professional/patients/${p.id}`} className="text-xs inline-flex items-center gap-1">
                        <span>Abrir ficha</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Dialog UX-01: Nuevo Paciente en PatientsPage */}
      <Dialog
        isOpen={isAddPatientOpen}
        onClose={() => setIsAddPatientOpen(false)}
        title="Agregar nuevo paciente"
        description="Ingresa los datos básicos para dar de alta al paciente en tu consultorio."
      >
        <form onSubmit={handleSubmit(onAddPatientSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="modal-firstname" className="block text-xs font-medium text-text-primary mb-1">
                Nombre *
              </label>
              <input
                id="modal-firstname"
                type="text"
                {...register('firstName')}
                aria-invalid={!!errors.firstName}
                aria-describedby={errors.firstName ? 'modal-firstname-error' : undefined}
                placeholder="Ej. Ana"
                className="w-full px-3 py-2 text-xs bg-surface-subtle border border-border-subtle rounded-xl focus:ring-2 focus:ring-brand-strong text-text-primary"
              />
              {errors.firstName && (
                <p id="modal-firstname-error" className="text-xs text-[#902A24] font-semibold mt-1">
                  {errors.firstName.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="modal-lastname" className="block text-xs font-medium text-text-primary mb-1">
                Apellido *
              </label>
              <input
                id="modal-lastname"
                type="text"
                {...register('lastName')}
                aria-invalid={!!errors.lastName}
                aria-describedby={errors.lastName ? 'modal-lastname-error' : undefined}
                placeholder="Ej. Martínez"
                className="w-full px-3 py-2 text-xs bg-surface-subtle border border-border-subtle rounded-xl focus:ring-2 focus:ring-brand-strong text-text-primary"
              />
              {errors.lastName && (
                <p id="modal-lastname-error" className="text-xs text-[#902A24] font-semibold mt-1">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="modal-email" className="block text-xs font-medium text-text-primary mb-1">
              Correo electrónico *
            </label>
            <input
              id="modal-email"
              type="email"
              {...register('email')}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'modal-email-error' : undefined}
              placeholder="ana.martinez@example.com"
              className="w-full px-3 py-2 text-xs bg-surface-subtle border border-border-subtle rounded-xl focus:ring-2 focus:ring-brand-strong text-text-primary"
            />
            {errors.email && (
              <p id="modal-email-error" className="text-xs text-[#902A24] font-semibold mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="modal-phone" className="block text-xs font-medium text-text-primary mb-1">
              Teléfono (opcional)
            </label>
            <input
              id="modal-phone"
              type="tel"
              {...register('phone')}
              placeholder="+52 55 1234 5678"
              className="w-full px-3 py-2 text-xs bg-surface-subtle border border-border-subtle rounded-xl focus:ring-2 focus:ring-brand-strong text-text-primary"
            />
          </div>

          <div>
            <label htmlFor="modal-objective" className="block text-xs font-medium text-text-primary mb-1">
              Objetivo nutricional (opcional)
            </label>
            <input
              id="modal-objective"
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
    </div>
  );
};
