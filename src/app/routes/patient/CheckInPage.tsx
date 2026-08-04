import React, { useState } from 'react';
import { useMock } from '../../provider';
import { RatingScale } from '../../../components/domain/RatingScale';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ArrowLeft, CheckCircle2, HeartHandshake } from 'lucide-react';

export const CheckInPage: React.FC = () => {
  const { checkInAssignments, submitCheckInResponse } = useMock();
  const [energyScore, setEnergyScore] = useState<number>(3);
  const [adherenceScore, setAdherenceScore] = useState<number>(3);
  const [helpRequested, setHelpRequested] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  const hash = window.location.hash;
  const assignmentId = hash.split('/check-in/')[1] || 'assign-1';
  const assignment = checkInAssignments.find(a => a.id === assignmentId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const { confirmationMessage } = submitCheckInResponse(
      assignmentId,
      energyScore,
      adherenceScore,
      helpRequested,
      notes
    );

    setSubmittedMessage(confirmationMessage);
  };

  // Pantalla de Confirmación Neutral (sin diagnósticos automáticos)
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

          <Button
            variant="primary"
            className="w-full mt-4"
            onClick={() => (window.location.hash = '#/patient')}
          >
            Volver a inicio
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="pb-20 p-4 space-y-5 max-w-md mx-auto min-h-screen bg-[#F7F9FA]">
      <a
        href="#/patient"
        className="inline-flex items-center gap-1 text-xs text-[#66727D] hover:text-[#151B22] font-semibold"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver al portal</span>
      </a>

      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-[#151B22]">Tu check-in de hoy</h2>
        <p className="text-xs text-[#66727D]">
          {assignment ? 'Por favor responde estas breves preguntas.' : 'Check-in demostrativo.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="space-y-5">
          {/* Pregunta 1: Energía (1 a 5 con Radio Inputs) */}
          <RatingScale
            name="energy"
            legend="¿Cómo está tu energía hoy?"
            value={energyScore}
            onChange={setEnergyScore}
          />

          {/* Pregunta 2: Adherencia (1 a 5 con Radio Inputs) */}
          <RatingScale
            name="adherence"
            legend="¿Qué tan adherido/a estuviste a tu plan?"
            value={adherenceScore}
            onChange={setAdherenceScore}
          />

          {/* Pregunta 3: Pedido de Ayuda (Concepto A Switch) */}
          <div className="pt-3 border-t border-[#E2E9EC] flex items-center justify-between gap-3">
            <div>
              <label htmlFor="help-toggle" className="text-sm font-semibold text-[#151B22] flex items-center gap-1.5 cursor-pointer">
                <HeartHandshake className="w-4 h-4 text-[#C95F59]" />
                <span>¿Necesitas ayuda?</span>
              </label>
              <p className="text-[11px] text-[#66727D]">
                Cuéntanos si hay algo en lo que podamos apoyarte.
              </p>
            </div>

            <input
              type="checkbox"
              id="help-toggle"
              checked={helpRequested}
              onChange={e => setHelpRequested(e.target.checked)}
              className="w-6 h-6 rounded accent-[#55AEB8] cursor-pointer min-h-[44px] min-w-[44px]"
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

        {/* Botón de Confirmación (Concepto A Gradiente) */}
        <Button variant="primary" type="submit" className="w-full font-bold text-sm">
          Confirmar check-in
        </Button>
      </form>
    </div>
  );
};
