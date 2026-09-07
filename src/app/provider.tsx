import React, { createContext, useContext, useState, useMemo } from 'react';
import type { Organization, OrganizationPlan, OrganizationStatus, PaymentRecord, ResponsibleMember, ProfessionalInvitation, Patient, CheckInAssignment, CheckInResponse, Recommendation, ProfessionalResource, ProfessionalRecipe, PublicationStatus, MealPlanAssignment, MealPlanAssignmentKind, MealPlanStatus, MealPlanTemplate, Nutritionist, MotivationalPhrase, PatientNextStepList, MealAdherenceRecord, Appointment, AppointmentPaymentMovement, AppointmentNotification, AppointmentNotificationKind, AppointmentChangeRequest, ProfessionalPracticeSettings, AnthropometricMeasurement } from '../types';
import { createInitialMockData } from '../mocks/mockData';
import { evaluateCheckInAlerts } from '../mocks/alertEngine';
import { advanceBillingDate, PLAN_PRICES, PLAN_STORAGE_LIMITS } from '../lib/adminCommercial';
import type {
  MockContextType,
  NewOrganizationInput,
  NewPatientInput,
  NewProfessionalRecipeInput,
  NewProfessionalResourceInput,
  RegisterPaymentInput,
  NewMealPlanInput,
  UpdateProfessionalProfileInput,
  NextStepListInput,
  NewAppointmentInput,
  PatientAppointmentRequestInput,
  PatientAppointmentChangeRequestInput,
  AnthropometricMeasurementInput,
  NewAppointmentPaymentInput,
  NewAppointmentRefundInput,
  UpdatePracticeSettingsInput,
  UpdateOrganizationBrandingInput,
} from './mock-context.types';
import {
  deriveNutritionistsWithCounts,
  deriveOrganizationsWithCounts,
  selectProfessionalPatients,
  selectProfessionalAlerts,
  selectProfessionalAssignments,
  selectProfessionalRecommendations,
  selectProfessionalResources,
  selectProfessionalRecipes,
  selectPublishedPatientResources,
  selectPublishedPatientRecipes,
} from '../mocks/selectors';

const MockContext = createContext<MockContextType | undefined>(undefined);

