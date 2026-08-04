import type { CheckInResponse, Alert } from '../types';

export function evaluateCheckInAlerts(response: CheckInResponse, patientName: string): Alert[] {
  const alerts: Alert[] = [];
  const createdAt = new Date().toISOString();

  // Regla 1: Solicitud explícita de ayuda -> Alerta ALTA
  if (response.helpRequested) {
    alerts.push({
      id: `alert-${Date.now()}-help`,
      organizationId: response.organizationId,
      patientId: response.patientId,
      responseId: response.id,
      ruleCode: 'HELP_REQUESTED',
      priority: 'high',
      patientName,
      reasonText: 'solicitó ayuda explícita en su check-in',
      recommendedAction: 'Contactar al paciente de manera prioritaria.',
      status: 'unresolved',
      createdAt,
    });
  }

  // Regla 2: Energía ≤ 2 -> Alerta ALTA
  if (response.energyScore <= 2) {
    alerts.push({
      id: `alert-${Date.now()}-energy`,
      organizationId: response.organizationId,
      patientId: response.patientId,
      responseId: response.id,
      ruleCode: 'LOW_ENERGY',
      priority: 'high',
      patientName,
      reasonText: `reportó nivel de energía bajo (${response.energyScore}/5)`,
      recommendedAction: 'Revisar el check-in y contactar al paciente para conocer el contexto.',
      status: 'unresolved',
      createdAt,
    });
  }

  // Regla 3: Adherencia ≤ 2 -> Alerta ALTA
  if (response.adherenceScore <= 2) {
    alerts.push({
      id: `alert-${Date.now()}-adherence`,
      organizationId: response.organizationId,
      patientId: response.patientId,
      responseId: response.id,
      ruleCode: 'LOW_ADHERENCE',
      priority: 'high',
      patientName,
      reasonText: `reportó adherencia baja al plan (${response.adherenceScore}/5)`,
      recommendedAction: 'Revisar las barreras reportadas y evaluar el seguimiento con el paciente.',
      status: 'unresolved',
      createdAt,
    });
  }

  return alerts;
}
