import { describe, it, expect } from 'vitest';
import { evaluateCheckInAlerts } from '../mocks/alertEngine';
import type { Patient, CheckInAssignment, CheckInResponse, Alert, Recommendation } from '../types';

describe('Flujo Completo Simulado (Fase 1 E2E)', () => {
  it('ejecuta la secuencia completa de paciente -> check-in -> alerta alta -> resolución -> recomendación', () => {
    // 1. Nutricionista crea un paciente ficticio
    const patient: Patient = {
      id: 'pat-flow-100',
      organizationId: 'org-1',
      firstName: 'Camila',
      lastName: 'Valenzuela',
      email: 'camila.valenzuela@example.com',
      phone: '+56 9 1234 5678',
      age: 27,
      city: 'Santiago',
      status: 'active',
      assignedNutritionistId: 'nutri-1',
      objective: 'Bienestar digestivo',
      currentPlan: 'Plan balance 8 semanas',
      createdAt: new Date().toISOString(),
    };
    expect(patient.id).toBe('pat-flow-100');

    // 2. Nutricionista asigna un check-in
    const assignment: CheckInAssignment = {
      id: 'assign-flow-100',
      organizationId: 'org-1',
      patientId: patient.id,
      createdBy: 'nutri-1',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    expect(assignment.status).toBe('pending');

    // 3. Paciente responde el check-in (Energía=1, Solicitó ayuda=true)
    const response: CheckInResponse = {
      id: 'resp-flow-100',
      assignmentId: assignment.id,
      organizationId: 'org-1',
      patientId: patient.id,
      energyScore: 1,
      adherenceScore: 2,
      helpRequested: true,
      notes: 'Me he sentido muy fatigada esta semana.',
      submittedAt: new Date().toISOString(),
    };
    assignment.status = 'completed';

    // 4. El motor de alertas evalúa la respuesta y genera las alertas
    const alertsGenerated: Alert[] = evaluateCheckInAlerts(response, `${patient.firstName} ${patient.lastName}`);
    expect(alertsGenerated.length).toBeGreaterThan(0);
    
    const highAlert = alertsGenerated.find(a => a.priority === 'high');
    expect(highAlert).toBeDefined();
    expect(highAlert?.ruleCode).toBe('HELP_REQUESTED');

    // 5. Nutricionista resuelve la alerta en la Bandeja de Atención
    if (highAlert) {
      highAlert.status = 'resolved';
      highAlert.resolvedBy = 'Andrea (Nutricionista)';
      highAlert.resolvedAt = new Date().toISOString();
    }
    expect(highAlert?.status).toBe('resolved');

    // 6. Nutricionista emite una recomendación para la paciente
    const rec: Recommendation = {
      id: 'rec-flow-100',
      organizationId: 'org-1',
      patientId: patient.id,
      responseId: response.id,
      createdBy: 'nutri-1',
      recommendationText: 'Te sugiero agregar una colación con proteína a media mañana y aumentar la hidratación.',
      createdAt: new Date().toISOString(),
    };

    // 7. Verificación final: La paciente puede visualizar su recomendación
    expect(rec.patientId).toBe(patient.id);
    expect(rec.recommendationText).toContain('colación con proteína');
  });
});
