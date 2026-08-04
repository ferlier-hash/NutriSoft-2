import type { CheckInResponse, Alert } from '../types';

/**
 * MOTOR DE REGLAS DE ALERTAS (FASE 1 - MOCK)
 * 
 * Reglas dinámicas evaluadas al recibir un check-in:
 * 1. solicitud de ayuda = true  => Prioridad ALTA ('high')
 * 2. energía <= 2              => Prioridad ALTA ('high')
 * 3. adherencia <= 2           => Prioridad ALTA ('high')
 * 4. respuesta normal          => Sin alerta ('none')
 * 
 * NOTA DE DISEÑO:
 * Este motor NO genera la prioridad 'medium' dinámicamente. La prioridad 'medium'
 * existe exclusivamente en los datos precargados de demostración estática
 * para validar la renderización visual de la interfaz.
 */
export function evaluateCheckInAlerts(
  response: CheckInResponse,
  patientName: string
): Alert[] {
  const alerts: Alert[] = [];
  const now = new Date().toISOString();

  // Regla 1: Solicitud de ayuda
  if (response.helpRequested) {
    alerts.push({
      id: `alert-help-${Date.now()}`,
      organizationId: response.organizationId,
      patientId: response.patientId,
      responseId: response.id,
      ruleCode: 'HELP_REQUESTED',
      priority: 'high',
      patientName,
      reasonText: 'solicitó ayuda explícita en su check-in',
      recommendedAction: 'Contactar al paciente de inmediato para atención prioritaria.',
      status: 'unresolved',
      createdAt: now,
    });
  }

  // Regla 2: Energía baja (<= 2)
  if (response.energyScore <= 2) {
    alerts.push({
      id: `alert-energy-${Date.now()}`,
      organizationId: response.organizationId,
      patientId: response.patientId,
      responseId: response.id,
      ruleCode: 'LOW_ENERGY',
      priority: 'high',
      patientName,
      reasonText: `Energía baja (${response.energyScore}/5)`,
      recommendedAction: 'Revisar ingesta calórica y distribución de macronutrientes.',
      status: 'unresolved',
      createdAt: now,
    });
  }

  // Regla 3: Adherencia baja (<= 2)
  if (response.adherenceScore <= 2) {
    alerts.push({
      id: `alert-adh-${Date.now()}`,
      organizationId: response.organizationId,
      patientId: response.patientId,
      responseId: response.id,
      ruleCode: 'LOW_ADHERENCE',
      priority: 'high',
      patientName,
      reasonText: `Adherencia baja (${response.adherenceScore}/5)`,
      recommendedAction: 'Ajustar flexibilidad del plan alimentario y evaluar barreras.',
      status: 'unresolved',
      createdAt: now,
    });
  }

  return alerts;
}
