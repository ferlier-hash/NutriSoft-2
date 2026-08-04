import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MockProvider, useMock } from '../app/provider';

describe('TEST-01: Secuencia de Flujo Completo Real de 12 Pasos (Fase 1.1.2)', () => {
  it('Ejecuta la secuencia de 12 pasos verificando coherencia, aislamiento y alertas', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <MockProvider>{children}</MockProvider>;
    const { result } = renderHook(() => useMock(), { wrapper });

    // 1. Entrar como Andrea (Lic. Andrea N.)
    expect(result.current.currentDemoNutritionistId).toBe('nutri-1');
    expect(result.current.currentDemoNutritionist?.name).toBe('Lic. Andrea N.');

    // 2. Crear paciente desde el formulario (Camila Ríos)
    let createdPatient: ReturnType<typeof result.current.addPatient> | undefined;
    act(() => {
      createdPatient = result.current.addPatient({
        firstName: 'Camila',
        lastName: 'Ríos',
        email: 'camila.rios@example.com',
        phone: '+52 55 9999 8888',
        objective: 'Mejorar hábitos y energía',
      });
    });

    expect(createdPatient).toBeDefined();
    expect(createdPatient?.id).toBeDefined();
    expect(createdPatient?.assignedNutritionistId).toBe('nutri-1');
    expect(createdPatient?.portalAccessStatus).toBe('pending');
    expect(createdPatient?.currentPlan).toBeNull();

    // 3. Asignarle check-in desde la UI
    let assignment: ReturnType<typeof result.current.createCheckInAssignment> | undefined;
    act(() => {
      assignment = result.current.createCheckInAssignment(createdPatient!.id);
    });

    expect(assignment).toBeDefined();
    expect(assignment?.patientId).toBe(createdPatient!.id);
    expect(assignment?.status).toBe('pending');

    // 4. Cambiar al paciente creado (Camila Ríos)
    act(() => {
      result.current.setCurrentDemoPatientId(createdPatient!.id);
    });

    expect(result.current.currentDemoPatientId).toBe(createdPatient!.id);
    expect(result.current.currentDemoPatient?.firstName).toBe('Camila');

    // 5 & 6. Completar energía=1, adherencia=1, ayuda=true y notas, y confirmar envío
    let submission: ReturnType<typeof result.current.submitCheckInResponse> | undefined;
    act(() => {
      submission = result.current.submitCheckInResponse(
        assignment!.id,
        1,
        1,
        true,
        'Necesito ayuda urgente con la dieta'
      );
    });

    expect(submission?.alertsGenerated).toBe(3);

    // 7. Volver como Andrea
    act(() => {
      result.current.setCurrentDemoNutritionistId('nutri-1');
    });

    // 8. Ver las alertas generadas en la bandeja del profesional
    const camilaAlerts = result.current.professionalAlerts.filter(a => a.patientId === createdPatient!.id);
    expect(camilaAlerts.length).toBe(3);
    expect(camilaAlerts[0]?.patientName).toBe('Camila Ríos');

    // 9. Resolver una alerta
    const targetAlertId = camilaAlerts[0]!.id;
    act(() => {
      result.current.resolveAlert(targetAlertId);
    });

    const resolvedAlert = result.current.alerts.find(a => a.id === targetAlertId);
    expect(resolvedAlert?.status).toBe('resolved');
    expect(resolvedAlert?.resolvedBy).toBe('Lic. Andrea N.');

    // 10. Emitir recomendación desde la ficha del paciente
    let newRec: ReturnType<typeof result.current.addRecommendation> | undefined;
    act(() => {
      newRec = result.current.addRecommendation(
        createdPatient!.id,
        'Beber 2 litros de agua y tomar colación de almendras a las 16h.'
      );
    });

    expect(newRec).toBeDefined();
    expect(newRec?.createdBy).toBe('nutri-1');

    // 11. Cambiar nuevamente al paciente (Camila Ríos)
    act(() => {
      result.current.setCurrentDemoPatientId(createdPatient!.id);
    });

    // 12. Ver únicamente esa recomendación en el portal del paciente
    const camilaRecs = result.current.recommendations.filter(r => r.patientId === createdPatient!.id);
    expect(camilaRecs.length).toBe(1);
    expect(camilaRecs[0]?.recommendationText).toBe(
      'Beber 2 litros de agua y tomar colación de almendras a las 16h.'
    );
  });
});