export const MockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mockState, setMockState] = useState(() => createInitialMockData());
  const [currentDemoPatientId, setCurrentDemoPatientId] = useState<string>('pat-1');
  const [currentDemoNutritionistId, setCurrentDemoNutritionistId] = useState<string>('nutri-1');

  const {
    organizations: rawOrganizations,
    nutritionists: rawNutritionists,
    patients,
    checkInAssignments,
    checkInResponses,
    alerts,
    recommendations,
    motivationalPhrases,
    professionalResources: allProfessionalResources,
    professionalRecipes: allProfessionalRecipes,
    mealPlanTemplates: allMealPlanTemplates,
    mealPlanAssignments: allMealPlanAssignments,
    nextStepLists: allNextStepLists,
    mealAdherenceRecords,
    appointments: allAppointments,
    appointmentPaymentMovements: allAppointmentPaymentMovements,
    appointmentNotifications: allAppointmentNotifications,
    appointmentChangeRequests: allAppointmentChangeRequests,
    professionalPracticeSettings: allProfessionalPracticeSettings,
    anthropometricMeasurements: allAnthropometricMeasurements,
  } = mockState;

  // Derivar Profesional Simulado Actual
  const currentDemoNutritionist = useMemo(
    () => rawNutritionists.find(n => n.id === currentDemoNutritionistId) || null,
    [rawNutritionists, currentDemoNutritionistId]
  );

  // Derivar Paciente Simulado Actual
  const currentDemoPatient = useMemo(
    () => patients.find(p => p.id === currentDemoPatientId) || null,
    [patients, currentDemoPatientId]
  );

  // DATA-01: Derivar contadores dinámicamente sin duplicidad en el estado
  const nutritionists = useMemo(
    () => deriveNutritionistsWithCounts(rawNutritionists, patients),
    [rawNutritionists, patients],
  );

  const organizations = useMemo(
    () => deriveOrganizationsWithCounts(rawOrganizations, nutritionists, patients),
    [rawOrganizations, nutritionists, patients],
  );

  // SCOPE-01: Selectores Derivados para el Profesional Actual
  const professionalPatients = useMemo(
    () => selectProfessionalPatients(patients, currentDemoNutritionist),
    [patients, currentDemoNutritionist],
  );

  const professionalAlerts = useMemo(
    () => selectProfessionalAlerts(alerts, professionalPatients),
    [alerts, professionalPatients],
  );

  const professionalAssignments = useMemo(
    () => selectProfessionalAssignments(checkInAssignments, professionalPatients),
    [checkInAssignments, professionalPatients],
  );

  const professionalRecommendations = useMemo(
    () => selectProfessionalRecommendations(recommendations, professionalPatients),
    [recommendations, professionalPatients],
  );

  const professionalMotivationalPhrases = useMemo(
    () => currentDemoNutritionist
      ? motivationalPhrases.filter(phrase => phrase.organizationId === currentDemoNutritionist.organizationId && phrase.ownerNutritionistId === currentDemoNutritionist.id)
      : [],
    [motivationalPhrases, currentDemoNutritionist],
  );

  const addMotivationalPhrase = (text: string): MotivationalPhrase => {
    const trimmedText = text.trim();
    if (!currentDemoNutritionist || !trimmedText) throw new Error('Escribí una frase válida.');
    const phrase: MotivationalPhrase = { id: `phrase-${crypto.randomUUID()}`, organizationId: currentDemoNutritionist.organizationId, ownerNutritionistId: currentDemoNutritionist.id, text: trimmedText, createdAt: new Date().toISOString() };
    setMockState(prev => ({ ...prev, motivationalPhrases: [phrase, ...prev.motivationalPhrases] }));
    return phrase;
  };

  const duplicateMotivationalPhrase = (id: string): MotivationalPhrase => {
    const source = professionalMotivationalPhrases.find(phrase => phrase.id === id);
    if (!source) throw new Error('La frase no está disponible.');
    return addMotivationalPhrase(`${source.text} (copia)`);
  };

  const updateMotivationalPhrase = (id: string, text: string): MotivationalPhrase => {
    const current = professionalMotivationalPhrases.find(phrase => phrase.id === id);
    const trimmedText = text.trim();
    if (!current || !trimmedText) throw new Error('Escribí una frase válida.');
    const updated = { ...current, text: trimmedText };
    setMockState(prev => ({
      ...prev,
      motivationalPhrases: prev.motivationalPhrases.map(phrase => phrase.id === id ? updated : phrase),
      recommendations: prev.recommendations.map(rec => rec.phraseId === id ? { ...rec, recommendationText: trimmedText } : rec),
    }));
    return updated;
  };

  const deleteMotivationalPhrase = (id: string) => {
    if (!professionalMotivationalPhrases.some(phrase => phrase.id === id)) throw new Error('La frase no está disponible.');
    setMockState(prev => ({ ...prev, motivationalPhrases: prev.motivationalPhrases.filter(phrase => phrase.id !== id), recommendations: prev.recommendations.filter(rec => rec.phraseId !== id) }));
  };

  const setMotivationalPhrasePatients = (id: string, patientIds: string[]) => {
    const phrase = professionalMotivationalPhrases.find(item => item.id === id);
    if (!phrase) throw new Error('La frase no está disponible.');
    if (patientIds.some(patientId => !professionalPatients.some(patient => patient.id === patientId))) throw new Error('Uno de los pacientes no pertenece al profesional actual.');
    const allowedIds = new Set(professionalPatients.map(patient => patient.id));
    const selectedIds = new Set(patientIds);
    const now = new Date().toISOString();
    const newRecommendations: Recommendation[] = patientIds.map(patientId => ({ id: `rec-${crypto.randomUUID()}`, organizationId: phrase.organizationId, patientId, createdBy: currentDemoNutritionistId, recommendationText: phrase.text, phraseId: phrase.id, createdAt: now }));
    setMockState(prev => ({ ...prev, recommendations: [...newRecommendations, ...prev.recommendations.filter(rec => !allowedIds.has(rec.patientId) || (!selectedIds.has(rec.patientId) && rec.phraseId !== id))] }));
  };

  const professionalResources = useMemo(
    () => selectProfessionalResources(allProfessionalResources, currentDemoNutritionist),
    [allProfessionalResources, currentDemoNutritionist],
  );

  const professionalRecipes = useMemo(
    () => selectProfessionalRecipes(allProfessionalRecipes, currentDemoNutritionist),
    [allProfessionalRecipes, currentDemoNutritionist],
  );

  // PATIENT-CONTENT-01: El paciente sólo recibe contenido publicado por su
  // profesional asignado dentro del mismo consultorio.
  const patientResources = useMemo(
    () => selectPublishedPatientResources(allProfessionalResources, currentDemoPatient),
    [allProfessionalResources, currentDemoPatient],
  );

  const patientRecipes = useMemo(
    () => selectPublishedPatientRecipes(allProfessionalRecipes, currentDemoPatient),
    [allProfessionalRecipes, currentDemoPatient],
  );

  const professionalMealPlans = useMemo(
    () => currentDemoNutritionist
      ? allMealPlanTemplates.filter(plan =>
          plan.organizationId === currentDemoNutritionist.organizationId &&
          plan.ownerNutritionistId === currentDemoNutritionist.id
        )
      : [],
    [allMealPlanTemplates, currentDemoNutritionist],
  );

  const professionalMealPlanAssignments = useMemo(() => {
    const patientIds = new Set(professionalPatients.map(patient => patient.id));
    return allMealPlanAssignments.filter(assignment => patientIds.has(assignment.patientId));
  }, [allMealPlanAssignments, professionalPatients]);

  const patientMealPlanAssignments = useMemo(
    () => currentDemoPatient
      ? allMealPlanAssignments.filter(assignment => assignment.patientId === currentDemoPatient.id)
      : [],
    [allMealPlanAssignments, currentDemoPatient],
  );

  const professionalNextStepLists = useMemo(() => currentDemoNutritionist
    ? allNextStepLists.filter(list => list.organizationId === currentDemoNutritionist.organizationId && list.ownerNutritionistId === currentDemoNutritionist.id)
    : [], [allNextStepLists, currentDemoNutritionist]);

  const patientNextStepList = useMemo(() => currentDemoPatient
    ? allNextStepLists.find(list => list.patientId === currentDemoPatient.id) ?? null
    : null, [allNextStepLists, currentDemoPatient]);

  const professionalAppointments = useMemo(() => currentDemoNutritionist
    ? allAppointments.filter(appointment => appointment.organizationId === currentDemoNutritionist.organizationId && appointment.nutritionistId === currentDemoNutritionist.id)
    : [], [allAppointments, currentDemoNutritionist]);

  const professionalAppointmentPaymentMovements = useMemo(() => {
    const appointmentIds = new Set(professionalAppointments.map(item => item.id));
    return allAppointmentPaymentMovements.filter(item => appointmentIds.has(item.appointmentId));
  }, [allAppointmentPaymentMovements, professionalAppointments]);

  const patientAppointmentNotifications = useMemo(
    () => currentDemoPatient
      ? allAppointmentNotifications
          .filter(notification => notification.patientId === currentDemoPatient.id && notification.organizationId === currentDemoPatient.organizationId)
          .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())
      : [],
    [allAppointmentNotifications, currentDemoPatient],
  );

  const professionalAppointmentChangeRequests = useMemo(() => currentDemoNutritionist
    ? allAppointmentChangeRequests.filter(request => request.organizationId === currentDemoNutritionist.organizationId && request.nutritionistId === currentDemoNutritionist.id && request.status === 'pending')
    : [], [allAppointmentChangeRequests, currentDemoNutritionist]);
  const patientAppointmentChangeRequests = useMemo(() => currentDemoPatient
    ? allAppointmentChangeRequests.filter(request => request.organizationId === currentDemoPatient.organizationId && request.patientId === currentDemoPatient.id)
    : [], [allAppointmentChangeRequests, currentDemoPatient]);

  const professionalPracticeSettings = useMemo(
    () => currentDemoNutritionist
      ? allProfessionalPracticeSettings.find(item => item.organizationId === currentDemoNutritionist.organizationId && item.nutritionistId === currentDemoNutritionist.id) ?? null
      : null,
    [allProfessionalPracticeSettings, currentDemoNutritionist],
  );

  const professionalAnthropometricMeasurements = useMemo(() => currentDemoNutritionist
    ? allAnthropometricMeasurements.filter(item => item.organizationId === currentDemoNutritionist.organizationId && professionalPatients.some(patient => patient.id === item.patientId))
    : [], [allAnthropometricMeasurements, currentDemoNutritionist, professionalPatients]);
  const patientAnthropometricMeasurements = useMemo(() => currentDemoPatient
    ? allAnthropometricMeasurements.filter(item => item.patientId === currentDemoPatient.id && item.organizationId === currentDemoPatient.organizationId)
    : [], [allAnthropometricMeasurements, currentDemoPatient]);

  const createAnthropometricMeasurement = (patientId: string, input: AnthropometricMeasurementInput, recordedBy: AnthropometricMeasurement['recordedBy']): AnthropometricMeasurement => {
    const patient = patients.find(item => item.id === patientId);
    const values = [input.weightKg, input.heightCm, input.waistCm, input.hipCm, input.sizeCm, input.bodyFatPercentage, input.muscleMassPercentage, input.hydrationPercentage, input.skinfoldMm, input.visceralFatPercentage, ...Object.values(input.customValues ?? {})].filter(value => value !== undefined);
    const recordedAt = new Date(`${input.recordedAt}T12:00:00`);
    const today = new Date(); today.setHours(23, 59, 59, 999);
    if (!patient || values.length === 0 || values.some(value => !Number.isFinite(value) || value! <= 0) || Number.isNaN(recordedAt.getTime()) || recordedAt > today) throw new Error('Ingresá una medición válida con fecha de hoy o anterior.');
    const measurement: AnthropometricMeasurement = { id: `anthro-${crypto.randomUUID()}`, organizationId: patient.organizationId, patientId, recordedBy, ...input, recordedAt: recordedAt.toISOString() };
    setMockState(prev => ({ ...prev, anthropometricMeasurements: [measurement, ...prev.anthropometricMeasurements] }));
    return measurement;
  };
  const recordProfessionalAnthropometricMeasurement = (patientId: string, input: AnthropometricMeasurementInput) => {
    if (!professionalPatients.some(patient => patient.id === patientId)) throw new Error('No tenés acceso clínico a este paciente.');
    return createAnthropometricMeasurement(patientId, input, 'professional');
  };
  const updateProfessionalAnthropometricMeasurement = (measurementId: string, input: AnthropometricMeasurementInput) => {
    const existing = allAnthropometricMeasurements.find(item => item.id === measurementId);
    if (!existing || existing.recordedBy !== 'professional' || !professionalPatients.some(patient => patient.id === existing.patientId)) throw new Error('No tenés acceso a esta revisión.');
    const values = [input.weightKg, input.heightCm, input.waistCm, input.hipCm, input.sizeCm, input.bodyFatPercentage, input.muscleMassPercentage, input.hydrationPercentage, input.skinfoldMm, input.visceralFatPercentage, ...Object.values(input.customValues ?? {})].filter(value => value !== undefined);
    const recordedAt = new Date(`${input.recordedAt}T12:00:00`); const today = new Date(); today.setHours(23, 59, 59, 999);
    if (values.length === 0 || values.some(value => !Number.isFinite(value) || value! <= 0) || Number.isNaN(recordedAt.getTime()) || recordedAt > today) throw new Error('Ingresá una medición válida con fecha de hoy o anterior.');
    const updated: AnthropometricMeasurement = { ...existing, ...input, recordedAt: recordedAt.toISOString() };
    setMockState(prev => ({ ...prev, anthropometricMeasurements: prev.anthropometricMeasurements.map(item => item.id === measurementId ? updated : item) }));
    return updated;
  };
  const deleteProfessionalAnthropometricMeasurement = (measurementId: string) => {
    const existing = allAnthropometricMeasurements.find(item => item.id === measurementId);
    if (!existing || existing.recordedBy !== 'professional' || !professionalPatients.some(patient => patient.id === existing.patientId)) throw new Error('No tenés acceso a esta revisión.');
    setMockState(prev => ({ ...prev, anthropometricMeasurements: prev.anthropometricMeasurements.filter(item => item.id !== measurementId) }));
  };
  const recordPatientAnthropometricMeasurement = (input: AnthropometricMeasurementInput) => {
    if (!currentDemoPatient) throw new Error('No hay un paciente activo.');
    return createAnthropometricMeasurement(currentDemoPatient.id, input, 'patient');
  };
  const updateOrganizationBranding = (organizationId: string, input: UpdateOrganizationBrandingInput) => {
    const organization = rawOrganizations.find(item => item.id === organizationId);
    if (!organization || organization.plan !== 'CUSTOM') throw new Error('La personalización de marca está disponible sólo para Custom.');
    setMockState(prev => ({ ...prev, organizations: prev.organizations.map(item => item.id === organizationId ? { ...item, branding: input } : item) }));
  };

  const buildAppointmentNotification = (appointment: Appointment, kind: AppointmentNotificationKind, occurredAt = new Date()): AppointmentNotification => {
    const date = new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(appointment.startsAt));
    const modality = appointment.modality === 'virtual' ? 'virtual' : 'presencial';
    const copy: Record<AppointmentNotificationKind, { title: string; message: string }> = {
      created: {
        title: appointment.status === 'requested' ? 'Solicitud de cita enviada' : 'Nueva cita agendada',
        message: appointment.status === 'requested' ? `Tu solicitud de cita ${modality} quedó pendiente de confirmación para ${date}.` : `Tenés una cita ${modality} confirmada para ${date}.`,
      },
      confirmed: {
        title: 'Cita confirmada',
        message: `Tu cita ${modality} para ${date} fue confirmada.`,
      },
      cancelled: {
        title: 'Cita cancelada',
        message: `Tu cita ${modality} de ${date} fue cancelada.`,
      },
      rescheduled: {
        title: 'Cita reprogramada',
        message: `Tu cita ${modality} ahora figura reprogramada para ${date}.`,
      },
    };
    return {
      id: `appointment-notification-${crypto.randomUUID()}`,
      appointmentId: appointment.id,
      organizationId: appointment.organizationId,
      patientId: appointment.patientId,
      kind,
      title: copy[kind].title,
      message: copy[kind].message,
      createdAt: occurredAt.toISOString(),
    };
  };

  const createAppointment = (input: NewAppointmentInput): Appointment => {
    if (!currentDemoNutritionist) throw new Error('No hay un profesional activo seleccionado.');
    const patient = professionalPatients.find(item => item.id === input.patientId);
    const startsAt = new Date(input.startsAt);
    if (!patient || Number.isNaN(startsAt.getTime()) || ![15, 30, 45, 60, 75, 90].includes(input.durationMinutes) || input.quotedAmount < 0) {
      throw new Error('Revisá los datos de la cita.');
    }
    const endsAt = startsAt.getTime() + input.durationMinutes * 60_000;
    const overlaps = professionalAppointments.some(item => {
      if (!['requested', 'confirmed'].includes(item.status)) return false;
      const existingStart = new Date(item.startsAt).getTime();
      const existingEnd = existingStart + item.durationMinutes * 60_000;
      return startsAt.getTime() < existingEnd && endsAt > existingStart;
    });
    if (overlaps) throw new Error('Ese horario se superpone con otra cita.');
    const appointment: Appointment = {
      id: `appointment-${crypto.randomUUID()}`,
      organizationId: currentDemoNutritionist.organizationId,
      patientId: patient.id,
      nutritionistId: currentDemoNutritionist.id,
      startsAt: startsAt.toISOString(),
      durationMinutes: input.durationMinutes,
      modality: input.modality,
      status: input.status ?? 'confirmed',
      quotedAmount: input.quotedAmount,
      currency: input.currency ?? professionalPracticeSettings?.currency ?? 'ARS',
      paymentStatus: input.quotedAmount === 0 ? 'no_charge' : 'pending',
      createdAt: new Date().toISOString(),
    };
    const notification = buildAppointmentNotification(appointment, 'created');
    setMockState(prev => ({
      ...prev,
      appointments: [appointment, ...prev.appointments],
      appointmentNotifications: [notification, ...prev.appointmentNotifications],
    }));
    return appointment;
  };

  const requestAppointmentByPatient = (input: PatientAppointmentRequestInput): Appointment => {
    if (!currentDemoPatient || !currentDemoNutritionist || currentDemoPatient.assignedNutritionistId !== currentDemoNutritionist.id || currentDemoPatient.organizationId !== currentDemoNutritionist.organizationId) {
      throw new Error('No encontramos un profesional habilitado para esta reserva.');
    }
    const startsAt = new Date(input.startsAt);
    if (Number.isNaN(startsAt.getTime()) || ![15, 30, 45, 60, 75, 90].includes(input.durationMinutes)) throw new Error('Revisá el horario seleccionado.');
    const settings = professionalPracticeSettings;
    const weekday = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][startsAt.getDay()] as import('../types').PracticeWeekday;
    const workingDay = settings?.workingDays.find(item => item.day === weekday);
    const minutes = startsAt.getHours() * 60 + startsAt.getMinutes();
    const endMinutes = minutes + input.durationMinutes;
    const gap = settings?.appointmentPolicy.gapMinutes ?? 0;
    const appointmentEndsAt = startsAt.getTime() + input.durationMinutes * 60_000;
    const blocked = settings?.scheduleBlocks.some(item => startsAt.getTime() < new Date(item.endsAt).getTime() && appointmentEndsAt > new Date(item.startsAt).getTime()) ?? false;
    const overlaps = professionalAppointments.some(item => {
      if (!['requested', 'confirmed'].includes(item.status)) return false;
      const existingStart = new Date(item.startsAt).getTime() - gap * 60_000;
      const existingEnd = new Date(item.startsAt).getTime() + item.durationMinutes * 60_000 + gap * 60_000;
      return startsAt.getTime() < existingEnd && appointmentEndsAt > existingStart;
    });
    const fitsWorkingHours = workingDay?.intervals?.length
      ? workingDay.intervals.some(interval => {
        const [startHour = 0, startMinute = 0] = interval.startTime.split(':').map(Number);
        const [endHour = 0, endMinute = 0] = interval.endTime.split(':').map(Number);
        return minutes >= startHour * 60 + startMinute && endMinutes <= endHour * 60 + endMinute;
      })
      : (() => {
        const [startHour = 0, startMinute = 0] = (workingDay?.startTime ?? '00:00').split(':').map(Number);
        const [endHour = 0, endMinute = 0] = (workingDay?.endTime ?? '00:00').split(':').map(Number);
        return minutes >= startHour * 60 + startMinute && endMinutes <= endHour * 60 + endMinute;
      })();
    if (!workingDay?.enabled || !fitsWorkingHours || blocked || overlaps) throw new Error('Ese horario ya no está disponible. Elegí otro para continuar.');
    return createAppointment({
      patientId: currentDemoPatient.id,
      startsAt: input.startsAt,
      durationMinutes: input.durationMinutes,
      modality: input.modality,
      quotedAmount: input.modality === 'virtual' ? settings?.defaultVirtualPrice ?? 0 : settings?.defaultInPersonPrice ?? 0,
      currency: settings?.currency,
      status: 'requested',
    });
  };

  const withdrawPatientAppointmentRequest = (appointmentId: string) => {
    const appointment = allAppointments.find(item => item.id === appointmentId);
    if (!currentDemoPatient || !appointment || appointment.patientId !== currentDemoPatient.id || appointment.status !== 'requested') throw new Error('Sólo podés retirar una solicitud pendiente propia.');
    setMockState(prev => ({ ...prev, appointments: prev.appointments.map(item => item.id === appointmentId ? { ...item, status: 'cancelled_by_patient' as const, billingResolution: 'no_charge' as const, paymentStatus: 'no_charge' as const } : item) }));
  };

  const requestPatientAppointmentChange = (input: PatientAppointmentChangeRequestInput): AppointmentChangeRequest => {
    const appointment = allAppointments.find(item => item.id === input.appointmentId);
    if (!currentDemoPatient || !currentDemoNutritionist || !appointment || appointment.patientId !== currentDemoPatient.id || appointment.nutritionistId !== currentDemoNutritionist.id || appointment.status !== 'confirmed' || new Date(appointment.startsAt).getTime() <= Date.now()) throw new Error('Esta cita ya no admite una solicitud de cambio.');
    if (allAppointmentChangeRequests.some(item => item.appointmentId === appointment.id && item.status === 'pending')) throw new Error('Ya existe una solicitud pendiente para esta cita.');
    if (input.kind === 'reschedule' && (!input.startsAt || !input.durationMinutes || !input.modality)) throw new Error('Elegí un nuevo horario para solicitar la reprogramación.');
    if (input.kind === 'reschedule') {
      const requestedStart = new Date(input.startsAt!).getTime(); const requestedEnd = requestedStart + input.durationMinutes! * 60_000;
      if (Number.isNaN(requestedStart) || requestedStart <= Date.now()) throw new Error('Elegí un horario futuro válido.');
      const overlaps = professionalAppointments.some(item => item.id !== appointment.id && ['requested', 'confirmed'].includes(item.status) && requestedStart < new Date(item.startsAt).getTime() + item.durationMinutes * 60_000 && requestedEnd > new Date(item.startsAt).getTime());
      if (overlaps) throw new Error('Ese horario ya no está disponible. Elegí otro para continuar.');
    }
    const request: AppointmentChangeRequest = { id: `appointment-change-${crypto.randomUUID()}`, organizationId: appointment.organizationId, appointmentId: appointment.id, patientId: appointment.patientId, nutritionistId: appointment.nutritionistId, kind: input.kind, status: 'pending', requestedStartsAt: input.startsAt ? new Date(input.startsAt).toISOString() : undefined, requestedDurationMinutes: input.durationMinutes, requestedModality: input.modality, createdAt: new Date().toISOString() };
    setMockState(prev => ({ ...prev, appointmentChangeRequests: [request, ...prev.appointmentChangeRequests] }));
    return request;
  };

  const resolvePatientAppointmentChange = (requestId: string, decision: 'approved' | 'rejected', billingDecision?: 'no_charge' | 'pending' | 'partial_extra') => {
    const request = professionalAppointmentChangeRequests.find(item => item.id === requestId);
    const appointment = request ? professionalAppointments.find(item => item.id === request.appointmentId) : null;
    if (!request || !appointment) throw new Error('La solicitud no está disponible.');
    if (decision === 'approved' && request.kind === 'cancel' && !billingDecision) throw new Error('Definí cómo queda el cobro antes de aprobar la cancelación.');
    if (decision === 'approved' && request.kind === 'reschedule') {
      rescheduleAppointment(appointment.id, { startsAt: request.requestedStartsAt!, durationMinutes: request.requestedDurationMinutes!, modality: request.requestedModality!, quotedAmount: appointment.quotedAmount });
    }
    if (decision === 'approved' && request.kind === 'cancel') {
      const paymentStatus: Appointment['paymentStatus'] = billingDecision === 'no_charge' ? 'no_charge' : 'pending';
      const updated = { ...appointment, status: 'cancelled_by_patient' as const, billingResolution: billingDecision, paymentStatus };
      const notification = buildAppointmentNotification(updated, 'cancelled');
      setMockState(prev => ({ ...prev, appointments: prev.appointments.map(item => item.id === appointment.id ? updated : item), appointmentNotifications: [notification, ...prev.appointmentNotifications] }));
    }
    setMockState(prev => ({ ...prev, appointmentChangeRequests: prev.appointmentChangeRequests.map(item => item.id === requestId ? { ...item, status: decision, resolvedAt: new Date().toISOString() } : item) }));
  };

  const updateAppointmentStatus = (appointmentId: string, status: Appointment['status']) => {
    const appointment = professionalAppointments.find(item => item.id === appointmentId);
    if (!appointment) throw new Error('La cita no está disponible para el profesional actual.');
    const allowedTransitions: Partial<Record<Appointment['status'], Appointment['status'][]>> = {
      requested: ['confirmed', 'cancelled_by_professional'],
      confirmed: ['completed', 'cancelled_by_professional', 'no_show'],
    };
    if (appointment.status !== status && !allowedTransitions[appointment.status]?.includes(status)) {
      throw new Error('Esta transición no está permitida para el estado actual de la cita.');
    }
    const shouldNotify = appointment.status !== status && (status === 'confirmed' || status === 'rescheduled' || status === 'cancelled_by_patient' || status === 'cancelled_by_professional');
    const notification = shouldNotify
      ? buildAppointmentNotification({ ...appointment, status }, status === 'confirmed' ? 'confirmed' : status === 'rescheduled' ? 'rescheduled' : 'cancelled')
      : null;
    setMockState(prev => ({
      ...prev,
      appointments: prev.appointments.map(item => item.id === appointmentId ? { ...item, status } : item),
      appointmentNotifications: notification ? [notification, ...prev.appointmentNotifications] : prev.appointmentNotifications,
    }));
  };

  const updateAppointment = (appointmentId: string, input: import('./mock-context.types').UpdateAppointmentInput): Appointment => {
    const appointment = professionalAppointments.find(item => item.id === appointmentId);
    const startsAt = new Date(input.startsAt);
    if (!appointment || Number.isNaN(startsAt.getTime()) || ![15, 30, 45, 60, 75, 90].includes(input.durationMinutes) || input.quotedAmount < 0) {
      throw new Error('Revisá los datos de la cita.');
    }
    const alreadyPaid = professionalAppointmentPaymentMovements.filter(item => item.appointmentId === appointmentId).reduce((sum, item) => sum + item.amount, 0);
    if (input.quotedAmount < alreadyPaid) throw new Error('El importe no puede ser menor que lo ya registrado como cobrado.');
    const sameSchedule = appointment.startsAt === startsAt.toISOString() && appointment.durationMinutes === input.durationMinutes && appointment.modality === input.modality;
    if (!['requested', 'confirmed'].includes(appointment.status)) {
      if (appointment.status !== 'completed' || !sameSchedule) throw new Error('En una cita finalizada sólo se puede corregir el importe.');
      const updatedCompleted = { ...appointment, quotedAmount: input.quotedAmount };
      setMockState(prev => ({ ...prev, appointments: prev.appointments.map(item => item.id === appointmentId ? updatedCompleted : item) }));
      return updatedCompleted;
    }
    const endsAt = startsAt.getTime() + input.durationMinutes * 60_000;
    const overlaps = professionalAppointments.some(item => {
      if (item.id === appointmentId || !['requested', 'confirmed'].includes(item.status)) return false;
      const existingStart = new Date(item.startsAt).getTime();
      return startsAt.getTime() < existingStart + item.durationMinutes * 60_000 && endsAt > existingStart;
    });
    if (overlaps) throw new Error('Ese horario se superpone con otra cita.');
    const updated = { ...appointment, ...input, startsAt: startsAt.toISOString() };
    if (!sameSchedule) {
      throw new Error('Para cambiar fecha, duración o modalidad, usá Reprogramar. Así conservamos el historial.');
    }
    setMockState(prev => ({ ...prev, appointments: prev.appointments.map(item => item.id === appointmentId ? updated : item) }));
    return updated;
  };

  const rescheduleAppointment = (appointmentId: string, input: import('./mock-context.types').UpdateAppointmentInput): Appointment => {
    const appointment = professionalAppointments.find(item => item.id === appointmentId);
    const startsAt = new Date(input.startsAt);
    if (!appointment || Number.isNaN(startsAt.getTime()) || ![15, 30, 45, 60, 75, 90].includes(input.durationMinutes) || input.quotedAmount < 0) {
      throw new Error('Revisá los datos de la reprogramación.');
    }
    if (!['requested', 'confirmed'].includes(appointment.status)) throw new Error('Esta cita ya no puede reprogramarse.');
    const alreadyPaid = professionalAppointmentPaymentMovements.filter(item => item.appointmentId === appointmentId).reduce((sum, item) => sum + item.amount, 0);
    if (alreadyPaid > 0) throw new Error('Una cita con cobros registrados no puede reprogramarse desde Agenda. Resolvela primero desde Citas o Ingresos.');
    const endsAt = startsAt.getTime() + input.durationMinutes * 60_000;
    const overlaps = professionalAppointments.some(item => {
      if (item.id === appointmentId || !['requested', 'confirmed'].includes(item.status)) return false;
      const existingStart = new Date(item.startsAt).getTime();
      return startsAt.getTime() < existingStart + item.durationMinutes * 60_000 && endsAt > existingStart;
    });
    if (overlaps) throw new Error('Ese horario se superpone con otra cita.');
    const replacement: Appointment = {
      ...appointment,
      id: `appointment-${crypto.randomUUID()}`,
      startsAt: startsAt.toISOString(),
      durationMinutes: input.durationMinutes,
      modality: input.modality,
      quotedAmount: input.quotedAmount,
      status: 'confirmed',
      paymentStatus: input.quotedAmount === 0 ? 'no_charge' : 'pending',
      rescheduledFromAppointmentId: appointment.id,
      privateNote: undefined,
      createdAt: new Date().toISOString(),
    };
    const notification = buildAppointmentNotification(replacement, 'rescheduled');
    setMockState(prev => ({
      ...prev,
      appointments: [replacement, ...prev.appointments.map(item => item.id === appointmentId ? { ...item, status: 'rescheduled' as const } : item)],
      appointmentNotifications: [notification, ...prev.appointmentNotifications],
    }));
    return replacement;
  };

  const updateAppointmentPrivateNote = (appointmentId: string, note: string) => {
    const appointment = professionalAppointments.find(item => item.id === appointmentId);
    const nextNote = note.trim();
    if (!appointment) throw new Error('La cita no está disponible para el profesional actual.');
    if (nextNote.length > 5000) throw new Error('La nota privada supera los 5.000 caracteres.');
    setMockState(prev => ({ ...prev, appointments: prev.appointments.map(item => item.id === appointmentId ? { ...item, privateNote: nextNote || undefined } : item) }));
  };

  const resolveAppointmentBilling = (appointmentId: string, decision: 'no_charge' | 'pending' | 'partial_extra', amount?: number) => {
    const appointment = professionalAppointments.find(item => item.id === appointmentId);
    if (!appointment || !['cancelled_by_patient', 'cancelled_by_professional', 'no_show'].includes(appointment.status)) {
      throw new Error('Esta cita no requiere una resolución de cobro.');
    }
    if (decision !== 'no_charge' && (!Number.isFinite(amount) || amount === undefined || amount < 0)) {
      throw new Error('Ingresá un importe válido para esta resolución.');
    }
    setMockState(prev => ({
      ...prev,
      appointments: prev.appointments.map(item => item.id === appointmentId ? {
        ...item,
        quotedAmount: decision === 'no_charge' ? item.quotedAmount : amount!,
        paymentStatus: decision === 'no_charge' ? 'no_charge' : 'pending',
        billingResolution: decision,
      } : item),
    }));
  };

  const recordAppointmentPayment = (input: NewAppointmentPaymentInput): AppointmentPaymentMovement => {
    const appointment = professionalAppointments.find(item => item.id === input.appointmentId);
    const occurredAt = new Date(input.occurredAt);
    if (!appointment || input.amount <= 0 || !Number.isFinite(input.amount) || !['cash', 'transfer', 'other'].includes(input.method) || Number.isNaN(occurredAt.getTime()) || occurredAt.getTime() > Date.now()) {
      throw new Error('Revisá los datos del cobro.');
    }
    const movement: AppointmentPaymentMovement = {
      id: `appointment-payment-${crypto.randomUUID()}`,
      appointmentId: appointment.id,
      organizationId: appointment.organizationId,
      amount: input.amount,
      currency: appointment.currency,
      method: input.method,
      kind: 'payment',
      note: input.note?.trim() || undefined,
      occurredAt: occurredAt.toISOString(),
    };
    const total = professionalAppointmentPaymentMovements.filter(item => item.appointmentId === appointment.id).reduce((sum, item) => sum + item.amount, 0) + movement.amount;
    const paymentStatus: Appointment['paymentStatus'] = total >= appointment.quotedAmount ? 'paid' : 'partial';
    setMockState(prev => ({
      ...prev,
      appointmentPaymentMovements: [movement, ...prev.appointmentPaymentMovements],
      appointments: prev.appointments.map(item => item.id === appointment.id ? { ...item, paymentStatus } : item),
    }));
    return movement;
  };

  const recordAppointmentRefund = (input: NewAppointmentRefundInput): AppointmentPaymentMovement => {
    const original = professionalAppointmentPaymentMovements.find(item => item.id === input.paymentMovementId && (item.kind ?? 'payment') === 'payment');
    const occurredAt = new Date(input.occurredAt);
    if (!original || input.amount <= 0 || !Number.isFinite(input.amount) || Number.isNaN(occurredAt.getTime()) || occurredAt.getTime() > Date.now()) throw new Error('Revisá los datos del reembolso.');
    const appointment = professionalAppointments.find(item => item.id === original.appointmentId);
    const refunded = professionalAppointmentPaymentMovements.filter(item => item.refundedPaymentMovementId === original.id).reduce((sum, item) => sum + item.amount, 0);
    if (!appointment || input.amount > original.amount - refunded) throw new Error('El reembolso supera el monto todavía disponible de ese cobro.');
    const movement: AppointmentPaymentMovement = { id: `appointment-refund-${crypto.randomUUID()}`, appointmentId: appointment.id, organizationId: appointment.organizationId, amount: input.amount, currency: original.currency, method: original.method, kind: 'refund', refundedPaymentMovementId: original.id, note: input.note?.trim() || undefined, occurredAt: occurredAt.toISOString() };
    const netPaid = professionalAppointmentPaymentMovements.filter(item => item.appointmentId === appointment.id).reduce((sum, item) => sum + ((item.kind ?? 'payment') === 'refund' ? -item.amount : item.amount), 0) - movement.amount;
    const paymentStatus: Appointment['paymentStatus'] = netPaid <= 0 ? 'refunded' : netPaid >= appointment.quotedAmount ? 'paid' : 'partial';
    setMockState(prev => ({ ...prev, appointmentPaymentMovements: [movement, ...prev.appointmentPaymentMovements], appointments: prev.appointments.map(item => item.id === appointment.id ? { ...item, paymentStatus } : item) }));
    return movement;
  };

  const markAppointmentNotificationRead = (id: string) => {
    const notification = patientAppointmentNotifications.find(item => item.id === id);
    if (!notification) throw new Error('La notificación no pertenece al paciente actual.');
    const readAt = new Date().toISOString();
    setMockState(prev => ({
      ...prev,
      appointmentNotifications: prev.appointmentNotifications.map(item => item.id === id ? { ...item, readAt } : item),
    }));
  };

  const updateProfessionalPracticeSettings = (input: UpdatePracticeSettingsInput): ProfessionalPracticeSettings => {
    if (!currentDemoNutritionist) throw new Error('No hay un profesional activo seleccionado.');
    if (![15, 30, 45, 60, 75, 90].includes(input.defaultDurationMinutes) || input.defaultVirtualPrice < 0 || input.defaultInPersonPrice < 0) {
      throw new Error('Revisá la duración y los importes.');
    }
    const invalidWorkingHours = input.workingDays.some(item => {
      const intervals = item.intervals?.length ? item.intervals : [{ startTime: item.startTime, endTime: item.endTime }];
      const ordered = [...intervals].sort((left, right) => left.startTime.localeCompare(right.startTime));
      return intervals.some(interval => interval.startTime >= interval.endTime)
        || ordered.some((interval, index) => index > 0 && interval.startTime < ordered[index - 1]!.endTime);
    });
    if (input.workingDays.length !== 7 || invalidWorkingHours || input.scheduleBlocks.some(item => !item.startsAt || !item.endsAt || item.startsAt >= item.endsAt) || ![0, 5, 10, 15, 20, 30].includes(input.appointmentPolicy.gapMinutes) || input.appointmentPolicy.cancellationNoticeHours < 0 || input.appointmentPolicy.rescheduleNoticeHours < 0) {
      throw new Error('Revisá los horarios, bloqueos y reglas de agenda.');
    }
    const conflictsWithAppointment = input.scheduleBlocks.some(block => {
      const blockStart = new Date(block.startsAt).getTime(); const blockEnd = new Date(block.endsAt).getTime();
      return professionalAppointments.some(appointment => {
        if (!['requested', 'confirmed'].includes(appointment.status)) return false;
        const startsAt = new Date(appointment.startsAt).getTime(); const endsAt = startsAt + appointment.durationMinutes * 60_000;
        return blockStart < endsAt && blockEnd > startsAt;
      });
    });
    if (conflictsWithAppointment) throw new Error('No podés guardar un bloqueo que afecte una cita solicitada o confirmada. Reprogramala o cancelala antes.');
    const previous = professionalPracticeSettings;
    const updated: ProfessionalPracticeSettings = {
      id: previous?.id ?? `practice-settings-${crypto.randomUUID()}`,
      organizationId: currentDemoNutritionist.organizationId,
      nutritionistId: currentDemoNutritionist.id,
      currency: input.currency,
      defaultDurationMinutes: input.defaultDurationMinutes,
      defaultVirtualPrice: input.defaultVirtualPrice,
      defaultInPersonPrice: input.defaultInPersonPrice,
      priceSettings: [
        { id: 'price-default-virtual', label: `Virtual ${input.defaultDurationMinutes} min`, durationMinutes: input.defaultDurationMinutes, modality: 'virtual', amount: input.defaultVirtualPrice },
        { id: 'price-default-in-person', label: `Presencial ${input.defaultDurationMinutes} min`, durationMinutes: input.defaultDurationMinutes, modality: 'in_person', amount: input.defaultInPersonPrice },
      ],
      workingDays: input.workingDays,
      scheduleBlocks: input.scheduleBlocks,
      appointmentPolicy: input.appointmentPolicy,
      notificationSettings: input.notificationSettings,
      checkInSettings: input.checkInSettings,
      anthropometricCustomFields: input.anthropometricCustomFields ?? previous?.anthropometricCustomFields ?? [],
      googleCalendar: previous?.googleCalendar ?? {
        status: 'not_connected',
        syncDirection: 'nutrisoft_to_google',
        blocksExternalEvents: true,
        autoGenerateMeet: true,
      },
      updatedAt: new Date().toISOString(),
    };
    setMockState(prev => ({
      ...prev,
      professionalPracticeSettings: [
        updated,
        ...prev.professionalPracticeSettings.filter(item => item.id !== updated.id),
      ],
    }));
    return updated;
  };

  const updateProfessionalProfile = (input: UpdateProfessionalProfileInput): Nutritionist => {
    if (!currentDemoNutritionist) throw new Error('No hay un profesional activo seleccionado.');
    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    const email = input.email.trim().toLowerCase();
    const phone = input.phone.trim();
    if (!firstName || !lastName || !email) throw new Error('Nombre, apellido y correo electrónico son obligatorios.');
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Ingresá un correo electrónico válido.');

    const updated: Nutritionist = {
      ...currentDemoNutritionist,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      email,
      phone,
      specialty: input.specialty,
      registrationNumber: input.registrationNumber?.trim() || undefined,
      registrationProvince: input.registrationProvince?.trim() || undefined,
      registrationCountry: input.registrationCountry?.trim() || undefined,
      timeZone: input.timeZone,
    };
    setMockState(prev => ({
      ...prev,
      nutritionists: prev.nutritionists.map(item => item.id === updated.id ? updated : item),
    }));
    return updated;
  };

  const addProfessionalResource = (input: NewProfessionalResourceInput): ProfessionalResource => {
    if (!currentDemoNutritionist) throw new Error('No hay un nutricionista activo seleccionado.');
    const title = input.title.trim();
    const category = input.category.trim();
    const source = input.source.trim();
    if (!title || !category || !source) throw new Error('Título, categoría y archivo o enlace son obligatorios.');

    const now = new Date().toISOString();
    const resource: ProfessionalResource = {
      id: `resource-${crypto.randomUUID()}`,
      organizationId: currentDemoNutritionist.organizationId,
      ownerNutritionistId: currentDemoNutritionist.id,
      title,
      kind: input.kind,
      category,
      source,
      createdAt: now,
      updatedAt: now,
      status: input.status ?? 'published',
    };
    setMockState(prev => ({ ...prev, professionalResources: [resource, ...prev.professionalResources] }));
    return resource;
  };

  const updateProfessionalResource = (id: string, input: NewProfessionalResourceInput): ProfessionalResource => {
    const current = professionalResources.find(resource => resource.id === id);
    if (!current) throw new Error('No tienes permisos para modificar este recurso.');
    const title = input.title.trim();
    const category = input.category.trim();
    const source = input.source.trim();
    if (!title || !category || !source) throw new Error('Título, categoría y archivo o enlace son obligatorios.');
    const updated: ProfessionalResource = {
      ...current,
      title,
      category,
      source,
      kind: input.kind,
      status: input.status ?? current.status,
      updatedAt: new Date().toISOString(),
    };
    setMockState(prev => ({
      ...prev,
      professionalResources: prev.professionalResources.map(resource => resource.id === id ? updated : resource),
    }));
    return updated;
  };

  const addProfessionalRecipe = (input: NewProfessionalRecipeInput): ProfessionalRecipe => {
    if (!currentDemoNutritionist) throw new Error('No hay un nutricionista activo seleccionado.');
    const title = input.title.trim();
    const ingredients = input.ingredients.map(item => item.trim()).filter(Boolean);
    const steps = input.steps.map(item => item.trim()).filter(Boolean);
    if (!title || ingredients.length === 0 || steps.length === 0) throw new Error('Título, ingredientes y preparación son obligatorios.');

    const now = new Date().toISOString();
    const recipe: ProfessionalRecipe = {
      ...input,
      id: `recipe-${crypto.randomUUID()}`,
      organizationId: currentDemoNutritionist.organizationId,
      ownerNutritionistId: currentDemoNutritionist.id,
      title,
      tags: input.tags.map(tag => tag.trim()).filter(Boolean),
      ingredients,
      steps,
      imageUrl: input.imageUrl?.trim() || 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80',
      status: input.status ?? 'published',
      createdAt: now,
      updatedAt: now,
    };
    setMockState(prev => ({ ...prev, professionalRecipes: [recipe, ...prev.professionalRecipes] }));
    return recipe;
  };

  const setProfessionalResourceStatus = (id: string, status: PublicationStatus) => {
    if (!professionalResources.some(resource => resource.id === id)) {
      throw new Error('No tienes permisos para modificar este recurso.');
    }
    setMockState(prev => ({
      ...prev,
      professionalResources: prev.professionalResources.map(resource =>
        resource.id === id ? { ...resource, status, updatedAt: new Date().toISOString() } : resource
      ),
    }));
  };

  const setProfessionalRecipeStatus = (id: string, status: PublicationStatus) => {
    if (!professionalRecipes.some(recipe => recipe.id === id)) {
      throw new Error('No tienes permisos para modificar esta receta.');
    }
    setMockState(prev => ({
      ...prev,
      professionalRecipes: prev.professionalRecipes.map(recipe =>
        recipe.id === id ? { ...recipe, status, updatedAt: new Date().toISOString() } : recipe
      ),
    }));
  };

  const duplicateProfessionalRecipe = (id: string): ProfessionalRecipe => {
    const original = professionalRecipes.find(recipe => recipe.id === id);
    if (!original || !currentDemoNutritionist) {
      throw new Error('No tienes permisos para copiar esta receta.');
    }
    const now = new Date().toISOString();
    const copy: ProfessionalRecipe = {
      ...original,
      id: `recipe-${crypto.randomUUID()}`,
      title: `${original.title} — copia`,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      sourceRecipeId: original.sourceRecipeId ?? original.id,
      sourceTitle: original.sourceTitle ?? original.title,
      organizationId: currentDemoNutritionist.organizationId,
      ownerNutritionistId: currentDemoNutritionist.id,
    };
    setMockState(prev => ({ ...prev, professionalRecipes: [copy, ...prev.professionalRecipes] }));
    return copy;
  };

  // Toggle estado de organización (Admin)
  const toggleOrganizationStatus = (id: string) => {
    setMockState(prev => ({
      ...prev,
      organizations: prev.organizations.map(org => {
        if (org.id === id) {
          const newStatus = org.status === 'active' ? 'suspended' : 'active';
          return { ...org, status: newStatus };
        }
        return org;
      }),
    }));
  };

  const setOrganizationStatus = (
    id: string,
    status: OrganizationStatus,
    payment?: Omit<PaymentRecord, 'id' | 'currency' | 'plan'>
  ) => {
    const currentOrganization = rawOrganizations.find(org => org.id === id);
    if (!currentOrganization) {
      throw new Error('El consultorio no existe.');
    }

    const requiresPayment = status === 'active' && ['suspended', 'closed'].includes(currentOrganization.status);
    if (requiresPayment && !payment) {
      throw new Error('La reactivación requiere registrar el pago confirmado.');
    }

    setMockState(prev => ({
      ...prev,
      organizations: prev.organizations.map(org => {
        if (org.id !== id) return org;

        const paymentRecord: PaymentRecord | undefined = payment
          ? {
              ...payment,
              id: `pay-${crypto.randomUUID()}`,
              currency: 'ARS',
              plan: org.plan,
            }
          : undefined;

        const nextBillingDate = paymentRecord ? advanceBillingDate(org.nextBillingDate) : org.nextBillingDate;

        return {
          ...org,
          status,
          nextBillingDate,
          suspensionDate: status === 'payment_due' ? new Date(Date.now() + 7 * 86400000).toISOString() : undefined,
          payments: paymentRecord ? [paymentRecord, ...org.payments] : org.payments,
          statusHistory: [
            {
              id: `event-${crypto.randomUUID()}`,
              status,
              occurredAt: new Date().toISOString(),
              note: paymentRecord ? 'Reactivación con pago confirmado' : `Cambio manual a ${status}`,
            },
            ...org.statusHistory,
          ],
        };
      }),
    }));
  };

  // UX-01: Alta de organización real en mock
  const addOrganization = (input: NewOrganizationInput): Organization => {
    const trimmedName = input.name.trim();
    if (!trimmedName) throw new Error('El nombre del consultorio es obligatorio.');
    const trimmedLocation = input.location.trim();
    if (!trimmedLocation) throw new Error('La ubicación es obligatoria.');
    const responsibleName = input.responsibleName.trim();
    const responsibleEmail = input.responsibleEmail.trim().toLowerCase();
    if (!responsibleName || !responsibleEmail) throw new Error('Nombre y correo del responsable son obligatorios.');
    if (!/^\S+@\S+\.\S+$/.test(responsibleEmail)) throw new Error('Ingresá un correo válido para el responsable.');

    const newOrg: Organization = {
      id: `org-${crypto.randomUUID()}`,
      name: trimmedName,
      location: trimmedLocation,
      status: 'active',
      onboardingStatus: 'invited',
      nutritionistsCount: 0,
      patientsCount: 0,
      plan: input.plan,
      monthlyPrice: PLAN_PRICES[input.plan],
      storageUsedMb: 0,
      storageLimitMb: PLAN_STORAGE_LIMITS[input.plan],
      serviceStartedAt: new Date().toISOString(),
      nextBillingDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
      primaryContact: { name: responsibleName, email: responsibleEmail },
      responsibleMembers: [
        { id: `resp-${crypto.randomUUID()}`, name: responsibleName, email: responsibleEmail, isPrimary: true, invitationStatus: 'pending' },
      ],
      professionalInvitations: [],
      additionalManagers: 0,
      invitedNutritionists: 0,
      payments: [],
      statusHistory: [
        { id: `event-${crypto.randomUUID()}`, status: 'active', occurredAt: new Date().toISOString(), note: 'Consultorio registrado; invitación pendiente' },
      ],
      createdAt: new Date().toISOString(),
    };

    setMockState(prev => ({
      ...prev,
      organizations: [newOrg, ...prev.organizations],
    }));

    return newOrg;
  };

  const changeOrganizationPlan = (id: string, plan: OrganizationPlan) => {
    const organization = rawOrganizations.find(org => org.id === id);
    if (!organization) throw new Error('El consultorio no existe.');
    setMockState(prev => ({
      ...prev,
      organizations: prev.organizations.map(org => org.id === id ? {
        ...org,
        plan,
        monthlyPrice: PLAN_PRICES[plan],
        storageLimitMb: plan === 'CUSTOM' ? org.storageLimitMb : PLAN_STORAGE_LIMITS[plan],
      } : org),
    }));
  };

  const registerPayment = (id: string, payment: RegisterPaymentInput) => {
    if (!Number.isFinite(payment.amount) || payment.amount <= 0) throw new Error('El importe debe ser mayor que cero.');
    const organization = rawOrganizations.find(org => org.id === id);
    if (!organization) throw new Error('El consultorio no existe.');

    setMockState(prev => ({
      ...prev,
      organizations: prev.organizations.map(org => {
        if (org.id !== id) return org;
        const record: PaymentRecord = {
          id: `pay-${crypto.randomUUID()}`,
          amount: payment.amount,
          currency: 'ARS',
          paidAt: payment.paidAt,
          method: payment.method,
          note: payment.note,
          plan: org.plan,
        };
        return {
          ...org,
          status: 'active',
          nextBillingDate: advanceBillingDate(org.nextBillingDate),
          suspensionDate: undefined,
          payments: [record, ...org.payments],
          statusHistory: [
            { id: `event-${crypto.randomUUID()}`, status: 'active', occurredAt: new Date().toISOString(), note: 'Pago manual confirmado' },
            ...org.statusHistory,
          ],
        };
      }),
    }));
  };

  const inviteAdditionalManager = (id: string, name: string, email: string): ResponsibleMember => {
    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    if (!trimmedName || !normalizedEmail) throw new Error('Nombre y correo son obligatorios.');
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) throw new Error('Ingresá un correo válido.');
    const organization = rawOrganizations.find(org => org.id === id);
    if (!organization) throw new Error('El consultorio no existe.');
    if (organization.responsibleMembers.some(member => member.email.toLowerCase() === normalizedEmail)) throw new Error('Ese correo ya pertenece a un responsable del consultorio.');

    const invitation: ResponsibleMember = {
      id: `resp-${crypto.randomUUID()}`,
      name: trimmedName,
      email: normalizedEmail,
      isPrimary: false,
      invitationStatus: 'pending',
    };
    setMockState(prev => ({
      ...prev,
      organizations: prev.organizations.map(org => org.id === id ? { ...org, responsibleMembers: [...org.responsibleMembers, invitation] } : org),
    }));
    return invitation;
  };

  const inviteNutritionist = (id: string, name: string, email: string): ProfessionalInvitation => {
    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    if (!trimmedName || !normalizedEmail) throw new Error('Nombre y correo son obligatorios.');
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) throw new Error('Ingresá un correo válido.');
    const organization = rawOrganizations.find(org => org.id === id);
    if (!organization) throw new Error('El consultorio no existe.');
    if (organization.professionalInvitations.some(invitation => invitation.email.toLowerCase() === normalizedEmail)) throw new Error('Ya existe una invitación para ese correo.');

    const invitation: ProfessionalInvitation = {
      id: `prof-invite-${crypto.randomUUID()}`,
      name: trimmedName,
      email: normalizedEmail,
      invitationStatus: 'pending',
      invitedAt: new Date().toISOString(),
    };
    setMockState(prev => ({
      ...prev,
      organizations: prev.organizations.map(org => org.id === id ? {
        ...org,
        professionalInvitations: [...org.professionalInvitations, invitation],
        invitedNutritionists: org.invitedNutritionists + 1,
      } : org),
    }));
    return invitation;
  };

  // DATA-01 & SCOPE-01: Crear Paciente con contexto del profesional actual y sin inventar datos
  const addPatient = (patientData: NewPatientInput): Patient => {
    if (!currentDemoNutritionist) {
      throw new Error('No hay un nutricionista activo seleccionado.');
    }

    const trimmedFirstName = patientData.firstName.trim();
    const trimmedLastName = patientData.lastName.trim();
    const trimmedEmail = patientData.email.trim().toLowerCase();

    if (!trimmedFirstName || !trimmedLastName || !trimmedEmail) {
      throw new Error('Nombre, apellido y correo electrónico son obligatorios.');
    }
    if (patients.some(patient =>
      patient.organizationId === currentDemoNutritionist.organizationId &&
      patient.email.toLowerCase() === trimmedEmail &&
      patient.status !== 'archived'
    )) {
      throw new Error('Ese paciente ya está vinculado a este consultorio.');
    }

    const invitedAt = new Date();
    const invitationExpiresAt = new Date(invitedAt.getTime() + 7 * 86400000);

    const newPatient: Patient = {
      id: `pat-${crypto.randomUUID()}`,
      organizationId: currentDemoNutritionist.organizationId,
      assignedNutritionistId: currentDemoNutritionist.id,
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      email: trimmedEmail,
      phone: patientData.phone ? patientData.phone.trim() : undefined,
      age: patientData.age || undefined,
      city: patientData.city ? patientData.city.trim() : undefined,
      status: 'active',
      objective: patientData.objective ? patientData.objective.trim() : 'Plan nutricional personalizado',
      currentPlan: null, // DATA-01: Inicia en null / Sin plan asignado
      createdAt: invitedAt.toISOString(),
      lastActiveAt: invitedAt.toISOString(),
      portalAccessStatus: 'pending', // DATA-01: Inicia en pending
      invitedAt: invitedAt.toISOString(),
      invitationExpiresAt: invitationExpiresAt.toISOString(),
    };

    setMockState(prev => ({
      ...prev,
      patients: [newPatient, ...prev.patients],
    }));

    return newPatient;
  };

  const revokePatientInvitation = (patientId: string) => {
    const patient = professionalPatients.find(item => item.id === patientId);
    if (!patient || patient.portalAccessStatus !== 'pending') {
      throw new Error('La invitación no está pendiente o no pertenece a este profesional.');
    }
    setMockState(prev => ({
      ...prev,
      patients: prev.patients.map(item => item.id === patientId
        ? { ...item, portalAccessStatus: 'revoked' as const, invitationExpiresAt: new Date().toISOString() }
        : item),
    }));
  };

  const resendPatientInvitation = (patientId: string) => {
    const patient = professionalPatients.find(item => item.id === patientId);
    if (!patient || patient.portalAccessStatus === 'active') {
      throw new Error('No se puede reenviar la invitación para este paciente.');
    }
    const invitedAt = new Date();
    const invitationExpiresAt = new Date(invitedAt.getTime() + 7 * 86400000);
    setMockState(prev => ({
      ...prev,
      patients: prev.patients.map(item => item.id === patientId
        ? {
            ...item,
            portalAccessStatus: 'pending' as const,
            invitedAt: invitedAt.toISOString(),
            invitationExpiresAt: invitationExpiresAt.toISOString(),
          }
        : item),
    }));
  };

  const normalizeMealPlanInput = (input: NewMealPlanInput) => {
    const name = input.name.trim();
    const days = input.days
      .map((day, dayIndex) => {
        const title = day.title?.trim() || undefined;
        return {
          ...day,
          label: `Día ${dayIndex + 1}${title ? ` · ${title}` : ''}`,
          title,
          meals: day.meals
            .map(meal => ({
              ...meal,
              name: meal.name.trim(),
              alternatives: meal.alternatives?.trim() || undefined,
              items: meal.items
                .map(item => ({
                  ...item,
                  description: item.description.trim(),
                  amount: item.amount?.trim() || undefined,
                }))
                .filter(item => item.description),
            }))
            .filter(meal => meal.name && meal.items.length > 0)
            .slice(0, 4),
        };
      });
    if (!name) throw new Error('El plan necesita un nombre.');
    if (days.length < 7 || days.length > 30) throw new Error('El plan debe abarcar entre 7 y 30 días.');
    if (input.status === 'published' && !days.some(day => day.meals.length > 0)) {
      throw new Error('Antes de publicar, agregá al menos una comida al plan.');
    }
    return {
      name,
      status: input.status ?? 'draft',
      days,
      generalNotes: input.generalNotes?.trim() || undefined,
      shoppingList: input.shoppingList?.trim() || undefined,
      goals: input.goals?.trim() || undefined,
    };
  };

  const createMealPlan = (input: NewMealPlanInput): MealPlanTemplate => {
    if (!currentDemoNutritionist) throw new Error('No hay un profesional activo seleccionado.');
    const normalized = normalizeMealPlanInput(input);
    const now = new Date().toISOString();
    const plan: MealPlanTemplate = {
      id: `meal-plan-${crypto.randomUUID()}`,
      organizationId: currentDemoNutritionist.organizationId,
      ownerNutritionistId: currentDemoNutritionist.id,
      ...normalized,
      createdAt: now,
      updatedAt: now,
    };
    setMockState(prev => ({ ...prev, mealPlanTemplates: [plan, ...prev.mealPlanTemplates] }));
    return plan;
  };

  const duplicateMealPlan = (id: string): MealPlanTemplate => {
    if (!currentDemoNutritionist) throw new Error('No hay un profesional activo seleccionado.');
    const source = professionalMealPlans.find(plan => plan.id === id);
    if (!source) throw new Error('No tenés permisos para duplicar este plan.');
    const now = new Date().toISOString();
    const plan: MealPlanTemplate = {
      ...structuredClone(source),
      id: `meal-plan-${crypto.randomUUID()}`,
      name: `Copia de ${source.name}`,
      status: 'draft',
      days: source.days.map((day, dayIndex) => ({
        ...structuredClone(day),
        id: `day-${crypto.randomUUID()}`,
        label: `Día ${dayIndex + 1}${day.title ? ` · ${day.title}` : ''}`,
        meals: day.meals.map(meal => ({
          ...structuredClone(meal),
          id: `meal-${crypto.randomUUID()}`,
          items: meal.items.map(item => ({ ...structuredClone(item), id: `item-${crypto.randomUUID()}` })),
        })),
      })),
      createdAt: now,
      updatedAt: now,
    };
    setMockState(prev => ({ ...prev, mealPlanTemplates: [plan, ...prev.mealPlanTemplates] }));
    return plan;
  };

  const updateMealPlan = (id: string, input: NewMealPlanInput): MealPlanTemplate => {
    const currentPlan = professionalMealPlans.find(plan => plan.id === id);
    if (!currentPlan) throw new Error('No tenés permisos para modificar este plan.');
    const updatedPlan: MealPlanTemplate = {
      ...currentPlan,
      ...normalizeMealPlanInput(input),
      updatedAt: new Date().toISOString(),
    };
    setMockState(prev => ({
      ...prev,
      mealPlanTemplates: prev.mealPlanTemplates.map(plan => plan.id === id ? updatedPlan : plan),
    }));
    return updatedPlan;
  };

  const setMealPlanStatus = (id: string, status: MealPlanStatus) => {
    const currentPlan = professionalMealPlans.find(plan => plan.id === id);
    if (!currentPlan) throw new Error('No tenés permisos para modificar este plan.');
    if (status === 'published' && !currentPlan.days.some(day => day.meals.some(meal => meal.items.length > 0))) {
      throw new Error('Antes de publicar, agregá al menos una comida al plan.');
    }
    setMockState(prev => ({
      ...prev,
      mealPlanTemplates: prev.mealPlanTemplates.map(plan =>
        plan.id === id ? { ...plan, status, updatedAt: new Date().toISOString() } : plan
      ),
    }));
  };

  const assignMealPlan = (
    templateId: string,
    patientId: string,
    kind: MealPlanAssignmentKind,
  ): MealPlanAssignment => {
    if (!currentDemoNutritionist) throw new Error('No hay un profesional activo seleccionado.');
    const template = professionalMealPlans.find(plan => plan.id === templateId);
    const patient = professionalPatients.find(item => item.id === patientId);
    if (!template || !patient) throw new Error('El plan o el paciente no están disponibles.');
    if (template.status !== 'published') throw new Error('Sólo se pueden asignar planes publicados.');
    const previousOwner = allMealPlanAssignments.find(item => item.templateId === templateId && item.patientId !== patientId);
    if (previousOwner) {
      throw new Error('Este plan ya pertenece a otro paciente. Duplicalo para crear una copia independiente.');
    }
    if (allMealPlanAssignments.some(item => item.templateId === templateId && item.patientId === patientId && item.status === 'active')) {
      throw new Error('Este plan ya está activo para el paciente seleccionado.');
    }

    const now = new Date().toISOString();
    const assignment: MealPlanAssignment = {
      id: `meal-assignment-${crypto.randomUUID()}`,
      organizationId: currentDemoNutritionist.organizationId,
      patientId,
      templateId: template.id,
      templateName: template.name,
      kind,
      status: 'active',
      snapshotDays: structuredClone(template.days),
      snapshotGeneralNotes: template.generalNotes,
      snapshotShoppingList: template.shoppingList,
      snapshotGoals: template.goals,
      assignedBy: currentDemoNutritionist.id,
      assignedAt: now,
    };

    setMockState(prev => ({
      ...prev,
      mealPlanAssignments: [
        assignment,
        ...prev.mealPlanAssignments.map(item =>
          item.patientId === patientId && item.kind === kind && item.status === 'active'
            ? { ...item, status: 'ended' as const, endedAt: now }
            : item
        ),
      ],
      patients: prev.patients.map(item => item.id === patientId && kind === 'primary'
        ? { ...item, currentPlan: template.name }
        : item),
    }));
    return assignment;
  };

  const endMealPlanAssignment = (patientId: string, kind: MealPlanAssignmentKind) => {
    if (!professionalPatients.some(patient => patient.id === patientId)) {
      throw new Error('No tenés permisos para modificar los planes de este paciente.');
    }
    const now = new Date().toISOString();
    setMockState(prev => ({
      ...prev,
      mealPlanAssignments: prev.mealPlanAssignments.map(item =>
        item.patientId === patientId && item.kind === kind && item.status === 'active'
          ? { ...item, status: 'ended' as const, endedAt: now }
          : item
      ),
      patients: prev.patients.map(item => item.id === patientId && kind === 'primary'
        ? { ...item, currentPlan: null }
        : item),
    }));
  };

  const setMealCompleted = (assignmentId: string, dayId: string, mealId: string, completed: boolean) => {
    if (!currentDemoPatient) throw new Error('No hay un paciente activo seleccionado.');
    const assignment = patientMealPlanAssignments.find(item => item.id === assignmentId && item.status === 'active');
    const day = assignment?.snapshotDays.find(item => item.id === dayId);
    if (!assignment || assignment.patientId !== currentDemoPatient.id || !day?.meals.some(meal => meal.id === mealId)) {
      throw new Error('Esta comida no pertenece al plan activo del paciente.');
    }
    const existing = mealAdherenceRecords.find(record => record.assignmentId === assignmentId && record.dayId === dayId && record.mealId === mealId);
    const record: MealAdherenceRecord = {
      id: existing?.id ?? `meal-adherence-${crypto.randomUUID()}`,
      organizationId: assignment.organizationId,
      patientId: currentDemoPatient.id,
      assignmentId,
      dayId,
      mealId,
      completed,
      patientComment: existing?.patientComment,
      commentedAt: existing?.commentedAt,
      professionalReviewedAt: existing?.professionalReviewedAt,
      updatedAt: new Date().toISOString(),
    };
    setMockState(prev => ({
      ...prev,
      mealAdherenceRecords: existing
        ? prev.mealAdherenceRecords.map(item => item.id === existing.id ? record : item)
        : [record, ...prev.mealAdherenceRecords],
    }));
  };

  const setMealComment = (assignmentId: string, dayId: string, mealId: string, comment: string) => {
    if (!currentDemoPatient) throw new Error('No hay un paciente activo seleccionado.');
    const assignment = patientMealPlanAssignments.find(item => item.id === assignmentId && item.status === 'active');
    const day = assignment?.snapshotDays.find(item => item.id === dayId);
    if (!assignment || assignment.patientId !== currentDemoPatient.id || !day?.meals.some(meal => meal.id === mealId)) {
      throw new Error('Esta comida no pertenece al plan activo del paciente.');
    }
    const patientComment = comment.trim();
    const existing = mealAdherenceRecords.find(record => record.assignmentId === assignmentId && record.dayId === dayId && record.mealId === mealId);
    if (!existing && !patientComment) return;
    const now = new Date().toISOString();
    const record: MealAdherenceRecord = {
      id: existing?.id ?? `meal-adherence-${crypto.randomUUID()}`,
      organizationId: assignment.organizationId,
      patientId: currentDemoPatient.id,
      assignmentId,
      dayId,
      mealId,
      completed: existing?.completed ?? false,
      patientComment: patientComment || undefined,
      commentedAt: patientComment ? now : undefined,
      professionalReviewedAt: patientComment && existing?.patientComment === patientComment ? existing.professionalReviewedAt : undefined,
      updatedAt: now,
    };
    setMockState(prev => ({
      ...prev,
      mealAdherenceRecords: existing
        ? prev.mealAdherenceRecords.map(item => item.id === existing.id ? record : item)
        : [record, ...prev.mealAdherenceRecords],
    }));
  };

  const markMealCommentReviewed = (recordId: string) => {
    const record = mealAdherenceRecords.find(item => item.id === recordId);
    const canReview = record && record.patientComment && professionalMealPlanAssignments.some(assignment => assignment.id === record.assignmentId && assignment.patientId === record.patientId);
    if (!canReview) throw new Error('No tenés permisos para revisar este comentario.');
    const now = new Date().toISOString();
    setMockState(prev => ({
      ...prev,
      mealAdherenceRecords: prev.mealAdherenceRecords.map(item => item.id === recordId ? { ...item, professionalReviewedAt: now, updatedAt: now } : item),
    }));
  };

  const normalizeNextStepList = (input: NextStepListInput) => {
    const title = input.title.trim();
    const items = input.items.map(item => item.trim()).filter(Boolean);
    const durationDays = Math.round(input.durationDays);
    if (!title || items.length === 0) throw new Error('Ingresá un título y al menos una tarea.');
    if (durationDays < 7 || durationDays > 15) throw new Error('La duración debe ser de 7 a 15 días.');
    return { title, durationDays, items };
  };

  const createNextStepList = (input: NextStepListInput): PatientNextStepList => {
    if (!currentDemoNutritionist) throw new Error('No hay un profesional activo seleccionado.');
    const normalized = normalizeNextStepList(input);
    const now = new Date().toISOString();
    const list: PatientNextStepList = {
      id: `next-steps-${crypto.randomUUID()}`,
      organizationId: currentDemoNutritionist.organizationId,
      ownerNutritionistId: currentDemoNutritionist.id,
      title: normalized.title,
      durationDays: normalized.durationDays,
      items: normalized.items.map(text => ({ id: `next-step-${crypto.randomUUID()}`, text, completed: false })),
      createdAt: now,
      updatedAt: now,
    };
    setMockState(prev => ({ ...prev, nextStepLists: [list, ...prev.nextStepLists] }));
    return list;
  };

  const updateNextStepList = (id: string, input: NextStepListInput): PatientNextStepList => {
    const current = professionalNextStepLists.find(list => list.id === id);
    if (!current) throw new Error('No tenés permisos para editar esta lista.');
    const normalized = normalizeNextStepList(input);
    const updated: PatientNextStepList = {
      ...current,
      title: normalized.title,
      durationDays: normalized.durationDays,
      items: normalized.items.map((text, index) => current.items[index]?.text === text
        ? current.items[index]!
        : { id: `next-step-${crypto.randomUUID()}`, text, completed: false }),
      updatedAt: new Date().toISOString(),
    };
    setMockState(prev => ({ ...prev, nextStepLists: prev.nextStepLists.map(list => list.id === id ? updated : list) }));
    return updated;
  };

  const assignNextStepList = (id: string, patientId: string) => {
    const current = professionalNextStepLists.find(list => list.id === id);
    const patient = professionalPatients.find(item => item.id === patientId);
    if (!current || !patient) throw new Error('La lista o el paciente no están disponibles.');
    const now = new Date().toISOString();
    setMockState(prev => ({
      ...prev,
      nextStepLists: prev.nextStepLists.map(list => {
        if (list.organizationId !== current.organizationId || list.ownerNutritionistId !== current.ownerNutritionistId) return list;
        if (list.id === id) return { ...list, patientId, assignedAt: now, updatedAt: now };
        if (list.patientId === patientId) return { ...list, patientId: undefined, assignedAt: undefined, updatedAt: now };
        return list;
      }),
    }));
  };

  const unassignNextStepList = (id: string) => {
    if (!professionalNextStepLists.some(list => list.id === id)) throw new Error('No tenés permisos para modificar esta lista.');
    setMockState(prev => ({ ...prev, nextStepLists: prev.nextStepLists.map(list => list.id === id ? { ...list, patientId: undefined, assignedAt: undefined, updatedAt: new Date().toISOString() } : list) }));
  };

  const duplicateNextStepList = (id: string): PatientNextStepList => {
    const source = professionalNextStepLists.find(list => list.id === id);
    if (!source) throw new Error('La lista no está disponible.');
    return createNextStepList({ title: `${source.title} (copia)`, durationDays: source.durationDays, items: source.items.map(item => item.text) });
  };

  const deleteNextStepList = (id: string) => {
    if (!professionalNextStepLists.some(list => list.id === id)) throw new Error('La lista no está disponible.');
    setMockState(prev => ({ ...prev, nextStepLists: prev.nextStepLists.filter(list => list.id !== id) }));
  };

  const updateNextStepItemByPatient = (listId: string, itemId: string, completed: boolean, comment: string) => {
    if (!currentDemoPatient) throw new Error('No hay un paciente activo seleccionado.');
    const list = allNextStepLists.find(item => item.id === listId && item.patientId === currentDemoPatient.id);
    if (!list || !list.items.some(item => item.id === itemId)) throw new Error('Esta tarea no pertenece al paciente actual.');
    const now = new Date().toISOString();
    setMockState(prev => ({
      ...prev,
      nextStepLists: prev.nextStepLists.map(item => item.id === listId ? {
        ...item,
        updatedAt: now,
        items: item.items.map(task => task.id === itemId ? { ...task, completed, patientComment: comment.trim(), completedAt: completed ? now : undefined } : task),
      } : item),
    }));
  };

  // SCOPE-01: Asignar Check-in validando que pertenezca al profesional actual
  const createCheckInAssignment = (patientId: string): CheckInAssignment => {
    const isAssignedToCurrentProf = professionalPatients.some(p => p.id === patientId);
    if (!isAssignedToCurrentProf) {
      throw new Error('No tienes permisos para asignar check-ins a este paciente.');
    }

    const hasPending = checkInAssignments.some(
      a => a.patientId === patientId && a.status === 'pending'
    );
    if (hasPending) {
      throw new Error('El paciente ya tiene una asignación de check-in pendiente.');
    }

    const patient = patients.find(p => p.id === patientId)!;

    const newAssign: CheckInAssignment = {
      id: `assign-${crypto.randomUUID()}`,
      organizationId: patient.organizationId,
      patientId: patient.id,
      createdBy: currentDemoNutritionistId,
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    setMockState(prev => ({
      ...prev,
      checkInAssignments: [newAssign, ...prev.checkInAssignments],
    }));

    return newAssign;
  };

  // SCOPE-01 & DATA-01: Reconocer alerta sin descartarla ni resolverla.
  const acknowledgeAlert = (alertId: string) => {
    const targetAlert = alerts.find(alert => alert.id === alertId);
    if (!targetAlert) throw new Error('La alerta consultada no existe.');
    if (!professionalAlerts.some(alert => alert.id === alertId)) {
      throw new Error('No tienes permisos para revisar esta alerta.');
    }
    if (targetAlert.status !== 'unresolved') {
      throw new Error(targetAlert.status === 'resolved' ? 'La alerta ya fue resuelta.' : 'La alerta ya está en revisión.');
    }

    const acknowledgedBy = currentDemoNutritionist?.name || 'Profesional';
    setMockState(prev => ({
      ...prev,
      alerts: prev.alerts.map(alert => alert.id === alertId ? {
        ...alert,
        status: 'acknowledged' as const,
        acknowledgedBy,
        acknowledgedAt: new Date().toISOString(),
      } : alert),
    }));
  };

  // SCOPE-01 & DATA-01: Resolver alerta validando existencia, permisos y duplicidad
  const resolveAlert = (alertId: string) => {
    const targetAlert = alerts.find(a => a.id === alertId);
    if (!targetAlert) {
      throw new Error('La alerta consultada no existe.');
    }

    const belongsToCurrentProf = professionalAlerts.some(a => a.id === alertId);
    if (!belongsToCurrentProf) {
      throw new Error('No tienes permisos para resolver esta alerta.');
    }

    if (targetAlert.status === 'resolved') {
      throw new Error('La alerta ya ha sido resuelta previamente.');
    }

    const resolvedByName = currentDemoNutritionist?.name || 'Profesional';

    setMockState(prev => ({
      ...prev,
      alerts: prev.alerts.map(alert => {
        if (alert.id === alertId) {
          return {
            ...alert,
            status: 'resolved' as const,
            resolvedBy: resolvedByName,
            resolvedAt: new Date().toISOString(),
          };
        }
        return alert;
      }),
    }));
  };

  // SCOPE-01: Emitir Recomendación validando pertenencia al profesional actual
  const addRecommendation = (patientId: string, text: string): Recommendation => {
    const isAssignedToCurrentProf = professionalPatients.some(p => p.id === patientId);
    if (!isAssignedToCurrentProf) {
      throw new Error('No tienes permisos para emitir recomendaciones a este paciente.');
    }

    const trimmedText = text.trim();
    if (!trimmedText) {
      throw new Error('La recomendación no puede estar vacía o compuesta solo por espacios.');
    }

    const patient = patients.find(p => p.id === patientId)!;

    const latestResponse = checkInResponses
      .filter(response => response.patientId === patient.id)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];

    const newRec: Recommendation = {
      id: `rec-${crypto.randomUUID()}`,
      organizationId: patient.organizationId,
      patientId: patient.id,
      createdBy: currentDemoNutritionistId,
      responseId: latestResponse?.id,
      recommendationText: trimmedText,
      createdAt: new Date().toISOString(),
    };

    setMockState(prev => ({
      ...prev,
      recommendations: [newRec, ...prev.recommendations],
    }));

    return newRec;
  };

  // PATIENT-01: Firma pública sin patientId y validación estricta en Provider
  const submitCheckInResponse = (
    assignmentId: string,
    energyScore: number,
    adherenceScore: number,
    helpRequested: boolean,
    notes?: string,
    optionalScores?: Pick<CheckInResponse, 'sleepScore' | 'digestionScore' | 'satietyScore'>,
  ) => {
    if (energyScore < 1 || energyScore > 5 || adherenceScore < 1 || adherenceScore > 5) {
      throw new Error('Las puntuaciones deben estar dentro del rango 1 a 5.');
    }
    if (Object.values(optionalScores ?? {}).some(score => score !== undefined && (score < 1 || score > 5))) {
      throw new Error('Las puntuaciones adicionales deben estar dentro del rango 1 a 5.');
    }

    const targetAssign = checkInAssignments.find(a => a.id === assignmentId);
    if (!targetAssign) {
      throw new Error('La asignación de check-in no existe.');
    }

    // PATIENT-01: Validación estricta con el paciente en el Provider
    if (targetAssign.patientId !== currentDemoPatientId) {
      throw new Error('No estás autorizado para responder una asignación perteneciente a otro paciente.');
    }

    if (new Date(targetAssign.dueDate) < new Date()) {
      throw new Error('La asignación de check-in ha expirado.');
    }

    if (targetAssign.status === 'completed' || checkInResponses.some(r => r.assignmentId === assignmentId)) {
      throw new Error('Este check-in ya ha sido completado previamente.');
    }

    const patient = patients.find(p => p.id === targetAssign.patientId);
    const patientName = patient ? `${patient.firstName} ${patient.lastName}` : 'Paciente';

    const responseId = `resp-${crypto.randomUUID()}`;
    const newResponse: CheckInResponse = {
      id: responseId,
      assignmentId,
      organizationId: targetAssign.organizationId,
      patientId: targetAssign.patientId,
      energyScore,
      adherenceScore,
      helpRequested,
      notes: (notes || '').trim(),
      sleepScore: optionalScores?.sleepScore,
      digestionScore: optionalScores?.digestionScore,
      satietyScore: optionalScores?.satietyScore,
      submittedAt: new Date().toISOString(),
    };

    const generatedAlerts = evaluateCheckInAlerts(newResponse, patientName);

    setMockState(prev => ({
      ...prev,
      checkInResponses: [newResponse, ...prev.checkInResponses],
      checkInAssignments: prev.checkInAssignments.map(a =>
        a.id === assignmentId ? { ...a, status: 'completed' as const } : a
      ),
      alerts: generatedAlerts.length > 0 ? [...generatedAlerts, ...prev.alerts] : prev.alerts,
    }));

    const confirmationMessage = helpRequested
      ? 'Tu solicitud fue registrada y destacada para que tu nutricionista pueda revisarla.'
      : 'Recibimos tu check-in. Tu nutricionista podrá revisar tus respuestas y contactarte si es necesario.';

    return {
      confirmationMessage,
      alertsGenerated: generatedAlerts.length,
    };
  };

  const resetToInitialMockData = () => {
    setMockState(createInitialMockData());
    setCurrentDemoPatientId('pat-1');
    setCurrentDemoNutritionistId('nutri-1');
  };

  return (
    <MockContext.Provider
      value={{
        currentDemoPatientId,
        setCurrentDemoPatientId,
        currentDemoPatient,
        currentDemoNutritionistId,
        setCurrentDemoNutritionistId,
        currentDemoNutritionist,
        updateProfessionalProfile,
        organizations,
        toggleOrganizationStatus,
        setOrganizationStatus,
        addOrganization,
        changeOrganizationPlan,
        registerPayment,
        inviteAdditionalManager,
        inviteNutritionist,
        nutritionists,
        patients,
        addPatient,
        revokePatientInvitation,
        resendPatientInvitation,
        checkInAssignments,
        createCheckInAssignment,
        checkInResponses,
        alerts,
        acknowledgeAlert,
        resolveAlert,
        recommendations,
        addRecommendation,
        submitCheckInResponse,
        professionalPatients,
        professionalAlerts,
        professionalAssignments,
        professionalRecommendations,
        professionalMotivationalPhrases,
        addMotivationalPhrase,
        updateMotivationalPhrase,
        duplicateMotivationalPhrase,
        deleteMotivationalPhrase,
        setMotivationalPhrasePatients,
        professionalResources,
        professionalRecipes,
        patientResources,
        patientRecipes,
        addProfessionalResource,
        updateProfessionalResource,
        addProfessionalRecipe,
        setProfessionalResourceStatus,
        setProfessionalRecipeStatus,
        duplicateProfessionalRecipe,
        professionalMealPlans,
        professionalMealPlanAssignments,
        patientMealPlanAssignments,
        createMealPlan,
        duplicateMealPlan,
        updateMealPlan,
        setMealPlanStatus,
        assignMealPlan,
        endMealPlanAssignment,
        mealAdherenceRecords,
        setMealCompleted,
        setMealComment,
        markMealCommentReviewed,
        professionalNextStepLists,
        patientNextStepList,
        createNextStepList,
        updateNextStepList,
        assignNextStepList,
        unassignNextStepList,
        duplicateNextStepList,
        deleteNextStepList,
        updateNextStepItemByPatient,
        professionalAnthropometricMeasurements,
        updateOrganizationBranding,
        patientAnthropometricMeasurements,
        recordProfessionalAnthropometricMeasurement,
        updateProfessionalAnthropometricMeasurement,
        deleteProfessionalAnthropometricMeasurement,
        recordPatientAnthropometricMeasurement,
        professionalAppointments,
        createAppointment,
        requestAppointmentByPatient,
        updateAppointment,
        rescheduleAppointment,
        updateAppointmentStatus,
        updateAppointmentPrivateNote,
        resolveAppointmentBilling,
        professionalAppointmentPaymentMovements,
        recordAppointmentPayment,
        recordAppointmentRefund,
        patientAppointmentNotifications,
        markAppointmentNotificationRead,
        professionalAppointmentChangeRequests,
        patientAppointmentChangeRequests,
        requestPatientAppointmentChange,
        withdrawPatientAppointmentRequest,
        resolvePatientAppointmentChange,
        professionalPracticeSettings,
        updateProfessionalPracticeSettings,
        resetToInitialMockData,
      }}
    >
      {children}
    </MockContext.Provider>
  );
};

export const useMock = () => {
  const context = useContext(MockContext);
  if (!context) {
    throw new Error('useMock debe ser utilizado dentro de un MockProvider');
  }
  return context;
};
