import React, { createContext, useContext, useState } from 'react';
import type { Organization, Nutritionist, Patient, CheckInAssignment, CheckInResponse, Alert, Recommendation } from '../types';
import { initialOrganizations, initialNutritionists, initialPatients, initialAlerts, initialCheckInAssignments, initialCheckInResponses, initialRecommendations } from '../mocks/mockData';
import { evaluateCheckInAlerts } from '../mocks/alertEngine';

interface MockContextType {
  currentDemoPatientId: string;
  setCurrentDemoPatientId: (id: string) => void;
  currentDemoPatient: Patient | null;

  organizations: Organization[];
  toggleOrganizationStatus: (id: string) => void;
  
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
    currentPlan?: string;
    assignedNutritionistId?: string;
    organizationId?: string;
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
    patientId: string,
    energyScore: number,
    adherenceScore: number,
    helpRequested: boolean,
    notes?: string
  ) => { confirmationMessage: string; alertsGenerated: number };

  resetToInitialMockData: () => void;
}

const MockContext = createContext<MockContextType | undefined>(undefined);

export const MockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentDemoPatientId, setCurrentDemoPatientId] = useState<string>('pat-1');
  const [organizations, setOrganizations] = useState<Organization[]>(initialOrganizations);
  const [nutritionists] = useState<Nutritionist[]>(initialNutritionists);
  const [patients, setPatients] = useState<Patient[]>(initialPatients);
  const [checkInAssignments, setCheckInAssignments] = useState<CheckInAssignment[]>(initialCheckInAssignments);
  const [checkInResponses, setCheckInResponses] = useState<CheckInResponse[]>(initialCheckInResponses);
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);
  const [recommendations, setRecommendations] = useState<Recommendation[]>(initialRecommendations);

  // Paciente simulado actual (puede ser nulo si ID no existe)
  const currentDemoPatient = patients.find(p => p.id === currentDemoPatientId) || null;

  // Toggle estado de organización (Admin)
  const toggleOrganizationStatus = (id: string) => {
    setOrganizations(prev =>
      prev.map(org => {
        if (org.id === id) {
          const newStatus = org.status === 'active' ? 'suspended' : 'active';
          return { ...org, status: newStatus };
        }
        return org;
      })
    );
  };

  // Crear Paciente (Nutricionista) - Invariantes estrictas
  const addPatient = (patientData: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    age?: number;
    city?: string;
    objective?: string;
    currentPlan?: string;
    assignedNutritionistId?: string;
    organizationId?: string;
  }): Patient => {
    const assignedNutriId = patientData.assignedNutritionistId || 'nutri-1';
    const assignedNutri = nutritionists.find(n => n.id === assignedNutriId) || nutritionists[0]!;
    const orgId = patientData.organizationId || assignedNutri.organizationId;

    const newPatient: Patient = {
      id: `pat-${Date.now()}`,
      organizationId: orgId,
      assignedNutritionistId: assignedNutri.id,
      firstName: patientData.firstName.trim(),
      lastName: patientData.lastName.trim(),
      email: patientData.email.trim(),
      phone: (patientData.phone || '').trim(),
      age: patientData.age || 0,
      city: (patientData.city || '').trim(),
      status: 'active',
      objective: (patientData.objective || 'Plan nutricional personalizado').trim(),
      currentPlan: (patientData.currentPlan || 'Plan inicio 12 semanas').trim(),
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      portalAccessStatus: 'active',
    };

    setPatients(prev => [newPatient, ...prev]);
    return newPatient;
  };

  // Asignar Check-in a un paciente - Invariantes estrictas
  const createCheckInAssignment = (patientId: string): CheckInAssignment => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) {
      throw new Error('El paciente indicado no existe.');
    }
    if (patient.status === 'archived') {
      throw new Error('No se puede asignar un check-in a un paciente archivado.');
    }

    const hasPending = checkInAssignments.some(
      a => a.patientId === patientId && a.status === 'pending'
    );
    if (hasPending) {
      throw new Error('El paciente ya tiene una asignación de check-in pendiente.');
    }

    const newAssign: CheckInAssignment = {
      id: `assign-${Date.now()}`,
      organizationId: patient.organizationId,
      patientId: patient.id,
      createdBy: patient.assignedNutritionistId,
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    setCheckInAssignments(prev => [newAssign, ...prev]);
    return newAssign;
  };

  // Resolver alerta en Bandeja de Atención
  const resolveAlert = (alertId: string) => {
    setAlerts(prev =>
      prev.map(alert => {
        if (alert.id === alertId) {
          return {
            ...alert,
            status: 'resolved' as const,
            resolvedBy: 'Lic. Andrea N.',
            resolvedAt: new Date().toISOString(),
          };
        }
        return alert;
      })
    );
  };

  // Emitir Recomendación a un paciente - Invariantes estrictas
  const addRecommendation = (patientId: string, text: string): Recommendation => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) {
      throw new Error('El paciente indicado no existe.');
    }

    const trimmedText = text.trim();
    if (!trimmedText) {
      throw new Error('La recomendación no puede estar vacía o compuesta solo por espacios.');
    }

    const newRec: Recommendation = {
      id: `rec-${Date.now()}`,
      organizationId: patient.organizationId,
      patientId: patient.id,
      createdBy: patient.assignedNutritionistId,
      recommendationText: trimmedText,
      createdAt: new Date().toISOString(),
    };

    setRecommendations(prev => [newRec, ...prev]);
    return newRec;
  };

  // Responder Check-in (Paciente) - Invariantes estrictas
  const submitCheckInResponse = (
    assignmentId: string,
    patientId: string,
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

    if (targetAssign.patientId !== patientId) {
      throw new Error('Esta asignación no pertenece al paciente indicado.');
    }

    if (new Date(targetAssign.dueDate) < new Date()) {
      throw new Error('La asignación de check-in ha expirado.');
    }

    if (targetAssign.status === 'completed' || checkInResponses.some(r => r.assignmentId === assignmentId)) {
      throw new Error('Este check-in ya ha sido completado previamente.');
    }

    const patient = patients.find(p => p.id === patientId);
    const patientName = patient ? `${patient.firstName} ${patient.lastName}` : 'Paciente';

    const responseId = `resp-${Date.now()}`;
    const newResponse: CheckInResponse = {
      id: responseId,
      assignmentId,
      organizationId: targetAssign.organizationId,
      patientId,
      energyScore,
      adherenceScore,
      helpRequested,
      notes: (notes || '').trim(),
      submittedAt: new Date().toISOString(),
    };

    setCheckInResponses(prev => [newResponse, ...prev]);

    setCheckInAssignments(prev =>
      prev.map(a => (a.id === assignmentId ? { ...a, status: 'completed' as const } : a))
    );

    const generatedAlerts = evaluateCheckInAlerts(newResponse, patientName);
    if (generatedAlerts.length > 0) {
      setAlerts(prev => [...generatedAlerts, ...prev]);
    }

    const confirmationMessage = helpRequested
      ? 'Tu solicitud fue registrada y destacada para que tu nutricionista pueda revisarla.'
      : 'Recibimos tu check-in. Tu nutricionista podrá revisar tus respuestas y contactarte si es necesario.';

    return {
      confirmationMessage,
      alertsGenerated: generatedAlerts.length,
    };
  };

  const resetToInitialMockData = () => {
    setOrganizations(initialOrganizations);
    setPatients(initialPatients);
    setCheckInAssignments(initialCheckInAssignments);
    setCheckInResponses(initialCheckInResponses);
    setAlerts(initialAlerts);
    setRecommendations(initialRecommendations);
    setCurrentDemoPatientId('pat-1');
  };

  return (
    <MockContext.Provider
      value={{
        currentDemoPatientId,
        setCurrentDemoPatientId,
        currentDemoPatient,
        organizations,
        toggleOrganizationStatus,
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
