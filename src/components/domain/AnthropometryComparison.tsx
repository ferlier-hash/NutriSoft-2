import { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { displayMeasurementDate } from '../../lib/anthropometry';

interface Revision { id: string; recorded_on: string; values: Record<string, number> }
export function AnthropometryComparison({ rows, metrics }: { rows: Revision[]; metrics: { key: string; label: string; unit: string }[] }) {
  const [selection, setSelection] = useState(['', '', '']);
  const chosen = selection.map(id => rows.find(row => row.id === id));
  const baseline = chosen[0];
  return <Card className="space-y-4">
    <h2 className="font-bold">Comparar mediciones</h2>
    <p className="text-sm text-text-secondary">Elegí hasta tres revisiones. La primera es la referencia para calcular las diferencias, independientemente del filtro del gráfico.</p>
    <div className="grid gap-3 sm:grid-cols-3">{selection.map((id, index) => <label key={index} className="form-label min-w-0">
      {index === 0 ? 'Medición 1 · referencia' : `Medición ${index + 1}`}
      <select className="form-control mt-1 w-full" value={rows.some(r => r.id === id) ? id : ''} onChange={e => setSelection(previous => previous.map((value, slot) => slot === index ? e.target.value : value))}>
        <option value="">Seleccionar fecha</option>
        {rows.map((row, position) => <option key={row.id} value={row.id} disabled={selection.some((other, slot) => slot !== index && other === row.id)}>{displayMeasurementDate(row.recorded_on)} · revisión {position + 1}</option>)}
      </select>
    </label>)}</div>
    {baseline && chosen.filter(Boolean).length >= 2 ? <div className="overflow-x-auto"><table className="w-full text-sm" aria-label="Comparación de mediciones">
      <thead><tr><th scope="col" className="p-2 text-left">Métrica</th>{chosen.map((row, index) => row && <th key={row.id} scope="col" className="p-2 whitespace-nowrap">{displayMeasurementDate(row.recorded_on)}<span className="block text-xs font-normal text-text-secondary">{index === 0 ? 'Referencia' : 'Valor · diferencia'}</span></th>)}</tr></thead>
      <tbody>{metrics.filter(metric => chosen.some(row => row?.values[metric.key] !== undefined)).map(metric => <tr key={metric.key} className="border-t border-border-subtle"><th scope="row" className="p-2 text-left font-medium">{metric.label} ({metric.unit})</th>{chosen.map((row, index) => {
        if (!row) return null;
        const value = row.values[metric.key]; const initial = baseline.values[metric.key];
        const delta = value !== undefined && initial !== undefined ? Number((value - initial).toFixed(2)) : null;
        return <td key={row.id} className="p-2 text-center whitespace-nowrap">{value ?? '—'}{index > 0 && <span className="block text-xs text-text-secondary">{delta === null ? 'Sin referencia' : `${delta > 0 ? '+' : ''}${delta} ${metric.unit}`}</span>}</td>;
      })}</tr>)}</tbody>
    </table></div> : <p className="text-sm text-text-secondary">{rows.length < 2 ? 'Necesitás al menos dos revisiones para comparar.' : 'Seleccioná la referencia y al menos otra medición.'}</p>}
    {selection.some(Boolean) && <Button variant="ghost" size="sm" onClick={() => setSelection(['', '', ''])}>Limpiar comparación</Button>}
  </Card>;
}
