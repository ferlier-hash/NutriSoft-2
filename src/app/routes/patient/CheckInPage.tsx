import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMock } from '../../provider';
import { RatingScale } from '../../../components/domain/RatingScale';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Switch } from '../../../components/ui/Switch';
import { NotFoundPage } from '../NotFoundPage';
import { ArrowLeft, CheckCircle2, HeartHandshake } from 'lucide-react';

export const CheckInPage: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const { checkInAssignments, submitCheckInResponse } = useMock();

  const [energyScore, setEnergyScore] = useState<number | null>(null);
  const [adherenceScore, setAdherenceScore] = useState<number | null>(null);
  const [helpRequested, setHelpRequested] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  const [energyError, setEnergyError] = useState<string | null>(null);
  const [adherenceError, setAdherenceError] = useState<string | null>(null);

  const assignment = checkInAssignments.find(a => a.id === assignmentId);

  // Si la asignación no existe o no es válida
  if (assignmentId !== 'completed' && !assignment) {
    return (
      <NotFoundPage
        title="Asignación de check-in no encontrada"
        message="El enlace de check-in consultado no existe o ha expirado."
      />
    );
  }

  // Si ya fue completado
  if (assignment?.status === 'completed') {
    return (
      <div className="pb-20 p-4 space-y-6 max-w-md mx-auto min-h-screen bg-[#F7F9FA] flex flex-col justify-center items-center text-center">
        <Card className="p-6 space-y-4 max-w-sm w-full bg-[linear-gradient(135deg,#E9F8F7_0%,#EEF7FB_58%,#FCF9E8_100%)] border-[#BDE9EA]">
          <div className="w-16 h-16 rounded-full bg-[#E8F5EE] border border-[#BDE3CC] text-[#39835A] flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-bold text-[#151B22]">Check-in ya completado</h3>
          <p className="text-xs text-[#151B22] leading-relaxed font-medium">
            Ya respondiste previamente este reporte. Tu nutricionista tiene registrada tu respuesta.
          </p>

          <Link to="/patient">
            <Button variant="primary" className="w-full mt-4">
              Volver a mi portal
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;

    if (!energyScore) {
      setEnergyError('Por favor selecciona tu nivel de energía (1 a 5)');
      hasError = true;
    } else {
      setEnergyError(null);
    }

    if (!adherenceScore) {
      setAdherenceError('Por favor selecciona tu nivel de adherencia (1 a 5)');
      hasError = true;
    } else {
      setAdherenceError(null);
    }

    if (hasError || !energyScore || !adherenceScore || !assignment) return;

    try {
      const { confirmationMessage } = submitCheckInResponse(
        assignment.id,
        energyScore,
        adherenceScore,
        helpRequested,
        notes
      );
      setSubmittedMessage(confirmationMessage);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Ocurrió un error al enviar el check-in.';
      alert(errorMsg);
    }
  };

  if (submittedMessage) {
    return (
      <div className="pb-20 p-4 space-y-6 max-w-md mx-auto min-h-screen bg-[#F7F9FA] flex flex-col justify-center items-center text-center">
        <Card className="p-6 space-y-4 max-w-sm w-full bg-[linear-gradient(135deg,#E9F8F7_0%,#EEF7FB_58%,#FCF9E8_100%)] border-[#BDE9EA]">
          <div className="w-16 h-16 rounded-full bg-[#E8F5EE] border border-[#BDE3CC] text-[#39835A] flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-bold text-[#151B22]">¡Check-in recibido!</h3>
          <p className="text-xs text-[#151B22] leading-relaxed font-medium">
            {submittedMessage}
          </p>

          <Link to="/patient">
            <Button variant="primary" className="w-full mt-4">
              Volver a inicio
            </Button>
          </Link>
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="space-y-5">
          {/* Pregunta 1: Energía (1 a 5 sin selección inicial) */}
          <RatingScale
            name="energy"
            legend="¿Cómo está tu energía hoy?"
            value={energyScore}
            onChange={val => {
              setEnergyScore(val);
              setEnergyError(null);
            }}
            error={energyError || undefined}
          />

          {/* Pregunta 2: Adherencia (1 a 5 sin selección inicial) */}
          <RatingScale
            name="adherence"
            legend="¿Qué tan adherido/a estuviste a tu plan?"
            value={adherenceScore}
            onChange={val => {
              setAdherenceScore(val);
              setAdherenceError(null);
            }}
            error={adherenceError || undefined}
          />

          {/* Pregunta 3: Pedido de Ayuda con Radix Switch Accesible */}
          <div className="pt-3 border-t border-[#E2E9EC] flex items-center justify-between gap-3">
            <div>
              <label htmlFor="help-switch" className="text-sm font-semibold text-[#151B22] flex items-center gap-1.5 cursor-pointer">
                <HeartHandshake className="w-4 h-4 text-[#C95F59]" />
                <span>¿Necesitas ayuda?</span>
              </label>
              <p className="text-[11px] text-[#66727D]">
                Cuéntanos si hay algo en lo que podamos apoyarte.
              </p>
            </div>

            <Switch
              id="help-switch"
              checked={helpRequested}
              onCheckedChange={setHelpRequested}
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
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="¿Cómo te sentiste hoy? Ej. Tuve una reunión familiar..."
              className="w-full px-3 py-2 text-xs bg-[#F2F7F8] border border-[#E2E9EC] rounded-xl focus:ring-2 focus:ring-[#357984]"
            />
          </div>
        </Card>

        <Button variant="primary" type="submit" className="w-full font-bold text-sm">
          Confirmar check-in
        </Button>
      </form>
    </div>
  );
};
