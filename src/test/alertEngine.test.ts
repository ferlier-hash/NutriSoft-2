import { describe, it, expect } from 'vitest';
import { evaluateCheckInAlerts } from '../mocks/alertEngine';
import type { CheckInResponse } from '../types';

describe('alertEngine - Reglas de Alerta Dinámicas', () => {
  it('genera alerta ALTA cuando el paciente solicita ayuda', () => {
    const mockResponse: CheckInResponse = {
      id: 'resp-test-1',
      assignmentId: 'assign-test-1',
      organizationId: 'org-1',
      patientId: 'pat-1',
      energyScore: 4,
      adherenceScore: 4,
      helpRequested: true,
      submittedAt: new Date().toISOString(),
    };

    const alerts = evaluateCheckInAlerts(mockResponse, 'María González');
    expect(alerts).toHaveLength(1);
    expect(alerts[0].priority).toBe('high');
    expect(alerts[0].ruleCode).toBe('HELP_REQUESTED');
    expect(alerts[0].patientName).toBe('María González');
  });

  it('genera alerta ALTA cuando la energía es <= 2', () => {
    const mockResponse: CheckInResponse = {
      id: 'resp-test-2',
      assignmentId: 'assign-test-2',
      organizationId: 'org-1',
      patientId: 'pat-1',
      energyScore: 2,
      adherenceScore: 4,
      helpRequested: false,
      submittedAt: new Date().toISOString(),
    };

    const alerts = evaluateCheckInAlerts(mockResponse, 'Pablo Acosta');
    expect(alerts).toHaveLength(1);
    expect(alerts[0].priority).toBe('high');
    expect(alerts[0].ruleCode).toBe('LOW_ENERGY');
  });

  it('genera alerta ALTA cuando la adherencia es <= 2', () => {
    const mockResponse: CheckInResponse = {
      id: 'resp-test-3',
      assignmentId: 'assign-test-3',
      organizationId: 'org-1',
      patientId: 'pat-1',
      energyScore: 4,
      adherenceScore: 1,
      helpRequested: false,
      submittedAt: new Date().toISOString(),
    };

    const alerts = evaluateCheckInAlerts(mockResponse, 'Lucía Torres');
    expect(alerts).toHaveLength(1);
    expect(alerts[0].priority).toBe('high');
    expect(alerts[0].ruleCode).toBe('LOW_ADHERENCE');
  });

  it('NO genera alerta cuando todos los indicadores son normales (>= 3) y no solicitó ayuda', () => {
    const mockResponse: CheckInResponse = {
      id: 'resp-test-4',
      assignmentId: 'assign-test-4',
      organizationId: 'org-1',
      patientId: 'pat-1',
      energyScore: 4,
      adherenceScore: 5,
      helpRequested: false,
      submittedAt: new Date().toISOString(),
    };

    const alerts = evaluateCheckInAlerts(mockResponse, 'Sofía Herrera');
    expect(alerts).toHaveLength(0);
  });
});
