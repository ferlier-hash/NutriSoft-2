import { describe, expect, it } from 'vitest';
import { buildAnthropometryReport } from '../lib/anthropometryReport';

describe('informe comparativo de antropometría', () => {
  it('calcula cambios neutrales, cobertura y días sin inventar valores ausentes', () => {
    const report = buildAnthropometryReport({
      patientName: 'Paciente Ejemplo',
      logoUrl: 'https://private.example/logo.png',
      revisions: [
        { id: 'a', recorded_on: '2026-08-01', values: { weight: 80, waist: 90 } },
        { id: 'b', recorded_on: '2026-08-11', values: { weight: 76 } },
      ],
      metrics: [
        { key: 'weight', label: 'Peso', unit: 'kg' },
        { key: 'waist', label: 'Cintura', unit: 'cm' },
      ],
    });
    expect(report.elapsedDays).toBe(10);
    expect(report.measuredMetricCount).toBe(2);
    expect(report.completeMetricCount).toBe(1);
    expect(report.rows[0]?.deltas[1]).toBe(-4);
    expect(report.rows[0]?.percentages[1]).toBe(-5);
    expect(report.rows[1]?.values[1]).toBeNull();
    expect(report.logoUrl).toBe('https://private.example/logo.png');
  });

  it('exige dos o tres revisiones', () => {
    expect(() => buildAnthropometryReport({ patientName: 'Paciente', revisions: [], metrics: [] })).toThrow(/dos y tres/);
  });
});
