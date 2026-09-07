import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, CircleUserRound, Info, ShieldCheck } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useMock } from '../../provider';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { useToast } from '../../../components/ui/Toast';
import { PROFESSIONAL_SPECIALTIES, PROFESSIONAL_TIME_ZONES } from '../../../lib/professionalSpecialties';
import type { ProfessionalSpecialty } from '../../../types';

const profileSchema = z.object({
  firstName: z.string().trim().min(2, 'Ingresá tu nombre').max(60, 'Máximo 60 caracteres'),
  lastName: z.string().trim().min(2, 'Ingresá tu apellido').max(60, 'Máximo 60 caracteres'),
  email: z.string().trim().email('Ingresá un correo electrónico válido'),
  phone: z.string().trim().max(30, 'Máximo 30 caracteres'),
  specialty: z.string().optional(),
  registrationNumber: z.string().trim().max(40, 'Máximo 40 caracteres').optional(),
  registrationProvince: z.string().trim().max(60, 'Máximo 60 caracteres').optional(),
  registrationCountry: z.string().trim().max(60, 'Máximo 60 caracteres').optional(),
  timeZone: z.string().min(1, 'Seleccioná una zona horaria'),
}).superRefine((data, ctx) => {
  const registrationValues = [data.registrationNumber, data.registrationProvince, data.registrationCountry];
  const hasAnyRegistrationValue = registrationValues.some(value => Boolean(value?.trim()));
  if (!hasAnyRegistrationValue) return;
  if (!data.registrationNumber?.trim()) ctx.addIssue({ code: 'custom', path: ['registrationNumber'], message: 'Completá el número de matrícula' });
  if (!data.registrationProvince?.trim()) ctx.addIssue({ code: 'custom', path: ['registrationProvince'], message: 'Completá la provincia' });
  if (!data.registrationCountry?.trim()) ctx.addIssue({ code: 'custom', path: ['registrationCountry'], message: 'Completá el país' });
});

type ProfileForm = z.infer<typeof profileSchema>;

const fieldClassName = 'w-full min-h-11 px-3 py-2 text-sm bg-surface-subtle border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-strong text-text-primary';

export function ProfessionalProfilePage() {
  const { currentDemoNutritionist, updateProfessionalProfile } = useMock();
  const { showToast } = useToast();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (!currentDemoNutritionist) return;
    reset({
      firstName: currentDemoNutritionist.firstName,
      lastName: currentDemoNutritionist.lastName,
      email: currentDemoNutritionist.email,
      phone: currentDemoNutritionist.phone,
      specialty: currentDemoNutritionist.specialty ?? '',
      registrationNumber: currentDemoNutritionist.registrationNumber ?? '',
      registrationProvince: currentDemoNutritionist.registrationProvince ?? '',
      registrationCountry: currentDemoNutritionist.registrationCountry ?? '',
      timeZone: currentDemoNutritionist.timeZone,
    });
  }, [currentDemoNutritionist, reset]);

  if (!currentDemoNutritionist) return null;

  const onSubmit = (data: ProfileForm) => {
    try {
      updateProfessionalProfile({
        ...data,
        specialty: data.specialty ? data.specialty as ProfessionalSpecialty : undefined,
      });
      showToast('Perfil actualizado', 'Los cambios quedaron guardados en esta demostración.');
    } catch (error) {
      showToast('No pudimos guardar el perfil', error instanceof Error ? error.message : 'Intentá nuevamente.', 'error');
    }
  };

  const errorFor = (field: keyof ProfileForm) => errors[field]?.message;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      <div>
        <div className="flex items-center gap-2">
          <CircleUserRound className="w-6 h-6 text-brand-strong" />
          <h1 className="text-2xl font-bold text-text-primary">Mi perfil profesional</h1>
        </div>
        <p className="text-sm text-text-secondary mt-1">Estos datos corresponden a tu vínculo con {currentDemoNutritionist.organizationName}.</p>
      </div>

      <Card highlighted className="flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-brand-strong shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-text-primary">Perfil contextual por consultorio</p>
          <p className="text-xs text-text-secondary mt-1">Si trabajás en otra organización, podrás usar una especialidad, matrícula, teléfono y zona horaria diferentes. Tu identidad de acceso seguirá siendo única.</p>
        </div>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        <Card className="space-y-5">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Información básica</h2>
            <p className="text-xs text-text-secondary mt-1">Nombre, apellido y correo son los únicos datos obligatorios para comenzar.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {([
              ['firstName', 'Nombre *', 'Andrea'],
              ['lastName', 'Apellido *', 'Núñez'],
              ['email', 'Correo electrónico *', 'andrea@consultorio.com'],
              ['phone', 'Teléfono', '+54 351 555 0101'],
            ] as const).map(([field, label, placeholder]) => (
              <div key={field}>
                <label htmlFor={`profile-${field}`} className="block text-xs font-semibold text-text-primary mb-1.5">{label}</label>
                <input id={`profile-${field}`} type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'} {...register(field)} placeholder={placeholder} className={fieldClassName} aria-invalid={Boolean(errorFor(field))} aria-describedby={errorFor(field) ? `profile-${field}-error` : undefined} />
                {errorFor(field) && <p id={`profile-${field}-error`} className="text-xs text-semantic-critical mt-1">{errorFor(field)}</p>}
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-5">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Práctica profesional</h2>
            <p className="text-xs text-text-secondary mt-1">La especialidad orienta la experiencia; no funciona como certificación.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="profile-specialty" className="block text-xs font-semibold text-text-primary mb-1.5">Especialidad</label>
              <select id="profile-specialty" {...register('specialty')} className={fieldClassName}>
                <option value="">Sin especialidad seleccionada</option>
                {PROFESSIONAL_SPECIALTIES.map(specialty => <option key={specialty} value={specialty}>{specialty}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="profile-timeZone" className="block text-xs font-semibold text-text-primary mb-1.5">Zona horaria *</label>
              <select id="profile-timeZone" {...register('timeZone')} className={fieldClassName}>
                {PROFESSIONAL_TIME_ZONES.map(zone => <option key={zone} value={zone}>{zone.replaceAll('_', ' ')}</option>)}
              </select>
              {errorFor('timeZone') && <p className="text-xs text-semantic-critical mt-1">{errorFor('timeZone')}</p>}
            </div>
          </div>
        </Card>

        <Card className="space-y-5">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-brand-strong mt-0.5" />
            <div>
              <h2 className="text-lg font-bold text-text-primary">Matrícula opcional</h2>
              <p className="text-xs text-text-secondary mt-1">NutriSoft registra estos datos, pero no verifica la matrícula. Si completás uno, necesitaremos los tres.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {([
              ['registrationNumber', 'Número', 'MP 18432'],
              ['registrationProvince', 'Provincia', 'Córdoba'],
              ['registrationCountry', 'País', 'Argentina'],
            ] as const).map(([field, label, placeholder]) => (
              <div key={field}>
                <label htmlFor={`profile-${field}`} className="block text-xs font-semibold text-text-primary mb-1.5">{label}</label>
                <input id={`profile-${field}`} {...register(field)} placeholder={placeholder} className={fieldClassName} aria-invalid={Boolean(errorFor(field))} />
                {errorFor(field) && <p className="text-xs text-semantic-critical mt-1">{errorFor(field)}</p>}
              </div>
            ))}
          </div>
        </Card>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary"><CheckCircle2 className="w-4 h-4 text-semantic-success" />La matrícula puede quedar vacía.</span>
          <Button type="submit" variant="primary" disabled={isSubmitting} className="w-full sm:w-auto">Guardar perfil</Button>
        </div>
      </form>
    </div>
  );
}
