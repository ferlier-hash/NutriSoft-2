import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MockProvider, useMock } from '../app/provider';

describe('Invariantes del Estado Mock (Fase 1.1.1)', () => {
  it('createCheckInAssignment rechaza paciente inexistente o asignación pendiente duplicada', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <MockProvider>{children}</MockProvider>;
    const { result } = renderHook(() => useMock(), { wrapper });

    // Paciente inexistente
    expect(() => result.current.createCheckInAssignment('non-existent-pat')).toThrow('El paciente indicado no existe.');

    // Asignación duplicada para pat-1 (que ya tiene assign-1 pendiente)
    expect(() => result.current.createCheckInAssignment('pat-1')).toThrow('El paciente ya tiene una asignación de check-in pendiente.');
  });

  it('submitCheckInResponse rechaza asignación expirada, duplicada, perteneciente a otro paciente o scores inválidos', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <MockProvider>{children}</MockProvider>;
    const { result } = renderHook(() => useMock(), { wrapper });

    // Scores fuera de rango
    expect(() =>
      result.current.submitCheckInResponse('assign-1', 'pat-1', 6, 3, false)
    ).toThrow('Las puntuaciones deben estar dentro del rango 1 a 5.');

    // Asignación perteneciente a otro paciente (pat-2 intentando responder assign-1 de pat-1)
    expect(() =>
      result.current.submitCheckInResponse('assign-1', 'pat-2', 4, 4, false)
    ).toThrow('Esta asignación no pertenece al paciente indicado.');

    // Respuesta válida para assign-1
    act(() => {
      result.current.submitCheckInResponse('assign-1', 'pat-1', 4, 4, false);
    });

    // Respuesta duplicada
    expect(() =>
      result.current.submitCheckInResponse('assign-1', 'pat-1', 4, 4, false)
    ).toThrow('Este check-in ya ha sido completado previamente.');
  });

  it('addRecommendation rechaza texto vacío o paciente inexistente y deriva organización', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <MockProvider>{children}</MockProvider>;
    const { result } = renderHook(() => useMock(), { wrapper });

    // Texto compuesto solo por espacios
    expect(() => result.current.addRecommendation('pat-1', '   ')).toThrow(
      'La recomendación no puede estar vacía o compuesta solo por espacios.'
    );

    // Adición válida
    let newRec: ReturnType<typeof result.current.addRecommendation> | undefined;
    act(() => {
      newRec = result.current.addRecommendation('pat-1', 'Mantener agua al despertar');
    });

    expect(newRec).toBeDefined();
    expect(newRec?.organizationId).toBe('org-1');
  });
});
