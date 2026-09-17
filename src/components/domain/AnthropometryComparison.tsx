import { useState } from 'react';
import { CalendarRange, CheckCircle2, FileDown, Gauge } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { displayMeasurementDate } from '../../lib/anthropometry';
import {
  buildAnthropometryReport,
  formatReportNumber,
  signedReportNumber,
  type AnthropometryReportMetric,
  type AnthropometryReportRevision,
} from '../../lib/anthropometryReport';

interface Props {
  rows: AnthropometryReportRevision[];
  metrics: AnthropometryReportMetric[];
  patientName?: string;
  professionalName?: string;
  organizationName?: string;
  logoUrl?: string;
}

export function AnthropometryComparison({ rows, metrics, patientName = 'Paciente', professionalName, organizationName, logoUrl }: Props) {
  const [selection, setSelection] = useState(['', '', '']);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const chosen = selection
    .map(id => rows.find(row => row.id === id))
    .filter((row): row is AnthropometryReportRevision => Boolean(row));
  const report = selection[0] && chosen.length >= 2
    ? buildAnthropometryReport({ patientName, professionalName, organizationName, logoUrl, revisions: chosen, metrics, includeNotes })
    : null;

  async function exportPdf() {
    if (!report) return;
    setExporting(true);
    setExportError('');
    try {
      const { downloadAnthropometryComparisonPdf } = await import('../../lib/anthropometryPdf');
      await downloadAnthropometryComparisonPdf(report);
    } catch {
      setExportError('No pudimos generar el PDF. Reintentá.');
    } finally {
      setExporting(false);
    }
  }

  return <Card className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="font-bold">Informe comparativo</h2>
        <p className="mt-1 text-sm text-text-secondary">Elegí dos o tres revisiones. La primera será la referencia del análisis descriptivo.</p>
      </div>
      <Button disabled={!report || exporting} onClick={() => void exportPdf()} className="w-full gap-2 sm:w-auto">
        <FileDown className="h-4 w-4" aria-hidden="true"/>{exporting ? 'Generando…' : 'Descargar PDF'}
      </Button>
    </div>
    <div className="grid gap-3 sm:grid-cols-3">{selection.map((id, index) => <label key={index} className="form-label min-w-0">
      {index === 0 ? 'Referencia' : `Comparación ${index}`}
      <select className="form-control mt-1 w-full" value={rows.some(row => row.id === id) ? id : ''} onChange={event => setSelection(previous => previous.map((value, slot) => slot === index ? event.target.value : value))}>
        <option value="">Seleccionar fecha</option>
        {rows.map((row, position) => <option key={row.id} value={row.id} disabled={selection.some((other, slot) => slot !== index && other === row.id)}>{displayMeasurementDate(row.recorded_on)} · revisión {position + 1}</option>)}
      </select>
    </label>)}</div>
    {report ? <>
      <div className="grid grid-cols-3 gap-2" aria-label="Resumen del informe">
        <Summary icon={CalendarRange} value={`${report.elapsedDays}`} label="días entre fechas"/>
        <Summary icon={Gauge} value={`${report.measuredMetricCount}`} label="métricas medidas"/>
        <Summary icon={CheckCircle2} value={`${report.completeMetricCount}`} label="comparables completas"/>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label="Comparación de mediciones">
          <thead><tr><th scope="col" className="p-2 text-left">Métrica</th>{report.revisions.map((row, index) => <th key={row.id} scope="col" className="p-2 whitespace-nowrap">{displayMeasurementDate(row.recorded_on)}<span className="block text-xs font-normal text-text-secondary">{index === 0 ? 'Referencia' : 'Valor · cambio'}</span></th>)}</tr></thead>
          <tbody>{report.rows.map(metric => <tr key={metric.key} className="border-t border-border-subtle">
            <th scope="row" className="p-2 text-left font-medium">{metric.label} ({metric.unit})</th>
            {report.revisions.map((revision, index) => <td key={revision.id} className="p-2 text-center whitespace-nowrap">
              {formatReportNumber(metric.values[index] ?? null)}
              {index > 0 && <span className="block text-xs text-text-secondary">{metric.deltas[index] === null ? 'Sin referencia' : `${signedReportNumber(metric.deltas[index]!, ` ${metric.unit}`)} · ${signedReportNumber(metric.percentages[index] ?? null, '%')}`}</span>}
            </td>)}
          </tr>)}</tbody>
        </table>
      </div>
      {report.revisions.some(revision => revision.note?.trim()) && <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={includeNotes} onChange={event => setIncludeNotes(event.target.checked)}/>Incluir notas clínicas en el PDF</label>}
      <p className="rounded-xl bg-surface-subtle p-3 text-xs text-text-secondary">Las diferencias y porcentajes son cálculos descriptivos. El informe no clasifica cambios como favorables o desfavorables ni reemplaza el criterio profesional.</p>
    </> : <p className="rounded-xl border border-dashed border-border-subtle p-5 text-center text-sm text-text-secondary">{rows.length < 2 ? 'Necesitás al menos dos revisiones para crear un informe.' : 'Seleccioná una referencia y al menos una fecha para ver la comparación.'}</p>}
    {exportError && <p role="alert" className="text-sm text-semantic-critical">{exportError}</p>}
    {selection.some(Boolean) && <Button variant="ghost" size="sm" onClick={() => { setSelection(['', '', '']); setIncludeNotes(false); setExportError(''); }}>Limpiar comparación</Button>}
  </Card>;
}

function Summary({ icon: Icon, value, label }: { icon: typeof CalendarRange; value: string; label: string }) {
  return <div className="min-w-0 rounded-xl bg-surface-subtle p-2.5 sm:p-3">
    <Icon className="mb-1 h-4 w-4 text-brand-strong" aria-hidden="true"/>
    <p className="text-lg font-bold text-text-primary">{value}</p>
    <p className="text-[10px] leading-tight text-text-secondary sm:text-xs">{label}</p>
  </div>;
}
