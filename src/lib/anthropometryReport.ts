export interface AnthropometryReportMetric {
  key: string;
  label: string;
  unit: string;
}

export interface AnthropometryReportRevision {
  id: string;
  recorded_on: string;
  values: Record<string, number>;
  note?: string | null;
}

export interface AnthropometryReportInput {
  patientName: string;
  professionalName?: string;
  organizationName?: string;
  logoUrl?: string;
  revisions: AnthropometryReportRevision[];
  metrics: AnthropometryReportMetric[];
  includeNotes?: boolean;
}

export interface AnthropometryReportRow extends AnthropometryReportMetric {
  values: Array<number | null>;
  deltas: Array<number | null>;
  percentages: Array<number | null>;
}

export interface AnthropometryReport extends Omit<AnthropometryReportInput, 'metrics'> {
  rows: AnthropometryReportRow[];
  measuredMetricCount: number;
  completeMetricCount: number;
  elapsedDays: number;
}

const rounded = (value: number) => Number(value.toFixed(2));

export function buildAnthropometryReport(input: AnthropometryReportInput): AnthropometryReport {
  if (input.revisions.length < 2 || input.revisions.length > 3) {
    throw new Error('El informe requiere entre dos y tres revisiones.');
  }
  const baseline = input.revisions[0]!;
  const rows = input.metrics
    .filter(metric => input.revisions.some(revision => revision.values[metric.key] !== undefined))
    .map(metric => {
      const values = input.revisions.map(revision => revision.values[metric.key] ?? null);
      const initial = baseline.values[metric.key];
      return {
        ...metric,
        values,
        deltas: values.map((value, index) => index === 0 || value === null || initial === undefined ? null : rounded(value - initial)),
        percentages: values.map((value, index) => index === 0 || value === null || initial === undefined || initial === 0 ? null : rounded(((value - initial) / Math.abs(initial)) * 100)),
      };
    });
  const first = new Date(`${baseline.recorded_on}T00:00:00`);
  const last = new Date(`${input.revisions[input.revisions.length - 1]!.recorded_on}T00:00:00`);
  return {
    ...input,
    rows,
    measuredMetricCount: rows.length,
    completeMetricCount: rows.filter(row => row.values.every(value => value !== null)).length,
    elapsedDays: Math.abs(Math.round((last.getTime() - first.getTime()) / 86_400_000)),
  };
}

export function formatReportNumber(value: number | null) {
  if (value === null) return '—';
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(value);
}

export function signedReportNumber(value: number | null, suffix = '') {
  if (value === null) return 'Sin referencia';
  return `${value > 0 ? '+' : ''}${formatReportNumber(value)}${suffix}`;
}
