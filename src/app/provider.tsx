import React, { createContext, useContext, useState } from 'react';
import type { UserRole, Organization, Nutritionist, Patient, CheckInAssignment, CheckInResponse, Alert, Recommendation } from '../types';
import { initialOrganizations, initialNutritionists, initialPatients, initialAlerts, initialCheckInAssignments, initialRecommendations } from '../mocks/mockData';
import { evaluateCheckInAlerts } from '../mocks/alertEngine';

interface MockContextType {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  
  currentDemoPatientId: string;
  setCurrentDemoPatientId: (id: string) => void;
  currentDemoPatient: Patient;

  organizations: Organization[];
  toggleOrganizationStatus: (id: string) => void;
  
  nutritionists: Nutritionist[];

  patients: Patient[];
  addPatient: (patientData: Omit<Patient, 'id' | 'organizationId' | 'assignedNutritionistId' | 'createdAt' | 'lastActiveAt' | 'portalAccessStatus'>) => Patient;
  
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

  resetToInitialMockData: () => void;
}

const MockContext = createContext<MockContextType | undefined>(undefined);

export const MockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRole] = useState<UserRole>('nutritionist');
  const [currentDemoPatientId, setCurrentDemoPatientId] = useState<string>('pat-1');
  const [organizations, setOrganizations] = useState<Organization[]>(initialOrganizations);
  const [nutritionists] = useState<Nutritionist[]>(initialNutritionists);
  const [patients, setPatients] = useState<Patient[]>(initialPatients);
  const [checkInAssignments, setCheckInAssignments] = useState<CheckInAssignment[]>(initialCheckInAssignments);
  const [checkInResponses, setCheckInResponses] = useState<CheckInResponse[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);
  const [recommendations, setRecommendations] = useState<Recommendation[]>(initialRecommendations);

  // Paciente simulado actual (garantizado no nulo)
  const currentDemoPatient = patients.find(p => p.id === currentDemoPatientId) || patients[0] || {
    id: 'pat-1',
    organizationId: 'org-1',
    firstName: 'María',
    lastName: 'González',
    email: 'maria@example.com',
    phone: '+52 55 1234 5678',
    age: 28,
    city: 'Ciudad de México',
    status: 'active' as const,
    assignedNutritionistId: 'nutri-1',
    objective: 'Bienestar general',
    currentPlan: 'Plan balance 12 semanas',
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    portalAccessStatus: 'active' as const,
  };

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

  // Crear Paciente (Nutricionista)
  const addPatient = (
    patientData: Omit<Patient, 'id' | 'organizationId' | 'assignedNutritionistId' | 'createdAt' | 'lastActiveAt' | 'portalAccessStatus'>
  ): Patient => {
    const newPatient: Patient = {
      ...patientData,
      id: `pat-${Date.now()}`,
      organizationId: 'org-1',
      assignedNutritionistId: 'nutri-1',
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      portalAccessStatus: 'active',
    };
    setPatients(prev => [newPatient, ...prev]);
    return newPatient;
  };

  // Asignar Check-in a un paciente
  const createCheckInAssignment = (patientId: string): CheckInAssignment => {
    const newAssign: CheckInAssignment = {
      id: `assign-${Date.now()}`,
      organizationId: 'org-1',
      patientId,
      createdBy: 'nutri-1',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
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
            resolvedBy: 'Andrea (Nutricionista)',
            resolvedAt: new Date().toISOString(),
          };
        }
        return alert;
      })
    );
  };

  // Emitir Recomendación a un paciente
  const addRecommendation = (patientId: string, text: string): Recommendation => {
    const newRec: Recommendation = {
      id: `rec-${Date.now()}`,
      organizationId: 'org-1',
      patientId,
      createdBy: 'nutri-1',
      recommendationText: text,
      createdAt: new Date().toISOString(),
    };
    setRecommendations(prev => [newRec, ...prev]);
    return newRec;
  };

  // Responder Check-in (Paciente)
  const submitCheckInResponse = (
    assignmentId: string,
    energyScore: number,
    adherenceScore: number,
    helpRequested: boolean,
    notes?: string
  ) => {
    // Validar puntuaciones válidas
    if (energyScore < 1 || energyScore > 5 || adherenceScore < 1 || adherenceScore > 5) {
      throw new Error('Las puntuaciones deben estar dentro del rango 1 a 5.');
    }

    // Validar que la asignación exista y no haya sido respondida previamente
    const targetAssign = checkInAssignments.find(a => a.id === assignmentId);
    if (!targetAssign) {
      throw new Error('La asignación de check-in no existe.');
    }
    if (targetAssign.status === 'completed' || checkInResponses.some(r => r.assignmentId === assignmentId)) {
      throw new Error('Este check-in ya ha sido completado previamente.');
    }

    const patientId = targetAssign.patientId;
    const patient = patients.find(p => p.id === patientId);
    const patientName = patient ? `${patient.firstName} ${patient.lastName}` : 'Paciente';

    const responseId = `resp-${Date.now()}`;
    const newResponse: CheckInResponse = {
      id: responseId,
      assignmentId,
      organizationId: 'org-1',
      patientId,
      energyScore,
      adherenceScore,
      helpRequested,
      notes,
      submittedAt: new Date().toISOString(),
    };

    setCheckInResponses(prev => [newResponse, ...prev]);

    // Marcar asignación como completada
    setCheckInAssignments(prev =>
      prev.map(a => (a.id === assignmentId ? { ...a, status: 'completed' as const } : a))
    );

    // Evaluar reglas dinámicas de alerta (solo ALTA o NINGUNA)
    const generatedAlerts = evaluateCheckInAlerts(newResponse, patientName);
    if (generatedAlerts.length > 0) {
      setAlerts(prev => [...generatedAlerts, ...prev]);
    }

    // Mensajes de confirmación estrictamente neutrales
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
    setCheckInResponses([]);
    setAlerts(initialAlerts);
    setRecommendations(initialRecommendations);
    setCurrentDemoPatientId('pat-1');
  };

  return (
    <MockContext.Provider
      value={{
        currentRole,
        setCurrentRole,
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
