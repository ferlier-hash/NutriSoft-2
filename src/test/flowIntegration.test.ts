import { describe, it, expect } from 'vitest';
import { evaluateCheckInAlerts } from '../mocks/alertEngine';
import type { Patient, CheckInAssignment, CheckInResponse } from '../types';

describe('Flujo de Integración Mock - Fase 1.1', () => {
  it('ejecuta el ciclo de vida completo: Paciente -> Asignación -> Respuesta -> Alerta -> Resolución', () => {
    // 1. Paciente creado
    const mockPatient: Patient = {
      id: 'pat-flow-1',
      organizationId: 'org-1',
      firstName: 'Valentina',
      lastName: 'Rojas',
      email: 'valentina@example.com',
      phone: '+52 55 9999 8888',
      age: 30,
      city: 'Ciudad de México',
      status: 'active',
      assignedNutritionistId: 'nutri-1',
      objective: 'Reeducación alimentaria',
      currentPlan: 'Plan inicio 12 semanas',
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      portalAccessStatus: 'active',
    };

    // 2. Asignación de check-in creada
    const mockAssignment: CheckInAssignment = {
      id: 'assign-flow-1',
      organizationId: 'org-1',
      patientId: mockPatient.id,
      createdBy: 'nutri-1',
      dueDate: '2026-08-04T23:59:59Z',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    // 3. Paciente responde con baja energía y solicitud de ayuda
    const mockResponse: CheckInResponse = {
      id: 'resp-flow-1',
      assignmentId: mockAssignment.id,
      organizationId: 'org-1',
      patientId: mockPatient.id,
      energyScore: 2,
      adherenceScore: 4,
      helpRequested: true,
      notes: 'Me siento con mucho cansancio esta semana',
      submittedAt: new Date().toISOString(),
    };

    // 4. Se procesa la respuesta en el motor de alertas
    const alertsGenerated = evaluateCheckInAlerts(mockResponse, `${mockPatient.firstName} ${mockPatient.lastName}`);
    expect(alertsGenerated.length).toBeGreaterThan(0);
    expect(alertsGenerated[0]?.priority).toBe('high');
    expect(alertsGenerated[0]?.ruleCode).toBe('HELP_REQUESTED');

    // 5. El nutricionista resuelve la alerta
    const alertToResolve = alertsGenerated[0]!;
    const resolvedAlert = {
      ...alertToResolve,
      status: 'resolved' as const,
      resolvedBy: 'Lic. Andrea N.',
      resolvedAt: new Date().toISOString(),
    };

    expect(resolvedAlert.status).toBe('resolved');
    expect(resolvedAlert.resolvedBy).toBe('Lic. Andrea N.');
  });
});
