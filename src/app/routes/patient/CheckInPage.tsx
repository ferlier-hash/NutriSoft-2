import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMock } from '../../provider';
import { useToast } from '../../../components/ui/Toast';
import { RatingScale } from '../../../components/domain/RatingScale';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Switch } from '../../../components/ui/Switch';
import { NotFoundPage } from '../NotFoundPage';
import { ArrowLeft, CheckCircle2, HeartHandshake } from 'lucide-react';

const checkInSchema = z.object({
  energyScore: z
    .number({ required_error: 'Por favor selecciona tu nivel de energía (1 a 5)' })
    .min(1, 'Por favor selecciona tu nivel de energía (1 a 5)')
    .max(5, 'El valor máximo es 5'),
  adherenceScore: z
    .number({ required_error: 'Por favor selecciona tu nivel de adherencia (1 a 5)' })
    .min(1, 'Por favor selecciona tu nivel de adherencia (1 a 5)')
    .max(5, 'El valor máximo es 5'),
  helpRequested: z.boolean().default(false),
  notes: z.string().max(500, 'Las notas no pueden superar 500 caracteres').optional(),
});

type CheckInFormData = z.infer<typeof checkInSchema>;

export const CheckInPage: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const { currentDemoPatientId, checkInAssignments, submitCheckInResponse } = useMock();
  const { showToast } = useToast();

  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckInFormData>({
    resolver: zodResolver(checkInSchema),
    defaultValues: {
      helpRequested: false,
      notes: '',
    },
  });

  const assignment = checkInAssignments.find(a => a.id === assignmentId);

  // Validación estricta: si la asignación no existe o pertenece a OTRO paciente, 404
  if (!assignment || assignment.patientId !== currentDemoPatientId) {
    return (
      <NotFoundPage
        title="Asignación de check-in no encontrada"
        message="El enlace de check-in consultado no existe, pertenece a otro paciente o ha sido deshabilitado."
      />
    );
  }

  // Si ya fue completado
  if (assignment.status === 'completed') {
    return (
      <div className="pb-20 p-4 space-y-6 max-w-md mx-auto min-h-screen bg-[#F7F9FA] flex flex-col justify-center items-center text-center">
        <Card className="p-6 space-y-4 max-w-sm w-full bg-[linear-gradient(135deg,#E9F8F7_0%,#EEF7FB_58%,#FCF9E8_100%)] border-[#BDE9EA]">
          <div className="w-16 h-16 rounded-full bg-[#E8F5EE] border border-[#BDE3CC] text-[#1E5235] flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-bold text-[#151B22]">Check-in ya completado</h3>
          <p className="text-xs text-[#151B22] leading-relaxed font-medium">
            Ya respondiste previamente este reporte. Tu nutricionista tiene registrada tu respuesta.
          </p>

          <Button asChild variant="primary" className="w-full mt-4">
            <Link to="/patient">Volver a mi portal</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const onSubmit = (data: CheckInFormData) => {
    try {
      const { confirmationMessage } = submitCheckInResponse(
        assignment.id,
        currentDemoPatientId,
        data.energyScore,
        data.adherenceScore,
        data.helpRequested,
        data.notes
      );
      setSubmittedMessage(confirmationMessage);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Ocurrió un error al enviar el check-in.';
      showToast('Error en envío', errorMsg, 'error');
    }
  };

  if (submittedMessage) {
    return (
      <div className="pb-20 p-4 space-y-6 max-w-md mx-auto min-h-screen bg-[#F7F9FA] flex flex-col justify-center items-center text-center">
        <Card className="p-6 space-y-4 max-w-sm w-full bg-[linear-gradient(135deg,#E9F8F7_0%,#EEF7FB_58%,#FCF9E8_100%)] border-[#BDE9EA]">
          <div className="w-16 h-16 rounded-full bg-[#E8F5EE] border border-[#BDE3CC] text-[#1E5235] flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-bold text-[#151B22]">¡Check-in recibido!</h3>
          <p className="text-xs text-[#151B22] leading-relaxed font-medium">
            {submittedMessage}
          </p>

          <Button asChild variant="primary" className="w-full mt-4">
            <Link to="/patient">Volver a inicio</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="pb-20 p-4 space-y-5 max-w-md mx-auto min-h-screen bg-[#F7F9FA]">
      <Link
        to="/patient"
        className="inline-flex items-center gap-1 text-xs text-[#66727D] hover:text-[#151B22] font-semibold"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver al portal</span>
      </Link>

      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-[#151B22]">Tu check-in de hoy</h2>
        <p className="text-xs text-[#66727D]">
          Selecciona tus respuestas para enviar el reporte a tu nutricionista.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <Card className="space-y-5">
          {/* Pregunta 1: Energía (1 a 5 sin selección inicial) */}
          <Controller
            name="energyScore"
            control={control}
            render={({ field }) => (
              <RatingScale
                name="energyScore"
                legend="¿Cómo está tu energía hoy?"
                value={field.value || null}
                onChange={val => field.onChange(val)}
                error={errors.energyScore?.message}
              />
            )}
          />

          {/* Pregunta 2: Adherencia (1 a 5 sin selección inicial) */}
          <Controller
            name="adherenceScore"
            control={control}
            render={({ field }) => (
              <RatingScale
                name="adherenceScore"
                legend="¿Qué tan adherido/a estuviste a tu plan?"
                value={field.value || null}
                onChange={val => field.onChange(val)}
                error={errors.adherenceScore?.message}
              />
            )}
          />

          {/* Pregunta 3: Pedido de Ayuda con Radix Switch Accesible */}
          <div className="pt-3 border-t border-[#E2E9EC] flex items-center justify-between gap-3">
            <div>
              <label htmlFor="help-switch" className="text-sm font-semibold text-[#151B22] flex items-center gap-1.5 cursor-pointer">
                <HeartHandshake className="w-4 h-4 text-[#902A24]" />
                <span>¿Necesitas ayuda?</span>
              </label>
              <p className="text-[11px] text-[#66727D]">
                Cuéntanos si hay algo en lo que podamos apoyarte.
              </p>
            </div>

            <Controller
              name="helpRequested"
              control={control}
              render={({ field }) => (
                <Switch
                  id="help-switch"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>

          {/* Notas Adicionales */}
          <div className="pt-3 border-t border-[#E2E9EC]">
            <label htmlFor="notes-input" className="block text-xs font-medium text-[#151B22] mb-1">
              Notas o comentarios adicionales (opcional)
            </label>
            <textarea
              id="notes-input"
              rows={2}
              {...register('notes')}
              aria-invalid={!!errors.notes}
              aria-describedby={errors.notes ? 'notes-error' : undefined}
              placeholder="¿Cómo te sentiste hoy? Ej. Tuve una reunión familiar..."
              className="w-full px-3 py-2 text-xs bg-[#F2F7F8] border border-[#E2E9EC] rounded-xl focus:ring-2 focus:ring-[#357984] text-[#151B22]"
            />
            {errors.notes && (
              <p id="notes-error" className="text-xs text-[#902A24] font-semibold mt-1">
                {errors.notes.message}
              </p>
            )}
          </div>
        </Card>

        <Button variant="primary" type="submit" className="w-full font-bold text-sm">
          Confirmar check-in
        </Button>
      </form>
    </div>
  );
};
