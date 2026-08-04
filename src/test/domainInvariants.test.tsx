import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MockProvider, useMock } from '../app/provider';

describe('Invariantes del Estado Mock y Fechas Deterministas (Fase 1.1.2)', () => {
  beforeEach(() => {
    // TIME-01: Control determinista del tiempo en Vitest
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-04T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('SCOPE-01: Andrea no puede asignar check-in, emitir recomendación ni resolver alertas de pacientes de Sofía', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <MockProvider>{children}</MockProvider>;
    const { result } = renderHook(() => useMock(), { wrapper });

    // pat-4 está asignado a Sofía (nutri-3)
    expect(() => result.current.createCheckInAssignment('pat-4')).toThrow(
      'No tienes permisos para asignar check-ins a este paciente.'
    );

    expect(() => result.current.addRecommendation('pat-4', 'Recomendación inválida')).toThrow(
      'No tienes permisos para emitir recomendaciones a este paciente.'
    );

    // Intentar resolver alerta inexistente o de otro profesional
    expect(() => result.current.resolveAlert('alert-non-existent')).toThrow(
      'La alerta consultada no existe.'
    );
  });

  it('SCOPE-01: El cambio de nutricionista demo actualiza dinámicamente los selectores profesionales', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <MockProvider>{children}</MockProvider>;
    const { result } = renderHook(() => useMock(), { wrapper });

    // Por defecto Andrea (nutri-1) tiene 3 pacientes asignados
    expect(result.current.professionalPatients.length).toBe(3);

    // Cambiar a Sofía (nutri-3)
    act(() => {
      result.current.setCurrentDemoNutritionistId('nutri-3');
    });

    // Sofía tiene 2 pacientes asignados (pat-4, pat-5)
    expect(result.current.professionalPatients.length).toBe(2);
    expect(result.current.professionalPatients.map(p => p.id)).toEqual(['pat-4', 'pat-5']);
  });

  it('PATIENT-01: submitCheckInResponse obtiene patientId del assignment y rechaza assignment ajeno o expirado', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <MockProvider>{children}</MockProvider>;
    const { result } = renderHook(() => useMock(), { wrapper });

    // pat-1 intenta responder assign-2 (que pertenece a pat-2)
    expect(() =>
      result.current.submitCheckInResponse('assign-2', 4, 4, false)
    ).toThrow('No estás autorizado para responder una asignación perteneciente a otro paciente.');

    // Simular que pat-5 ingresa a su asignación expirada assign-expired-1
    act(() => {
      result.current.setCurrentDemoPatientId('pat-5');
    });

    expect(() =>
      result.current.submitCheckInResponse('assign-expired-1', 4, 4, false)
    ).toThrow('La asignación de check-in ha expirado.');
  });

  it('DATA-01 & STATUS-01: 3 alertas en una misma respuesta, no duplicidad de respuesta ni de alerta resuelta', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <MockProvider>{children}</MockProvider>;
    const { result } = renderHook(() => useMock(), { wrapper });

    // Responder assign-1 con energía=1, adherencia=1 y ayuda=true -> debe generar 3 alertas
    let submitRes: ReturnType<typeof result.current.submitCheckInResponse> | undefined;
    act(() => {
      submitRes = result.current.submitCheckInResponse('assign-1', 1, 1, true, 'S.O.S');
    });

    expect(submitRes?.alertsGenerated).toBe(3);

    // Intentar responder assign-1 nuevamente debe ser rechazado
    expect(() =>
      result.current.submitCheckInResponse('assign-1', 4, 4, false)
    ).toThrow('Este check-in ya ha sido completado previamente.');

    // Resolver una alerta
    const firstAlertId = result.current.alerts[0]!.id;
    act(() => {
      result.current.resolveAlert(firstAlertId);
    });

    // Intentar resolver la misma alerta nuevamente debe ser rechazado
    expect(() => result.current.resolveAlert(firstAlertId)).toThrow(
      'La alerta ya ha sido resuelta previamente.'
    );
  });
});
