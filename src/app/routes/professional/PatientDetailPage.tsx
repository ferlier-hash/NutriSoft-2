import React, { useMemo, useState, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
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
import { ArrowLeft, Sparkles, Send, Calendar, CheckCircle2, ClipboardList, History, ListChecks, MessageSquareText, TrendingUp, Video, MapPin, Ruler, Plus, BarChart3 } from 'lucide-react';

const recommendationSchema = z.object({
  recommendationText: z
    .string()
    .trim()
    .min(5, 'La recomendación debe tener al menos 5 caracteres')
    .max(500, 'Máximo 500 caracteres'),
});

type RecommendationFormData = z.infer<typeof recommendationSchema>;

type TabKey = 'info' | 'plan' | 'checkins' | 'tracking' | 'anthropometry' | 'recommendations';
const tabKeys: TabKey[] = ['info', 'plan', 'checkins', 'tracking', 'anthropometry', 'recommendations'];

const anthropometricMetrics = [
  { key: 'heightCm', label: 'Altura', unit: 'cm' }, { key: 'weightKg', label: 'Peso', unit: 'kg' },
  { key: 'sizeCm', label: 'Talla', unit: 'cm' }, { key: 'waistCm', label: 'Circunferencia de cintura', unit: 'cm' },
  { key: 'bodyFatPercentage', label: '% de grasa', unit: '%' }, { key: 'muscleMassPercentage', label: '% de masa muscular', unit: '%' },
  { key: 'hydrationPercentage', label: 'Hidratación', unit: '%' }, { key: 'skinfoldMm', label: 'Pliegues', unit: 'mm' },
  { key: 'visceralFatPercentage', label: '% grasa visceral', unit: '%' },
] as const;

const appointmentStatusLabel = {
  requested: 'Solicitada',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled_by_patient: 'Cancelada por paciente',
  cancelled_by_professional: 'Cancelada por profesional',
  rescheduled: 'Reprogramada',
  no_show: 'Ausente',
} as const;

const appointmentStatusVariant = {
  requested: 'pending',
  confirmed: 'info',
  completed: 'active',
  cancelled_by_patient: 'neutral',
  cancelled_by_professional: 'neutral',
  rescheduled: 'info',
  no_show: 'high',
} as const;

const paymentStatusLabel = {
  pending: 'Pendiente',
  paid: 'Pagado',
  partial: 'Parcial',
  no_charge: 'Sin cargo',
  refunded: 'Reintegrado',
} as const;

const paymentStatusVariant = {
  pending: 'pending',
  paid: 'active',
  partial: 'info',
  no_charge: 'neutral',
  refunded: 'neutral',
} as const;

const localDateInputValue = () => {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

export const PatientDetailPage: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const [searchParams] = useSearchParams();
  // SCOPE-01: Usar selectores del profesional actual
  const {
    professionalPatients,
    checkInAssignments,
    checkInResponses,
    recommendations,
    addRecommendation,
    createCheckInAssignment,
    nutritionists,
    organizations,
    professionalMealPlanAssignments,
    endMealPlanAssignment,
    professionalNextStepLists,
    mealAdherenceRecords,
    professionalAppointments,
    professionalPracticeSettings,
    professionalAnthropometricMeasurements,
    recordProfessionalAnthropometricMeasurement,
    updateProfessionalAnthropometricMeasurement,
    deleteProfessionalAnthropometricMeasurement,
  } = useMock();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const requested = searchParams.get('tab');
    return tabKeys.includes(requested as TabKey) ? requested as TabKey : 'info';
  });
  const [isRecModalOpen, setIsRecModalOpen] = useState(false);
  const [isMeasurementOpen, setIsMeasurementOpen] = useState(false);
  const [weightPeriod, setWeightPeriod] = useState<'7d' | '30d' | '3m' | 'all'>('all');
  const [showWeightTrendLine, setShowWeightTrendLine] = useState(false);
  const [isAnthropometryOpen, setIsAnthropometryOpen] = useState(false);
  const [editingAnthropometryId, setEditingAnthropometryId] = useState<string | null>(null);
  const [anthropometryPeriod, setAnthropometryPeriod] = useState<'7d' | '15d' | '30d' | 'lastMonth' | 'custom'>('30d');
  const [anthropometryCustomRange, setAnthropometryCustomRange] = useState({ from: '', to: '' });
  const [anthropometryMetric, setAnthropometryMetric] = useState('weightKg');
  const [anthropometryInput, setAnthropometryInput] = useState<Record<string, string>>({ recordedAt: localDateInputValue() });
  const [comparisonStartId, setComparisonStartId] = useState<string>('');
  const [comparisonEndId, setComparisonEndId] = useState<string>('');
  const [measurement, setMeasurement] = useState({ recordedAt: localDateInputValue(), weightKg: '', heightCm: '', waistCm: '', hipCm: '' });

  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RecommendationFormData>({
    resolver: zodResolver(recommendationSchema),
  });

  // SCOPE-01: Validación estricta en la vista. Si el paciente no pertenece a professionalPatients -> 404
  const patient = professionalPatients.find(p => p.id === patientId);

  if (!patient) {
    return (
      <NotFoundPage
        title="Paciente no encontrado o acceso no autorizado"
        message="La ficha del paciente consultada no existe en tu consultorio o pertenece a otro profesional."
      />
    );
  }

  const assignedNutri = nutritionists.find(n => n.id === patient.assignedNutritionistId);
  const assignedOrg = organizations.find(o => o.id === patient.organizationId);

  const patientAssignments = checkInAssignments.filter(a => a.patientId === patient.id);
  const patientResponses = checkInResponses.filter(r => r.patientId === patient.id);
  const patientRecs = recommendations.filter(r => r.patientId === patient.id);
  const patientPlanAssignments = professionalMealPlanAssignments.filter(assignment => assignment.patientId === patient.id);
  const activePatientPlans = patientPlanAssignments.filter(assignment => assignment.status === 'active');
  const patientNextSteps = professionalNextStepLists.find(list => list.patientId === patient.id);
  const recentAppointments = professionalAppointments
    .filter(appointment => appointment.patientId === patient.id)
    .sort((first, second) => new Date(second.startsAt).getTime() - new Date(first.startsAt).getTime())
    .slice(0, 5);
  const patientMeasurements = professionalAnthropometricMeasurements.filter(item => item.patientId === patient.id).sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
  const weightMeasurements = patientMeasurements.filter(item => item.weightKg !== undefined).slice().reverse();
  const weightPeriodDays = { '7d': 7, '30d': 30, '3m': 90, all: null } as const;
  const periodStart = weightPeriodDays[weightPeriod] === null ? null : new Date(Date.now() - weightPeriodDays[weightPeriod] * 86_400_000);
  const visibleWeightMeasurements = periodStart
    ? weightMeasurements.filter(item => new Date(item.recordedAt).getTime() >= periodStart.getTime())
    : weightMeasurements;
  const weightChange = visibleWeightMeasurements.length >= 2
    ? visibleWeightMeasurements[visibleWeightMeasurements.length - 1]!.weightKg! - visibleWeightMeasurements[0]!.weightKg!
    : null;
  const latestWeightMeasurement = weightMeasurements.at(-1);
  const changeFromInitialWeight = patient.initialWeightKg !== undefined && latestWeightMeasurement
    ? latestWeightMeasurement.weightKg! - patient.initialWeightKg
    : null;
  const visibleWeightValues = visibleWeightMeasurements.map(item => item.weightKg!);
  const visibleWeightMin = visibleWeightValues.length > 0 ? Math.min(...visibleWeightValues) : 0;
  const visibleWeightMax = visibleWeightValues.length > 0 ? Math.max(...visibleWeightValues) : 0;
  const weightTrendPoints = visibleWeightMeasurements.length >= 3
    ? visibleWeightMeasurements.map((item, index) => {
        const x = (index / (visibleWeightMeasurements.length - 1)) * 100;
        const y = visibleWeightMax === visibleWeightMin ? 55 : 88 - ((item.weightKg! - visibleWeightMin) / (visibleWeightMax - visibleWeightMin)) * 62;
        return `${x},${y}`;
      }).join(' ')
    : '';
  const anthropometricCustomFields = professionalPracticeSettings?.anthropometricCustomFields ?? [];
  const activeAnthropometricCustomFields = anthropometricCustomFields.filter(field => field.status !== 'archived');
  const allAnthropometricMetrics = useMemo(() => [
    ...anthropometricMetrics,
    ...anthropometricCustomFields.map(field => ({ key: `custom:${field.id}`, label: field.label, unit: field.unit })),
  ], [anthropometricCustomFields]);
  const inputAnthropometricMetrics = useMemo(() => [
    ...anthropometricMetrics,
    ...activeAnthropometricCustomFields.map(field => ({ key: `custom:${field.id}`, label: field.label, unit: field.unit })),
  ], [activeAnthropometricCustomFields]);
  const professionalAnthropometry = patientMeasurements.filter(item => item.recordedBy === 'professional');
  const comparisonStart = professionalAnthropometry.find(item => item.id === comparisonStartId);
  const comparisonEnd = professionalAnthropometry.find(item => item.id === comparisonEndId);
  const selectedAnthropometryMetric = allAnthropometricMetrics.find(metric => metric.key === anthropometryMetric) ?? allAnthropometricMetrics[0]!;
  const getAnthropometryValue = (item: typeof patientMeasurements[number], key: string): number | undefined => key.startsWith('custom:') ? item.customValues?.[key.slice(7)] : item[key as keyof typeof item] as number | undefined;
  const anthropometryRange = (() => {
    const now = new Date();
    if (anthropometryPeriod === 'custom') return { from: anthropometryCustomRange.from ? new Date(`${anthropometryCustomRange.from}T00:00:00`) : null, to: anthropometryCustomRange.to ? new Date(`${anthropometryCustomRange.to}T23:59:59`) : null };
    if (anthropometryPeriod === 'lastMonth') return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59) };
    const days = anthropometryPeriod === '7d' ? 7 : anthropometryPeriod === '15d' ? 15 : 30;
    return { from: new Date(now.getTime() - days * 86_400_000), to: null };
  })();
  const anthropometryChartRows = professionalAnthropometry.slice().reverse().filter(item => {
    const date = new Date(item.recordedAt); const value = getAnthropometryValue(item, selectedAnthropometryMetric.key);
    return value !== undefined && (!anthropometryRange.from || date >= anthropometryRange.from) && (!anthropometryRange.to || date <= anthropometryRange.to);
  });
  const anthropometryChartValues = anthropometryChartRows.map(item => getAnthropometryValue(item, selectedAnthropometryMetric.key)!);
  const anthropometryMin = anthropometryChartValues.length ? Math.min(...anthropometryChartValues) : 0;
  const anthropometryMax = anthropometryChartValues.length ? Math.max(...anthropometryChartValues) : 0;

  const onCreateRecommendation = (data: RecommendationFormData) => {
    try {
      addRecommendation(patient.id, data.recommendationText);
      reset();
      setIsRecModalOpen(false);
      showToast('Recomendación emitida', `La recomendación fue enviada a ${patient.firstName}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al emitir recomendación';
      showToast('Error', msg, 'error');
    }
  };
  const saveMeasurement = () => { try { const nextWeight = measurement.weightKg ? Number(measurement.weightKg) : undefined; const previousWeight = patientMeasurements.find(item => item.weightKg !== undefined)?.weightKg; if (nextWeight && previousWeight && Math.abs(nextWeight - previousWeight) / previousWeight >= 0.1 && !window.confirm(`El peso varía más de 10% respecto del último registro (${previousWeight} kg). ¿Confirmás que es correcto?`)) return; recordProfessionalAnthropometricMeasurement(patient.id, { recordedAt: measurement.recordedAt, weightKg: nextWeight, heightCm: measurement.heightCm ? Number(measurement.heightCm) : undefined, waistCm: measurement.waistCm ? Number(measurement.waistCm) : undefined, hipCm: measurement.hipCm ? Number(measurement.hipCm) : undefined }); setIsMeasurementOpen(false); setMeasurement({ recordedAt: localDateInputValue(), weightKg: '', heightCm: '', waistCm: '', hipCm: '' }); showToast('Medición registrada', 'El seguimiento se actualizó para este paciente.'); } catch (error) { showToast('No pudimos registrar', error instanceof Error ? error.message : 'Revisá los valores.', 'error'); } };
  const saveAnthropometry = () => { try {
    const numeric = (key: string) => anthropometryInput[key]?.trim() ? Number(anthropometryInput[key]) : undefined;
    const existingCustomValues = editingAnthropometryId ? professionalAnthropometry.find(item => item.id === editingAnthropometryId)?.customValues ?? {} : {};
    const customValues = { ...existingCustomValues, ...Object.fromEntries(activeAnthropometricCustomFields.flatMap(field => { const value = numeric(`custom:${field.id}`); return value === undefined ? [] : [[field.id, value]]; })) };
    const input = { recordedAt: anthropometryInput.recordedAt || localDateInputValue(), weightKg: numeric('weightKg'), heightCm: numeric('heightCm'), sizeCm: numeric('sizeCm'), waistCm: numeric('waistCm'), bodyFatPercentage: numeric('bodyFatPercentage'), muscleMassPercentage: numeric('muscleMassPercentage'), hydrationPercentage: numeric('hydrationPercentage'), skinfoldMm: numeric('skinfoldMm'), visceralFatPercentage: numeric('visceralFatPercentage'), customValues, note: anthropometryInput.note?.trim() || undefined };
    if (editingAnthropometryId) updateProfessionalAnthropometricMeasurement(editingAnthropometryId, input); else recordProfessionalAnthropometricMeasurement(patient.id, input);
    setIsAnthropometryOpen(false); setEditingAnthropometryId(null); setAnthropometryInput({ recordedAt: localDateInputValue() }); showToast(editingAnthropometryId ? 'Revisión corregida' : 'Revisión antropométrica registrada', 'La tabla y el gráfico se actualizaron para este paciente.');
  } catch (error) { showToast('No pudimos registrar', error instanceof Error ? error.message : 'Revisá la fecha y los valores.', 'error'); } };
  const openAnthropometryDialog = (item?: typeof professionalAnthropometry[number]) => {
    if (!item) { setEditingAnthropometryId(null); setAnthropometryInput({ recordedAt: localDateInputValue() }); setIsAnthropometryOpen(true); return; }
    const values: Record<string, string> = { recordedAt: item.recordedAt.slice(0, 10), note: item.note ?? '' };
    anthropometricMetrics.forEach(metric => { const value = getAnthropometryValue(item, metric.key); if (value !== undefined) values[metric.key] = String(value); });
    activeAnthropometricCustomFields.forEach(field => { const value = item.customValues?.[field.id]; if (value !== undefined) values[`custom:${field.id}`] = String(value); });
    setEditingAnthropometryId(item.id); setAnthropometryInput(values); setIsAnthropometryOpen(true);
  };
  const removeAnthropometry = (measurementId: string) => { if (!window.confirm('¿Eliminar esta revisión antropométrica? Esta acción no se puede deshacer en la demo.')) return; try { deleteProfessionalAnthropometricMeasurement(measurementId); showToast('Revisión eliminada', 'La tabla y el gráfico fueron actualizados.'); } catch (error) { showToast('No pudimos eliminar', error instanceof Error ? error.message : 'Intentá nuevamente.', 'error'); } };

  // A11Y-01: Navegación por teclado en tabs (ArrowLeft, ArrowRight, Home, End)
  const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    let targetIndex = index;
    if (e.key === 'ArrowRight') {
      targetIndex = (index + 1) % tabKeys.length;
    } else if (e.key === 'ArrowLeft') {
      targetIndex = (index - 1 + tabKeys.length) % tabKeys.length;
    } else if (e.key === 'Home') {
      targetIndex = 0;
    } else if (e.key === 'End') {
      targetIndex = tabKeys.length - 1;
    } else {
      return;
    }
    e.preventDefault();
    const nextTab = tabKeys[targetIndex]!;
    setActiveTab(nextTab);
    tabsRef.current[targetIndex]?.focus();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      <Link
        to="/professional/patients"
        className="min-h-11 inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary font-semibold"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver a la lista de pacientes</span>
      </Link>

      <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" highlighted>
        <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-brand-primary text-text-primary flex items-center justify-center font-bold text-xl shadow-xs">
            {patient.firstName[0]}
            {patient.lastName[0]}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-text-primary">
                {patient.firstName} {patient.lastName}
              </h2>
              <Badge variant={patient.status === 'active' ? 'active' : 'suspended'}>
                {patient.status === 'active' ? 'Paciente activo' : 'Archivado'}
              </Badge>
            </div>
            <p className="text-xs text-text-secondary mt-0.5 break-words">
              {patient.age ? `${patient.age} años • ` : ''}{patient.city ? `${patient.city} • ` : ''}{patient.email} {patient.phone ? `• ${patient.phone}` : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              try {
                createCheckInAssignment(patient.id);
                showToast('Check-in asignado', `Se habilitó asignación para ${patient.firstName}`);
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Error al asignar check-in';
                showToast('Error', msg, 'error');
              }
            }}
            className="flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5 text-brand-strong" />
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

      {/* Navegación por Pestañas Accesible con ARIA Tablist y Teclado A11Y-01 */}
      <div className="overflow-x-auto"><div role="tablist" aria-label="Secciones de la ficha del paciente" className="flex items-center gap-2 border-b border-border-subtle min-w-max">
        {tabKeys.map((tabKey, idx) => {
          const labels: Record<TabKey, string> = {
            info: 'Información básica',
            plan: `Plan alimentario (${activePatientPlans.length})`,
            checkins: `Historial de Check-ins (${patientAssignments.length})`,
            tracking: `Seguimiento (${patientMeasurements.length})`,
            anthropometry: `Antropometría (${professionalAnthropometry.length})`,
            recommendations: `Recomendaciones (${patientRecs.length})`,
          };

          return (
            <button
              key={tabKey}
              id={`tab-${tabKey}`}
              ref={el => { tabsRef.current[idx] = el; }}
              type="button"
              role="tab"
              aria-selected={activeTab === tabKey}
              aria-controls={`panel-${tabKey}`}
              tabIndex={activeTab === tabKey ? 0 : -1}
              onClick={() => setActiveTab(tabKey)}
              onKeyDown={e => handleTabKeyDown(e, idx)}
              className={`shrink-0 pb-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer min-h-[44px] outline-none focus-visible:ring-2 focus-visible:ring-brand-strong ${
                activeTab === tabKey
                  ? 'border-brand-strong text-brand-strong'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {labels[tabKey]}
            </button>
          );
        })}
      </div></div>

      {activeTab === 'info' && (
        <div id="panel-info" role="tabpanel" aria-labelledby="tab-info" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="space-y-3">
            <h3 className="text-sm font-bold text-text-primary border-b border-border-subtle pb-2">
              Objetivo & Plan Nutricional
            </h3>
            <div>
              <span className="text-xs text-text-secondary block">Objetivo principal:</span>
              <p className="text-sm font-semibold text-text-primary">{patient.objective}</p>
            </div>
            <div>
              <span className="text-xs text-text-secondary block">Plan activo:</span>
              <p className="text-sm font-semibold text-brand-strong">{patient.currentPlan || 'Sin plan asignado'}</p>
            </div>
          </Card>

          <Card className="space-y-3">
            <h3 className="text-sm font-bold text-text-primary border-b border-border-subtle pb-2">
              Contacto & Asignación
            </h3>
            <div>
              <span className="text-xs text-text-secondary block">Nutricionista responsable:</span>
              <p className="text-sm font-semibold text-text-primary">{assignedNutri?.name || 'Nutricionista'}</p>
            </div>
            <div>
              <span className="text-xs text-text-secondary block">Organización:</span>
              <p className="text-sm font-semibold text-brand-strong">{assignedOrg?.name || 'Organización'}</p>
            </div>
            <div>
              <span className="text-xs text-text-secondary block">Acceso al portal:</span>
              {/* STATUS-01 */}
              <Badge
                variant={
                  patient.portalAccessStatus === 'active'
                    ? 'active'
                    : patient.portalAccessStatus === 'pending'
                    ? 'pending'
                    : 'suspended'
                }
                className="mt-1"
              >
                {patient.portalAccessStatus === 'active'
                  ? 'Acceso Habilitado'
                  : patient.portalAccessStatus === 'pending'
                  ? 'Pendiente de registro'
                  : 'Acceso Revocado'}
              </Badge>
            </div>
          </Card>

          <Card className="space-y-3 sm:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-3">
              <div>
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2"><Calendar className="w-4 h-4 text-brand-strong" />Últimos turnos</h3>
                <p className="text-xs text-text-secondary mt-1">Resumen operativo de las cinco citas más recientes, sin importes.</p>
              </div>
              <Button asChild variant="secondary" size="sm"><Link to="/professional/appointments">Ver todas las citas</Link></Button>
            </div>
            {recentAppointments.length === 0 ? (
              <p className="text-xs text-text-secondary py-3">Este paciente todavía no tiene citas registradas.</p>
            ) : (
              <div className="divide-y divide-border-subtle">
                {recentAppointments.map(appointment => (
                  <div key={appointment.id} className="py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-2.5 min-w-0">
                      {appointment.modality === 'virtual'
                        ? <Video className="w-4 h-4 mt-0.5 shrink-0 text-brand-strong" aria-hidden="true" />
                        : <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-brand-strong" aria-hidden="true" />}
                      <div>
                        <p className="text-xs font-semibold text-text-primary">{formatDateTime(appointment.startsAt)} · {appointment.durationMinutes} min</p>
                        <p className="text-[11px] text-text-secondary mt-0.5">{appointment.modality === 'virtual' ? 'Virtual' : 'Presencial'}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <Badge variant={appointmentStatusVariant[appointment.status]}>{appointmentStatusLabel[appointment.status]}</Badge>
                      <Badge variant={paymentStatusVariant[appointment.paymentStatus]}>{paymentStatusLabel[appointment.paymentStatus]}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="space-y-3 sm:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-3"><div><h3 className="text-sm font-bold text-text-primary flex items-center gap-2"><ListChecks className="w-4 h-4 text-brand-strong" />Próximos pasos</h3><p className="text-xs text-text-secondary mt-1">Checks y comentarios visibles únicamente para el paciente y su profesional autorizado.</p></div><Button asChild variant="secondary" size="sm"><Link to="/professional/next-steps">Gestionar listas</Link></Button></div>
            {!patientNextSteps ? <p className="text-xs text-text-secondary py-3">Este paciente todavía no tiene una lista activa.</p> : <><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold text-text-primary">{patientNextSteps.title}</p><p className="text-[11px] text-text-secondary mt-1">{patientNextSteps.items.filter(item => item.completed).length} de {patientNextSteps.items.length} tareas completadas · {patientNextSteps.durationDays} días</p></div><Badge variant="info">Activa</Badge></div><div className="space-y-2">{patientNextSteps.items.map(item => <div key={item.id} className="rounded-xl bg-surface-subtle p-3 grid grid-cols-[18px_minmax(0,1fr)] gap-2"><CheckCircle2 className={`w-4 h-4 mt-0.5 ${item.completed ? 'text-semantic-success' : 'text-text-tertiary'}`} /><div><p className={`text-xs ${item.completed ? 'line-through text-text-secondary' : 'text-text-primary'}`}>{item.text}</p>{item.patientComment && <p className="text-[11px] text-text-secondary italic mt-1 flex items-start gap-1"><MessageSquareText className="w-3 h-3 mt-0.5 shrink-0" />{item.patientComment}</p>}</div></div>)}</div></>}
          </Card>
        </div>
      )}

      {activeTab === 'checkins' && (
        <div id="panel-checkins" role="tabpanel" aria-labelledby="tab-checkins">
          <Card className="space-y-4">
            <h3 className="text-sm font-bold text-text-primary border-b border-border-subtle pb-2">
              Asignaciones y Respuestas
            </h3>

            {patientAssignments.length === 0 ? (
              <p className="text-xs text-text-secondary">No hay check-ins asignados a este paciente aún.</p>
            ) : (
              <div className="space-y-3">
                {patientAssignments.map(assign => {
                  const resp = patientResponses.find(r => r.assignmentId === assign.id);
                  return (
                    <div key={assign.id} className="p-3 bg-surface-subtle rounded-xl border border-border-subtle text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-text-primary flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-brand-strong" />
                          Vencimiento: {formatShortDate(assign.dueDate)}
                        </span>
                        {/* STATUS-01 */}
                        <Badge
                          variant={
                            assign.status === 'completed'
                              ? 'active'
                              : assign.status === 'expired'
                              ? 'high'
                              : 'pending'
                          }
                        >
                          {assign.status === 'completed'
                            ? 'Completado'
                            : assign.status === 'expired'
                            ? 'Vencido'
                            : 'Pendiente'}
                        </Badge>
                      </div>

                      {resp && (
                        <div className="pt-2 border-t border-border-subtle space-y-1 text-text-primary">
                          <p>⚡ <strong>Energía:</strong> {resp.energyScore}/5</p>
                          <p>🥗 <strong>Adherencia:</strong> {resp.adherenceScore}/5</p>
                          {resp.sleepScore && <p>🌙 <strong>Sueño:</strong> {resp.sleepScore}/5</p>}
                          {resp.digestionScore && <p>◌ <strong>Digestión:</strong> {resp.digestionScore}/5</p>}
                          {resp.satietyScore && <p>◒ <strong>Hambre y saciedad:</strong> {resp.satietyScore}/5</p>}
                          <p>🆘 <strong>Solicitó ayuda:</strong> {resp.helpRequested ? 'Sí 🔴' : 'No 🟢'}</p>
                          {resp.notes && <p className="text-text-secondary italic">"{resp.notes}"</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'anthropometry' && (
        <div id="panel-anthropometry" role="tabpanel" aria-labelledby="tab-anthropometry" className="space-y-4">
          <Card className="space-y-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="text-base font-bold text-text-primary flex items-center gap-2"><Ruler className="w-5 h-5 text-brand-strong" />Información antropométrica</h3><p className="mt-1 text-xs text-text-secondary">Revisiones registradas por la profesional. Cada columna es opcional y representa una métrica de la misma consulta.</p></div><Button size="sm" onClick={() => openAnthropometryDialog()}><Plus className="w-4 h-4" />Nueva medición</Button></div>
            <div className="rounded-xl border border-border-subtle p-4 space-y-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-center gap-2"><BarChart3 className="w-4 h-4 text-brand-strong" /><h4 className="text-sm font-bold text-text-primary">Evolución por métrica</h4></div><div className="flex flex-col gap-2 sm:flex-row"><select aria-label="Métrica a graficar" className="form-control min-w-48" value={anthropometryMetric} onChange={event => setAnthropometryMetric(event.target.value)}>{allAnthropometricMetrics.map(metric => <option key={metric.key} value={metric.key}>{metric.label} ({metric.unit})</option>)}</select><div className="inline-flex rounded-xl bg-surface-subtle p-1" role="group" aria-label="Período de antropometría">{([['7d', '7 días'], ['15d', '15 días'], ['30d', '30 días'], ['lastMonth', 'Mes pasado'], ['custom', 'Personalizado']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setAnthropometryPeriod(value)} className={`rounded-lg px-2.5 py-2 text-[11px] font-semibold ${anthropometryPeriod === value ? 'bg-white text-brand-strong shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>{label}</button>)}</div></div></div>
              {anthropometryPeriod === 'custom' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="form-label">Desde</label><input className="form-control" type="date" max={localDateInputValue()} value={anthropometryCustomRange.from} onChange={event => setAnthropometryCustomRange(current => ({ ...current, from: event.target.value }))} /></div><div><label className="form-label">Hasta</label><input className="form-control" type="date" max={localDateInputValue()} value={anthropometryCustomRange.to} onChange={event => setAnthropometryCustomRange(current => ({ ...current, to: event.target.value }))} /></div></div>}
              {anthropometryChartRows.length ? <div className="h-44 flex items-end gap-3 overflow-x-auto pt-4">{anthropometryChartRows.map(item => { const value = getAnthropometryValue(item, selectedAnthropometryMetric.key)!; const height = anthropometryMin === anthropometryMax ? 76 : 38 + ((value - anthropometryMin) / (anthropometryMax - anthropometryMin)) * 80; return <div key={item.id} className="flex min-w-14 flex-1 flex-col justify-end text-center h-full"><p className="mb-1 text-[10px] font-semibold text-brand-strong">{value}</p><div className="mx-auto w-full max-w-10 rounded-t-lg bg-brand-primary" style={{ height: `${height}px` }} /><p className="mt-2 text-[10px] text-text-secondary whitespace-nowrap">{new Date(item.recordedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}</p></div>; })}</div> : <p className="rounded-xl bg-surface-subtle p-5 text-center text-xs text-text-secondary">No hay registros de {selectedAnthropometryMetric.label.toLocaleLowerCase()} en este período.</p>}
              <p className="text-[11px] text-text-tertiary">Lectura descriptiva de los valores registrados; no emite juicios ni proyecciones.</p>
            </div>
          </Card>
          <Card className="space-y-4"><div><h3 className="text-sm font-bold text-text-primary">Comparar revisiones</h3><p className="mt-1 text-xs text-text-secondary">Elegí dos fechas para ver solamente la diferencia registrada entre ambas, sin interpretaciones.</p></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="form-label">Revisión inicial</label><select className="form-control" value={comparisonStartId} onChange={event => setComparisonStartId(event.target.value)}><option value="">Elegir fecha</option>{professionalAnthropometry.map(item => <option key={item.id} value={item.id}>{new Date(item.recordedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}</option>)}</select></div><div><label className="form-label">Revisión a comparar</label><select className="form-control" value={comparisonEndId} onChange={event => setComparisonEndId(event.target.value)}><option value="">Elegir fecha</option>{professionalAnthropometry.map(item => <option key={item.id} value={item.id}>{new Date(item.recordedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}</option>)}</select></div></div>{comparisonStart && comparisonEnd && comparisonStart.id !== comparisonEnd.id && <div className="overflow-x-auto rounded-xl border border-border-subtle"><table className="min-w-full text-left text-xs"><thead className="bg-surface-subtle text-text-secondary"><tr><th className="px-4 py-3 font-semibold">Métrica</th><th className="px-4 py-3 font-semibold">Inicial</th><th className="px-4 py-3 font-semibold">Comparada</th><th className="px-4 py-3 font-semibold">Diferencia</th></tr></thead><tbody className="divide-y divide-border-subtle">{allAnthropometricMetrics.map(metric => { const start = getAnthropometryValue(comparisonStart, metric.key); const end = getAnthropometryValue(comparisonEnd, metric.key); if (start === undefined && end === undefined) return null; const diff = start !== undefined && end !== undefined ? end - start : null; return <tr key={metric.key}><td className="px-4 py-3 font-semibold text-text-primary">{metric.label}</td><td className="px-4 py-3 text-text-secondary">{start === undefined ? '—' : `${start} ${metric.unit}`}</td><td className="px-4 py-3 text-text-secondary">{end === undefined ? '—' : `${end} ${metric.unit}`}</td><td className="px-4 py-3 font-semibold text-brand-strong">{diff === null ? '—' : `${diff > 0 ? '+' : ''}${diff.toFixed(1)} ${metric.unit}`}</td></tr>; })}</tbody></table></div>}</Card>
          <Card className="p-0 overflow-hidden"><div className="flex flex-col gap-1 border-b border-border-subtle p-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-bold text-text-primary">Tabla de revisiones</h3><p className="mt-1 text-[11px] text-text-secondary">En escritorio podés desplazar la tabla; en móvil cada revisión se lee como una tarjeta.</p></div><Badge variant="info">{professionalAnthropometry.length} revisiones</Badge></div>{professionalAnthropometry.length === 0 ? <p className="p-6 text-sm text-text-secondary">Todavía no hay revisiones antropométricas.</p> : <><div className="hidden md:block overflow-x-auto"><table className="min-w-max w-full text-left text-xs"><thead className="bg-surface-subtle text-text-secondary"><tr><th className="sticky left-0 bg-surface-subtle px-4 py-3 font-semibold">Fecha</th>{allAnthropometricMetrics.map(metric => <th key={metric.key} className="px-4 py-3 font-semibold whitespace-nowrap">{metric.label} ({metric.unit})</th>)}<th className="px-4 py-3 font-semibold">Acciones</th></tr></thead><tbody className="divide-y divide-border-subtle">{professionalAnthropometry.map(item => <tr key={item.id} className="hover:bg-surface-subtle/50"><td className="sticky left-0 bg-surface px-4 py-3 font-semibold text-text-primary whitespace-nowrap"><div>{new Date(item.recordedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}</div><MeasurementNote note={item.note} /></td>{allAnthropometricMetrics.map(metric => { const value = getAnthropometryValue(item, metric.key); return <td key={metric.key} className="px-4 py-3 text-text-secondary whitespace-nowrap">{value === undefined ? '—' : `${value} ${metric.unit}`}</td>; })}<td className="px-4 py-3 whitespace-nowrap"><div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => openAnthropometryDialog(item)}>Editar</Button><Button size="sm" variant="ghost" className="text-danger" onClick={() => removeAnthropometry(item.id)}>Eliminar</Button></div></td></tr>)}</tbody></table></div><div className="divide-y divide-border-subtle md:hidden">{professionalAnthropometry.map(item => <article key={item.id} className="p-4 space-y-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-text-primary">{new Date(item.recordedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}</p><MeasurementNote note={item.note} /></div><div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => openAnthropometryDialog(item)}>Editar</Button><Button size="sm" variant="ghost" className="text-danger" onClick={() => removeAnthropometry(item.id)}>Eliminar</Button></div></div><dl className="grid grid-cols-2 gap-x-3 gap-y-2">{allAnthropometricMetrics.map(metric => { const value = getAnthropometryValue(item, metric.key); return value === undefined ? null : <div key={metric.key}><dt className="text-[10px] text-text-secondary">{metric.label}</dt><dd className="text-xs font-semibold text-text-primary">{value} {metric.unit}</dd></div>; })}</dl></article>)}</div></>}</Card>
        </div>
      )}

      {activeTab === 'tracking' && (
        <div id="panel-tracking" role="tabpanel" aria-labelledby="tab-tracking" className="space-y-4">
          <Card className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-text-primary flex items-center gap-2"><Ruler className="w-5 h-5 text-brand-strong" />Seguimiento de peso</h3>
                <p className="text-xs text-text-secondary mt-1">Lectura descriptiva del peso registrado, sin juicios ni proyecciones.</p>
              </div>
              <Button size="sm" onClick={() => setIsMeasurementOpen(true)}><Plus className="w-4 h-4" />Registrar peso</Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl bg-surface-subtle p-3"><p className="text-[11px] text-text-secondary">Último peso registrado{latestWeightMeasurement ? ` (${new Date(latestWeightMeasurement.recordedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })})` : ''}</p><p className="text-xl font-bold text-text-primary mt-1">{latestWeightMeasurement?.weightKg ?? '—'}{latestWeightMeasurement ? ' kg' : ''}</p></div>
              <div className="rounded-xl bg-surface-subtle p-3"><p className="text-[11px] text-text-secondary">Cambio del período</p><p className="text-xl font-bold text-text-primary mt-1">{weightChange === null ? '—' : `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} kg`}</p></div>
              <div className="rounded-xl bg-surface-subtle p-3"><p className="text-[11px] text-text-secondary">Cambio de peso desde inicio</p><p className="text-xl font-bold text-text-primary mt-1">{changeFromInitialWeight === null ? '—' : `${changeFromInitialWeight > 0 ? '+' : ''}${changeFromInitialWeight.toFixed(1)} kg`}</p><p className="mt-1 text-[10px] text-text-tertiary">{patient.initialWeightKg === undefined ? 'Sin peso inicial declarado' : `Inicial: ${patient.initialWeightKg} kg`}</p></div>
            </div>

            <div className="rounded-xl border border-border-subtle p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-semibold text-text-primary">Evolución de peso</p>
                <div className="inline-flex w-full sm:w-auto rounded-xl bg-surface-subtle p-1" role="group" aria-label="Período de evolución de peso">
                  {([
                    ['7d', '7 días'],
                    ['30d', '30 días'],
                    ['3m', '3 meses'],
                    ['all', 'Todo'],
                  ] as const).map(([period, label]) => (
                    <button key={period} type="button" onClick={() => setWeightPeriod(period)} className={`flex-1 sm:flex-none rounded-lg px-3 py-2 text-[11px] font-semibold transition-colors ${weightPeriod === period ? 'bg-white text-brand-strong shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>{label}</button>
                  ))}
                </div>
              </div>
              {visibleWeightMeasurements.length >= 3 ? (
                <div className="mt-4 overflow-x-auto">
                  <div className="relative h-40 min-w-[360px] flex items-end gap-2" aria-label="Evolución de peso descriptiva">
                    {showWeightTrendLine && <svg className="pointer-events-none absolute inset-x-3 top-4 h-28 w-[calc(100%-1.5rem)]" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points={weightTrendPoints} fill="none" stroke="#357984" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" /></svg>}
                    {visibleWeightMeasurements.map(item => {
                      const height = visibleWeightMax === visibleWeightMin ? 72 : 36 + ((item.weightKg! - visibleWeightMin) / (visibleWeightMax - visibleWeightMin)) * 76;
                      return <div key={item.id} className="relative z-10 flex-1 min-w-0 text-center flex flex-col justify-end h-full"><p className="mb-1 text-[10px] font-semibold text-brand-strong">{item.weightKg}</p><div className="mx-auto w-full max-w-10 rounded-t-lg bg-brand-primary" style={{ height: `${height}px` }} title={`${item.weightKg} kg`} /><p className="mt-2 text-[10px] text-text-secondary whitespace-nowrap">{new Date(item.recordedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}</p></div>;
                    })}
                  </div>
                </div>
              ) : <p className="py-8 text-center text-xs text-text-secondary">Seleccioná un período con al menos tres registros para ver la evolución.</p>}
              {visibleWeightMeasurements.length >= 3 && <label className="mt-3 inline-flex min-h-9 cursor-pointer items-center gap-2 text-[11px] font-medium text-text-secondary"><input type="checkbox" checked={showWeightTrendLine} onChange={event => setShowWeightTrendLine(event.target.checked)} className="h-4 w-4 rounded border-border-hover accent-brand-strong" />Mostrar línea de tendencia</label>}
              <p className="mt-3 text-[11px] text-text-tertiary">Muestra el cambio registrado en el período; no proyecta valores futuros.</p>
            </div>
          </Card>
          <Card className="p-0 overflow-hidden"><div className="p-4 border-b border-border-subtle"><h3 className="text-sm font-bold text-text-primary">Historial de peso</h3></div>{patientMeasurements.length === 0 ? <p className="p-6 text-sm text-text-secondary">Todavía no hay pesos registrados.</p> : <div className="divide-y divide-border-subtle">{patientMeasurements.map(item => <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div><p className="text-sm font-bold text-text-primary">{new Date(item.recordedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}</p><p className="text-[11px] text-text-secondary mt-1">Registrado por {item.recordedBy === 'patient' ? 'el paciente' : 'la profesional'}</p></div><Badge variant="info">Peso {item.weightKg} kg</Badge></div>)}</div>}</Card>
        </div>
      )}

      {activeTab === 'plan' && (
        <div id="panel-plan" role="tabpanel" aria-labelledby="tab-plan" className="space-y-4">
          {activePatientPlans.map(assignment => {
            const total = assignment.snapshotDays.reduce((sum, day) => sum + day.meals.length, 0);
            const records = mealAdherenceRecords.filter(record => record.patientId === patient.id && record.assignmentId === assignment.id && record.completed);
            const completedKeys = new Set(records.map(record => `${record.dayId}:${record.mealId}`));
            return <Card key={`tracking-${assignment.id}`} className="space-y-4"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h3 className="text-sm font-bold text-text-primary flex items-center gap-2"><TrendingUp className="w-4 h-4 text-brand-strong" />Seguimiento del plan</h3><p className="text-xs text-text-secondary mt-1">{assignment.templateName} · información marcada por {patient.firstName}.</p></div><div className="text-left sm:text-right"><p className="text-xl font-bold text-brand-strong">{total ? Math.round(records.length / total * 100) : 0}%</p><p className="text-[10px] text-text-secondary">{records.length} de {total} comidas</p></div></div><div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">{assignment.snapshotDays.map(day => { const done = day.meals.filter(meal => completedKeys.has(`${day.id}:${meal.id}`)).length; return <div key={day.id} className="rounded-xl bg-surface-subtle border border-border-subtle p-2.5"><p className="text-[11px] font-bold text-text-primary">{day.label.split(' · ')[0]}</p><p className="text-[10px] text-text-secondary mt-1">{done}/{day.meals.length} comidas</p></div>; })}</div><p className="text-[10px] text-text-tertiary">Una comida sin marcar se interpreta como “sin respuesta”, no como incumplida.</p></Card>;
          })}
          <Card className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
              <div><h3 className="text-sm font-bold text-text-primary flex items-center gap-2"><ClipboardList className="w-4 h-4 text-brand-strong" />Planes activos</h3><p className="text-xs text-text-secondary mt-1">Un principal y un complemento opcional.</p></div>
              <Button asChild variant="primary" size="sm"><Link to="/professional/meal-plans">Asignar desde biblioteca</Link></Button>
            </div>
            {activePatientPlans.length === 0 ? <p className="text-xs text-text-secondary py-6 text-center">Este paciente todavía no tiene un plan activo.</p> : <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{activePatientPlans.map(assignment => <div key={assignment.id} className="rounded-xl bg-surface-subtle border border-border-subtle p-4"><div className="flex items-start justify-between gap-2"><div><Badge variant={assignment.kind === 'primary' ? 'active' : 'info'}>{assignment.kind === 'primary' ? 'Principal' : 'Complemento'}</Badge><p className="text-sm font-bold text-text-primary mt-2">{assignment.templateName}</p><p className="text-xs text-text-secondary mt-1">Asignado {formatShortDate(assignment.assignedAt)}</p></div><Button variant="ghost" size="sm" onClick={() => { try { endMealPlanAssignment(patient.id, assignment.kind); showToast('Plan retirado', 'La asignación pasó al historial sin eliminar la plantilla.'); } catch (error) { showToast('Error', error instanceof Error ? error.message : 'No se pudo retirar.', 'error'); } }}>Quitar</Button></div></div>)}</div>}
          </Card>
          <Card className="space-y-3"><h3 className="text-sm font-bold text-text-primary flex items-center gap-2"><History className="w-4 h-4 text-brand-strong" />Historial</h3>{patientPlanAssignments.filter(item => item.status === 'ended').length === 0 ? <p className="text-xs text-text-secondary">Todavía no hay asignaciones anteriores.</p> : patientPlanAssignments.filter(item => item.status === 'ended').map(assignment => <div key={assignment.id} className="flex items-center justify-between gap-3 py-3 border-t border-border-subtle"><div><p className="text-xs font-semibold text-text-primary">{assignment.templateName}</p><p className="text-[11px] text-text-secondary">{assignment.kind === 'primary' ? 'Plan principal' : 'Complemento'} · {formatShortDate(assignment.assignedAt)} a {assignment.endedAt ? formatShortDate(assignment.endedAt) : '—'}</p></div><Badge variant="neutral">Finalizado</Badge></div>)}</Card>
        </div>
      )}

      {activeTab === 'recommendations' && (
        <div id="panel-recommendations" role="tabpanel" aria-labelledby="tab-recommendations">
          <Card className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <h3 className="text-sm font-bold text-text-primary">Recomendaciones enviadas</h3>
              <Button variant="primary" size="sm" onClick={() => setIsRecModalOpen(true)}>
                + Emitir nueva
              </Button>
            </div>

            {patientRecs.length === 0 ? (
              <p className="text-xs text-text-secondary">No hay recomendaciones emitidas para este paciente.</p>
            ) : (
              <div className="space-y-3">
                {patientRecs.map(rec => {
                  const sourceResponse = rec.responseId ? patientResponses.find(response => response.id === rec.responseId) : undefined;
                  return (
                  <div key={rec.id} className="p-4 bg-surface-tinted border border-border-subtle rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between text-brand-strong font-semibold">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#1E5235]" /> Recomendación emitida
                      </span>
                      <span className="text-[11px] text-text-tertiary">{formatDateTime(rec.createdAt)}</span>
                    </div>
                    <p className="text-text-primary font-medium text-sm pt-1">"{rec.recommendationText}"</p>
                    <p className="text-[10px] text-text-tertiary pt-1">
                      {sourceResponse ? `Vinculada al check-in del ${formatShortDate(sourceResponse.submittedAt)}` : 'Recomendación general, sin check-in de origen'}
                    </p>
                  </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Dialog Accesible Radix UI */}
      <Dialog
        isOpen={isRecModalOpen}
        onClose={() => setIsRecModalOpen(false)}
        title={`Emitir recomendación para ${patient.firstName}`}
        description="Escribí el mensaje que verá el paciente. Si existe un check-in reciente, quedará vinculado automáticamente como origen."
      >
        <form onSubmit={handleSubmit(onCreateRecommendation)} className="space-y-4" noValidate>
          <div>
            <label htmlFor="rec-text" className="block text-xs font-medium text-text-primary mb-1">
              Texto de la recomendación *
            </label>
            <textarea
              id="rec-text"
              rows={3}
              {...register('recommendationText')}
              aria-invalid={!!errors.recommendationText}
              aria-describedby={errors.recommendationText ? 'rec-error' : undefined}
              placeholder="Ej. Pequeños hábitos, grandes cambios. Mantén un vaso de agua al despertar..."
              className="w-full px-3 py-2 text-xs bg-surface-subtle border border-border-subtle rounded-xl focus:ring-2 focus:ring-brand-strong text-text-primary"
            />
            {errors.recommendationText && (
              <p id="rec-error" className="text-xs text-[#902A24] font-semibold mt-1">
                {errors.recommendationText.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border-subtle">
            <Button variant="secondary" type="button" onClick={() => setIsRecModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Enviar recomendación
            </Button>
          </div>
        </form>
      </Dialog>
      <Dialog isOpen={isMeasurementOpen} onClose={() => setIsMeasurementOpen(false)} title={`Registrar peso de ${patient.firstName}`} description="Podés cargar una fecha anterior. Si el valor parece inusual, el sistema te pedirá confirmación.">
        <div className="space-y-4"><div><label htmlFor="measurement-date" className="form-label">Fecha</label><input id="measurement-date" type="date" max={localDateInputValue()} className="form-control" value={measurement.recordedAt} onChange={event => setMeasurement(current => ({ ...current, recordedAt: event.target.value }))} /></div><div><label htmlFor="measurement-weight" className="form-label">Peso (kg)</label><input id="measurement-weight" min="1" step="0.1" type="number" className="form-control" value={measurement.weightKg} onChange={event => setMeasurement(current => ({ ...current, weightKg: event.target.value }))} /></div><div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setIsMeasurementOpen(false)}>Cancelar</Button><Button type="button" onClick={saveMeasurement}>Guardar peso</Button></div></div>
      </Dialog>
      <Dialog isOpen={isAnthropometryOpen} onClose={() => { setIsAnthropometryOpen(false); setEditingAnthropometryId(null); }} title={`${editingAnthropometryId ? 'Editar' : 'Nueva'} medición de ${patient.firstName}`} description="La fecha corresponde a esta revisión. Completá sólo las métricas disponibles; no se puede cargar una fecha futura.">
        <div className="space-y-4"><div><label htmlFor="anthropometry-date" className="form-label">Fecha de la revisión</label><input id="anthropometry-date" type="date" max={localDateInputValue()} className="form-control" value={anthropometryInput.recordedAt ?? ''} onChange={event => setAnthropometryInput(current => ({ ...current, recordedAt: event.target.value }))} /></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{inputAnthropometricMetrics.map(metric => <div key={metric.key}><label htmlFor={`anthropometry-${metric.key}`} className="form-label">{metric.label} ({metric.unit})</label><input id={`anthropometry-${metric.key}`} type="number" min="0" step="0.1" className="form-control" value={anthropometryInput[metric.key] ?? ''} onChange={event => setAnthropometryInput(current => ({ ...current, [metric.key]: event.target.value }))} /></div>)}</div><div><label htmlFor="anthropometry-note" className="form-label">Nota de la revisión <span className="font-normal text-text-tertiary">(opcional)</span></label><textarea id="anthropometry-note" rows={3} maxLength={500} className="form-control" placeholder="Ej.: medición en ayunas, método o contexto relevante" value={anthropometryInput.note ?? ''} onChange={event => setAnthropometryInput(current => ({ ...current, note: event.target.value }))} /></div><div className="flex justify-end gap-2 border-t border-border-subtle pt-3"><Button type="button" variant="secondary" onClick={() => { setIsAnthropometryOpen(false); setEditingAnthropometryId(null); }}>Cancelar</Button><Button type="button" onClick={saveAnthropometry}>{editingAnthropometryId ? 'Guardar cambios' : 'Guardar revisión'}</Button></div></div>
      </Dialog>
    </div>
  );
};
import { MeasurementNote } from '../../../components/domain/MeasurementNote';
