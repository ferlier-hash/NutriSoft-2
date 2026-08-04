import React, { createContext, useContext, useState, useMemo } from 'react';
import type { Organization, Nutritionist, Patient, CheckInAssignment, CheckInResponse, Alert, Recommendation } from '../types';
import { createInitialMockData } from '../mocks/mockData';
import { evaluateCheckInAlerts } from '../mocks/alertEngine';

interface MockContextType {
  // Demo Patient Context
  currentDemoPatientId: string;
  setCurrentDemoPatientId: (id: string) => void;
  currentDemoPatient: Patient | null;

  // Demo Professional Context
  currentDemoNutritionistId: string;
  setCurrentDemoNutritionistId: (id: string) => void;
  currentDemoNutritionist: Nutritionist | null;

  // Global State & Derived Entities
  organizations: Organization[];
  toggleOrganizationStatus: (id: string) => void;
  addOrganization: (name: string, location: string, plan: 'Básico' | 'Pro' | 'Enterprise') => Organization;
  
  nutritionists: Nutritionist[];

  patients: Patient[];
  addPatient: (patientData: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    age?: number;
    city?: string;
    objective?: string;
  }) => Patient;
  
  checkInAssignments: CheckInAssignment[];
  createCheckInAssignment: (patientId: string) => CheckInAssignment;
  
  checkInResponses: CheckInResponse[];
  
  alerts: Alert[];
  resolveAlert: (alertId: string) => void;
  
  recommendations: Recommendation[];
  addRecommendation: (patientId: string, text: string) => Recommendation;
  
  submitCheckInResponse: (
    assignmentId: string,
    energyScore: number,
    adherenceScore: number,
    helpRequested: boolean,
    notes?: string
  ) => { confirmationMessage: string; alertsGenerated: number };

  // Selectores Derivados de Aislamiento del Profesional
  professionalPatients: Patient[];
  professionalAlerts: Alert[];
  professionalAssignments: CheckInAssignment[];
  professionalRecommendations: Recommendation[];

  resetToInitialMockData: () => void;
}

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
  const nutritionists = useMemo(() => {
    return rawNutritionists.map(n => ({
      ...n,
      assignedPatientsCount: patients.filter(p => p.assignedNutritionistId === n.id && p.status !== 'archived').length,
    }));
  }, [rawNutritionists, patients]);

  const organizations = useMemo(() => {
    return rawOrganizations.map(org => ({
      ...org,
      nutritionistsCount: nutritionists.filter(n => n.organizationId === org.id).length,
      patientsCount: patients.filter(p => p.organizationId === org.id && p.status !== 'archived').length,
    }));
  }, [rawOrganizations, nutritionists, patients]);

  // SCOPE-01: Selectores Derivados para el Profesional Actual
  const professionalPatients = useMemo(() => {
    if (!currentDemoNutritionist) return [];
    return patients.filter(
      p =>
        p.assignedNutritionistId === currentDemoNutritionist.id &&
        p.organizationId === currentDemoNutritionist.organizationId &&
        p.status !== 'archived'
    );
  }, [patients, currentDemoNutritionist]);

  const professionalAlerts = useMemo(() => {
    return alerts.filter(a => professionalPatients.some(p => p.id === a.patientId));
  }, [alerts, professionalPatients]);

  const professionalAssignments = useMemo(() => {
    return checkInAssignments.filter(a => professionalPatients.some(p => p.id === a.patientId));
  }, [checkInAssignments, professionalPatients]);

  const professionalRecommendations = useMemo(() => {
    return recommendations.filter(r => professionalPatients.some(p => p.id === r.patientId));
  }, [recommendations, professionalPatients]);

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

  // UX-01: Alta de organización real en mock
  const addOrganization = (name: string, location: string, plan: 'Básico' | 'Pro' | 'Enterprise'): Organization => {
    const trimmedName = name.trim();
    if (!trimmedName) throw new Error('El nombre de la organización es obligatorio.');
    const trimmedLocation = location.trim();
    if (!trimmedLocation) throw new Error('La ubicación es obligatoria.');

    const newOrg: Organization = {
      id: `org-${crypto.randomUUID()}`,
      name: trimmedName,
      location: trimmedLocation,
      status: 'active',
      nutritionistsCount: 0,
      patientsCount: 0,
      plan,
      createdAt: new Date().toISOString(),
    };

    setMockState(prev => ({
      ...prev,
      organizations: [newOrg, ...prev.organizations],
    }));

    return newOrg;
  };

  // DATA-01 & SCOPE-01: Crear Paciente con contexto del profesional actual y sin inventar datos
  const addPatient = (patientData: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    age?: number;
    city?: string;
    objective?: string;
  }): Patient => {
    if (!currentDemoNutritionist) {
      throw new Error('No hay un nutricionista activo seleccionado.');
    }

    const trimmedFirstName = patientData.firstName.trim();
    const trimmedLastName = patientData.lastName.trim();
    const trimmedEmail = patientData.email.trim();

    if (!trimmedFirstName || !trimmedLastName || !trimmedEmail) {
      throw new Error('Nombre, apellido y correo electrónico son obligatorios.');
    }

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
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      portalAccessStatus: 'pending', // DATA-01: Inicia en pending
    };

    setMockState(prev => ({
      ...prev,
      patients: [newPatient, ...prev.patients],
    }));

    return newPatient;
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

    const newRec: Recommendation = {
      id: `rec-${crypto.randomUUID()}`,
      organizationId: patient.organizationId,
      patientId: patient.id,
      createdBy: currentDemoNutritionistId,
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
    notes?: string
  ) => {
    if (energyScore < 1 || energyScore > 5 || adherenceScore < 1 || adherenceScore > 5) {
      throw new Error('Las puntuaciones deben estar dentro del rango 1 a 5.');
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
        organizations,
        toggleOrganizationStatus,
        addOrganization,
        nutritionists,
        patients,
        addPatient,
        checkInAssignments,
        createCheckInAssignment,
        checkInResponses,
        alerts,
        resolveAlert,
        recommendations,
        addRecommendation,
        submitCheckInResponse,
        professionalPatients,
        professionalAlerts,
        professionalAssignments,
        professionalRecommendations,
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
