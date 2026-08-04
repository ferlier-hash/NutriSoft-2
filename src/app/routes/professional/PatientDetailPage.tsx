import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMock } from '../../provider';
import { useToast } from '../../../components/ui/Toast';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { NotFoundPage } from '../NotFoundPage';
import { formatShortDate, formatDateTime } from '../../../lib/dateUtils';
import { ArrowLeft, Sparkles, Send, Calendar, CheckCircle2 } from 'lucide-react';

const recommendationSchema = z.object({
  recommendationText: z.string().min(5, 'La recomendación debe tener al menos 5 caracteres'),
});

type RecommendationFormData = z.infer<typeof recommendationSchema>;

export const PatientDetailPage: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const { patients, checkInAssignments, checkInResponses, recommendations, addRecommendation, createCheckInAssignment } = useMock();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'info' | 'checkins' | 'recommendations'>('info');
  const [isRecModalOpen, setIsRecModalOpen] = useState(false);

  const patient = patients.find(p => p.id === patientId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RecommendationFormData>({
    resolver: zodResolver(recommendationSchema),
  });

  if (!patient) {
    return (
      <NotFoundPage
        title="Paciente no encontrado"
        message="La ficha del paciente consultado no existe en la base de datos."
      />
    );
  }

  const patientAssignments = checkInAssignments.filter(a => a.patientId === patient.id);
  const patientResponses = checkInResponses.filter(r => r.patientId === patient.id);
  const patientRecs = recommendations.filter(r => r.patientId === patient.id);

  const onCreateRecommendation = (data: RecommendationFormData) => {
    addRecommendation(patient.id, data.recommendationText);
    reset();
    setIsRecModalOpen(false);
    showToast('Recomendación emitida', `La recomendación fue enviada a ${patient.firstName}`);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <Link
        to="/professional/patients"
        className="inline-flex items-center gap-1.5 text-xs text-[#66727D] hover:text-[#151B22] font-semibold"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver a la lista de pacientes</span>
      </Link>

      <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" highlighted>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#55AEB8] text-white flex items-center justify-center font-bold text-xl shadow-sm">
            {patient.firstName[0]}
            {patient.lastName[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-[#151B22]">
                {patient.firstName} {patient.lastName}
              </h2>
              <Badge variant="active">Paciente activo</Badge>
            </div>
            <p className="text-xs text-[#66727D] mt-0.5">
              {patient.age} años • {patient.city} • {patient.email} • {patient.phone}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              createCheckInAssignment(patient.id);
              showToast('Check-in asignado', `Se habilitó asignación para ${patient.firstName}`);
            }}
            className="flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5 text-[#357984]" />
            <span>Asignar Check-in</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsRecModalOpen(true)}
            className="flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Emitir Recomendación</span>
          </Button>
        </div>
      </Card>

      <div className="flex items-center gap-2 border-b border-[#E2E9EC]">
        <button
          type="button"
          onClick={() => setActiveTab('info')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer min-h-[44px] ${
            activeTab === 'info'
              ? 'border-[#357984] text-[#357984]'
              : 'border-transparent text-[#66727D] hover:text-[#151B22]'
          }`}
        >
          Información básica
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('checkins')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer min-h-[44px] ${
            activeTab === 'checkins'
              ? 'border-[#357984] text-[#357984]'
              : 'border-transparent text-[#66727D] hover:text-[#151B22]'
          }`}
        >
          Historial de Check-ins ({patientAssignments.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('recommendations')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer min-h-[44px] ${
            activeTab === 'recommendations'
              ? 'border-[#357984] text-[#357984]'
              : 'border-transparent text-[#66727D] hover:text-[#151B22]'
          }`}
        >
          Recomendaciones ({patientRecs.length})
        </button>
      </div>

      {activeTab === 'info' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="space-y-3">
            <h3 className="text-sm font-bold text-[#151B22] border-b border-[#E2E9EC] pb-2">
              Objetivo & Plan Nutricional
            </h3>
            <div>
              <span className="text-xs text-[#66727D] block">Objetivo principal:</span>
              <p className="text-sm font-semibold text-[#151B22]">{patient.objective}</p>
            </div>
            <div>
              <span className="text-xs text-[#66727D] block">Plan activo:</span>
              <p className="text-sm font-semibold text-[#357984]">{patient.currentPlan}</p>
            </div>
          </Card>

          <Card className="space-y-3">
            <h3 className="text-sm font-bold text-[#151B22] border-b border-[#E2E9EC] pb-2">
              Contacto & Asignación
            </h3>
            <div>
              <span className="text-xs text-[#66727D] block">Nutricionista responsable:</span>
              <p className="text-sm font-semibold text-[#151B22]">Lic. Andrea N.</p>
            </div>
            <div>
              <span className="text-xs text-[#66727D] block">Fecha de ingreso:</span>
              <p className="text-sm font-semibold text-[#151B22]">{formatShortDate(patient.createdAt)}</p>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'checkins' && (
        <Card className="space-y-4">
          <h3 className="text-sm font-bold text-[#151B22] border-b border-[#E2E9EC] pb-2">
            Asignaciones y Respuestas
          </h3>

          {patientAssignments.length === 0 ? (
            <p className="text-xs text-[#66727D]">No hay check-ins asignados a este paciente aún.</p>
          ) : (
            <div className="space-y-3">
              {patientAssignments.map(assign => {
                const resp = patientResponses.find(r => r.assignmentId === assign.id);
                return (
                  <div key={assign.id} className="p-3 bg-[#F2F7F8] rounded-xl border border-[#E2E9EC] text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#151B22] flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#357984]" />
                        Vencimiento: {formatShortDate(assign.dueDate)}
                      </span>
                      <Badge variant={assign.status === 'completed' ? 'active' : 'pending'}>
                        {assign.status === 'completed' ? 'Completado' : 'Pendiente'}
                      </Badge>
                    </div>

                    {resp && (
                      <div className="pt-2 border-t border-[#E2E9EC] space-y-1 text-[#151B22]">
                        <p>⚡ <strong>Energía:</strong> {resp.energyScore}/5</p>
                        <p>🥗 <strong>Adherencia:</strong> {resp.adherenceScore}/5</p>
                        <p>🆘 <strong>Solicitó ayuda:</strong> {resp.helpRequested ? 'Sí 🔴' : 'No 🟢'}</p>
                        {resp.notes && <p className="text-[#66727D] italic">"{resp.notes}"</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'recommendations' && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E2E9EC]">
            <h3 className="text-sm font-bold text-[#151B22]">Recomendaciones enviadas</h3>
            <Button variant="primary" size="sm" onClick={() => setIsRecModalOpen(true)}>
              + Emitir nueva
            </Button>
          </div>

          {patientRecs.length === 0 ? (
            <p className="text-xs text-[#66727D]">No hay recomendaciones emitidas para este paciente.</p>
          ) : (
            <div className="space-y-3">
              {patientRecs.map(rec => (
                <div key={rec.id} className="p-4 bg-[#EDF8F7] border border-[#BDE9EA] rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between text-[#357984] font-semibold">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#39835A]" /> Recomendación emitida
                    </span>
                    <span className="text-[11px] text-[#8A959D]">{formatDateTime(rec.createdAt)}</span>
                  </div>
                  <p className="text-[#151B22] font-medium text-sm pt-1">"{rec.recommendationText}"</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Dialog Accesible Radix UI */}
      <Dialog
        isOpen={isRecModalOpen}
        onClose={() => setIsRecModalOpen(false)}
        title={`Emitir recomendación para ${patient.firstName}`}
      >
        <form onSubmit={handleSubmit(onCreateRecommendation)} className="space-y-4">
          <div>
            <label htmlFor="rec-text" className="block text-xs font-medium text-[#151B22] mb-1">
              Texto de la recomendación *
            </label>
            <textarea
              id="rec-text"
              rows={3}
              {...register('recommendationText')}
              placeholder="Ej. Pequeños hábitos, grandes cambios. Mantén un vaso de agua al despertar..."
              className="w-full px-3 py-2 text-xs bg-[#F2F7F8] border border-[#E2E9EC] rounded-xl focus:ring-2 focus:ring-[#357984]"
            />
            {errors.recommendationText && (
              <p className="text-xs text-[#C95F59] mt-1">{errors.recommendationText.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E9EC]">
            <Button variant="secondary" onClick={() => setIsRecModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Enviar recomendación
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
