import type { Organization, Nutritionist, Patient, Alert, CheckInAssignment, CheckInResponse, Recommendation } from '../types';
import { daysAgo, hoursAgo, daysInFuture } from '../lib/dateUtils';

export interface InitialMockData {
  organizations: Organization[];
  nutritionists: Nutritionist[];
  patients: Patient[];
  checkInAssignments: CheckInAssignment[];
  checkInResponses: CheckInResponse[];
  alerts: Alert[];
  recommendations: Recommendation[];
}

export function createInitialMockData(): InitialMockData {
  const organizations: Organization[] = [
    {
      id: 'org-1',
      name: 'Clínica Bienestar',
      location: 'Ciudad de México, MX',
      status: 'active',
      nutritionistsCount: 2,
      patientsCount: 3,
      plan: 'Pro',
      createdAt: daysAgo(180),
    },
    {
      id: 'org-2',
      name: 'NutriVida',
      location: 'Guadalajara, MX',
      status: 'active',
      nutritionistsCount: 1,
      patientsCount: 2,
      plan: 'Pro',
      createdAt: daysAgo(120),
    },
    {
      id: 'org-3',
      name: 'Centro Integral Salud',
      location: 'Santiago, CL',
      status: 'suspended',
      nutritionistsCount: 0,
      patientsCount: 0,
      plan: 'Básico',
      createdAt: daysAgo(90),
    },
    {
      id: 'org-4',
      name: 'NutriSalud Express',
      location: 'Monterrey, MX',
      status: 'pending',
      nutritionistsCount: 0,
      patientsCount: 0,
      plan: 'Básico',
      createdAt: daysAgo(15),
    },
  ];

  const nutritionists: Nutritionist[] = [
    {
      id: 'nutri-1',
      organizationId: 'org-1',
      organizationName: 'Clínica Bienestar',
      name: 'Lic. Andrea N.',
      email: 'andrea@clinicabienestar.com',
      phone: '+52 55 1111 2222',
      assignedPatientsCount: 3,
      status: 'active',
      joinedAt: daysAgo(150),
      lastActiveAt: hoursAgo(2),
    },
    {
      id: 'nutri-2',
      organizationId: 'org-1',
      organizationName: 'Clínica Bienestar',
      name: 'Lic. Carlos M.',
      email: 'carlos@clinicabienestar.com',
      phone: '+52 55 3333 4444',
      assignedPatientsCount: 0,
      status: 'active',
      joinedAt: daysAgo(100),
      lastActiveAt: hoursAgo(5),
    },
    {
      id: 'nutri-3',
      organizationId: 'org-2',
      organizationName: 'NutriVida',
      name: 'Lic. Sofía R.',
      email: 'sofia@nutrivida.com',
      phone: '+52 33 4444 5555',
      assignedPatientsCount: 2,
      status: 'active',
      joinedAt: daysAgo(80),
      lastActiveAt: hoursAgo(1),
    },
  ];

  const patients: Patient[] = [
    {
      id: 'pat-1',
      organizationId: 'org-1',
      firstName: 'María',
      lastName: 'González',
      email: 'maria.gonzalez@example.com',
      phone: '+52 55 1234 5678',
      age: 28,
      city: 'Ciudad de México',
      status: 'active',
      assignedNutritionistId: 'nutri-1',
      objective: 'Mejorar energía y rutina diaria',
      currentPlan: 'Plan balance 12 semanas',
      createdAt: daysAgo(60),
      lastActiveAt: hoursAgo(3),
      portalAccessStatus: 'active',
    },
    {
      id: 'pat-2',
      organizationId: 'org-1',
      firstName: 'Pablo',
      lastName: 'Acosta',
      email: 'pablo.acosta@example.com',
      phone: '+52 55 8765 4321',
      age: 34,
      city: 'Ciudad de México',
      status: 'active',
      assignedNutritionistId: 'nutri-1',
      objective: 'Rendimiento deportivo y masa muscular',
      currentPlan: 'Plan alto rendimiento',
      createdAt: daysAgo(45),
      lastActiveAt: hoursAgo(10),
      portalAccessStatus: 'active',
    },
    {
      id: 'pat-3',
      organizationId: 'org-1',
      firstName: 'Lucía',
      lastName: 'Torres',
      email: 'lucia.torres@example.com',
      phone: '+52 55 5555 1234',
      age: 29,
      city: 'Ciudad de México',
      status: 'active',
      assignedNutritionistId: 'nutri-1',
      objective: 'Reeducación alimentaria y bienestar digestivo',
      currentPlan: 'Plan antiinflamatorio',
      createdAt: daysAgo(30),
      lastActiveAt: daysAgo(2),
      portalAccessStatus: 'pending',
    },
    {
      id: 'pat-4',
      organizationId: 'org-2',
      firstName: 'Diego',
      lastName: 'Ramírez',
      email: 'diego.ramirez@example.com',
      phone: '+52 33 4444 8888',
      age: 31,
      city: 'Guadalajara',
      status: 'active',
      assignedNutritionistId: 'nutri-3',
      objective: 'Mantenimiento y hábitos sostenibles',
      currentPlan: 'Plan mantenimiento 6 meses',
      createdAt: daysAgo(40),
      lastActiveAt: hoursAgo(4),
      portalAccessStatus: 'active',
    },
    {
      id: 'pat-5',
      organizationId: 'org-2',
      firstName: 'Sofía',
      lastName: 'Herrera',
      email: 'sofia.herrera@example.com',
      phone: '+52 33 9999 1111',
      age: 26,
      city: 'Guadalajara',
      status: 'active',
      assignedNutritionistId: 'nutri-3',
      objective: 'Nutrición consciente e hidratación',
      currentPlan: 'Plan inicio saludable',
      createdAt: daysAgo(25),
      lastActiveAt: daysAgo(5),
      portalAccessStatus: 'revoked',
    },
    {
      id: 'pat-archived',
      organizationId: 'org-1',
      firstName: 'Roberto',
      lastName: 'Sánchez',
      email: 'roberto.sanchez@example.com',
      phone: '+52 55 9999 0000',
      status: 'archived',
      assignedNutritionistId: 'nutri-1',
      objective: 'Tratamiento pausado',
      currentPlan: null,
      createdAt: daysAgo(100),
      lastActiveAt: daysAgo(60),
      portalAccessStatus: 'revoked',
    },
  ];

  const checkInAssignments: CheckInAssignment[] = [
    {
      id: 'assign-1',
      organizationId: 'org-1',
      patientId: 'pat-1',
      createdBy: 'nutri-1',
      dueDate: daysInFuture(7),
      status: 'pending',
      createdAt: daysAgo(1),
    },
    {
      id: 'assign-2',
      organizationId: 'org-1',
      patientId: 'pat-2',
      createdBy: 'nutri-1',
      dueDate: daysInFuture(5),
      status: 'completed',
      createdAt: daysAgo(3),
    },
    {
      id: 'assign-expired-1',
      organizationId: 'org-2',
      patientId: 'pat-5',
      createdBy: 'nutri-3',
      dueDate: daysAgo(2),
      status: 'expired',
      createdAt: daysAgo(9),
    },
  ];

  const checkInResponses: CheckInResponse[] = [
    {
      id: 'resp-1',
      assignmentId: 'assign-2',
      organizationId: 'org-1',
      patientId: 'pat-2',
      energyScore: 2,
      adherenceScore: 4,
      helpRequested: true,
      notes: 'Mucho cansancio esta semana',
      submittedAt: hoursAgo(5),
    },
  ];

  const alerts: Alert[] = [
    {
      id: 'alert-init-1',
      organizationId: 'org-1',
      patientId: 'pat-2',
      responseId: 'resp-1',
      ruleCode: 'HELP_REQUESTED',
      priority: 'high',
      patientName: 'Pablo Acosta',
      reasonText: 'solicitó ayuda explícita en su check-in',
      recommendedAction: 'Contactar al paciente de manera prioritaria.',
      status: 'unresolved',
      createdAt: hoursAgo(5),
    },
  ];

  const recommendations: Recommendation[] = [
    {
      id: 'rec-1',
      organizationId: 'org-1',
      patientId: 'pat-1',
      createdBy: 'nutri-1',
      recommendationText: 'Constancia diaria: Pequeños hábitos, grandes cambios. Tú puedes.',
      createdAt: daysAgo(2),
    },
    {
      id: 'rec-2',
      organizationId: 'org-1',
      patientId: 'pat-2',
      createdBy: 'nutri-1',
      recommendationText: 'Aumentar la hidratación pre-entrenamiento a 500ml de agua.',
      createdAt: daysAgo(3),
    },
  ];

  return {
    organizations,
    nutritionists,
    patients,
    checkInAssignments,
    checkInResponses,
    alerts,
    recommendations,
  };
}

// Exportar const estáticas por compatibilidad si es requerido por algún import legacy
const defaultMockData = createInitialMockData();
export const initialOrganizations = defaultMockData.organizations;
export const initialNutritionists = defaultMockData.nutritionists;
export const initialPatients = defaultMockData.patients;
export const initialCheckInAssignments = defaultMockData.checkInAssignments;
export const initialCheckInResponses = defaultMockData.checkInResponses;
export const initialAlerts = defaultMockData.alerts;
export const initialRecommendations = defaultMockData.recommendations;
