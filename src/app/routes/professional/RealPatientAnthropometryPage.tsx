import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnthropometryComparison } from '../../../components/domain/AnthropometryComparison';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { anthropometryMetrics, displayMeasurementDate, localDate, measurementRange } from '../../../lib/anthropometry';
import { loadAnthropometryPatients, loadAnthropometryFields, loadAnthropometry, saveAnthropometry, deleteAnthropometry, type AnthropometryPatient, type AnthropometryField, type AnthropometryRevision } from '../../../data/supabase/anthropometry.repository';

export function RealPatientAnthropometryPage({embedded=false}:{embedded?:boolean}) {
  const { patientId = '' } = useParams();
  const [patient, setPatient] = useState<AnthropometryPatient | null>(null);
  const [fields, setFields] = useState<AnthropometryField[]>([]);
  const [rows, setRows] = useState<AnthropometryRevision[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [retry, setRetry] = useState(0);
  const [period, setPeriod] = useState('30'); const [from, setFrom] = useState(localDate()); const [to, setTo] = useState(localDate());
  const [metricKey, setMetricKey] = useState('weightKg');
  const [visible, setVisible] = useState<string[] | null>(null);
  const [editor, setEditor] = useState<{ id?: string; date: string; values: Record<string, string>; note: string } | null>(null);
  const [remove, setRemove] = useState<AnthropometryRevision | null>(null); const [busy, setBusy] = useState(false); const [formError, setFormError] = useState('');
  useEffect(() => {
    let active = true; setLoading(true); setPatient(null); setRows([]); setFields([]); setEditor(null); setRemove(null); setVisible(null); setError('');
    async function load() {
      try {
        const people = await loadAnthropometryPatients(); const person = people.find(p => p.id === patientId);
        if (!person) throw new Error('Ficha no disponible o sin acceso clínico vigente.');
        const [revisions, custom] = await Promise.all([loadAnthropometry(patientId), loadAnthropometryFields(person.organization_id)]);
        if (active) { setPatient(person); setRows(revisions); setFields(custom); }
      } catch (e) { if (active) setError(e instanceof Error ? e.message : 'No pudimos cargar la ficha.'); }
      finally { if (active) setLoading(false); }
    }
    void load(); return () => { active = false; };
  }, [patientId, retry]);
  const metrics = [...anthropometryMetrics, ...fields.map(f => ({ key: f.id, label: f.label, unit: f.unit }))];
  const metric = metrics.find(m => m.key === metricKey) ?? metrics[1]!;
  const range = measurementRange(period, from, to); const validRange = Boolean(range.from && range.to && range.from <= range.to);
  const chartRows = validRange ? rows.filter(r => r.recorded_on >= range.from && r.recorded_on <= range.to && r.values[metric.key] !== undefined) : [];
  const min = Math.min(...chartRows.map(r => r.values[metric.key]!)); const max = Math.max(...chartRows.map(r => r.values[metric.key]!));
  const tableMetrics = metrics.filter(m => visible === null || visible.includes(m.key));
  const editingFields = metrics.filter(m => !fields.some(f => f.id === m.key && f.status === 'archived') || editor?.values[m.key] !== undefined);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!editor) return; setFormError('');
    const values = Object.fromEntries(Object.entries(editor.values).filter(([,v]) => v.trim() !== '').map(([k,v]) => [k, Number(v)]));
    if (!Object.keys(values).length || Object.values(values).some(v => !Number.isFinite(v) || v <= 0 || v > 1000000) || !editor.date || editor.date > localDate()) { setFormError('Indicá una fecha no futura y al menos una medición positiva.'); return; }
    if (anthropometryMetrics.some(m => m.unit === '%' && (values[m.key] ?? 0) > 100)) { setFormError('Los porcentajes no pueden superar 100.'); return; }
    setBusy(true);
    try { await saveAnthropometry(patientId, editor.id, editor.date, values, editor.note); setEditor(null); setRows(await loadAnthropometry(patientId)); }
    catch (e) { setFormError(e instanceof Error ? e.message : 'No pudimos guardar.'); }
    finally { setBusy(false); }
  }
  async function confirmDelete() {
    if (!remove) return; setBusy(true); setFormError('');
    try { await deleteAnthropometry(remove.id); setRemove(null); setRows(await loadAnthropometry(patientId)); }
    catch (e) { setFormError(e instanceof Error ? e.message : 'No pudimos eliminar.'); }
    finally { setBusy(false); }
  }
  if (loading) return <section className="p-8" role="status">Cargando antropometría…</section>;
  if (!patient || error) return <section className="p-8 space-y-4"><p role="alert">{error || 'Ficha no disponible.'}</p><Button onClick={() => setRetry(n => n + 1)}>Reintentar</Button><Link className="block text-brand-strong" to="/professional/patients">Volver a Pacientes</Link></section>;
  const actions = (row: AnthropometryRevision) => <div className="flex flex-nowrap gap-2 items-center">{row.can_edit && <><Button size="sm" variant="secondary" onClick={() => { setFormError(''); setEditor({ id: row.id, date: row.recorded_on, values: Object.fromEntries(Object.entries(row.values).map(([k,v]) => [k,String(v)])), note: row.note ?? '' }); }}>Editar</Button><Button size="sm" variant="ghost" onClick={() => { setFormError(''); setRemove(row); }}>Eliminar</Button></>}</div>;
  return <section className={embedded?'space-y-5':'mx-auto max-w-7xl p-4 sm:p-8 space-y-5'}>
    {!embedded&&<>
    <Link className="text-sm text-brand-strong" to="/professional/patients">← Volver a Pacientes</Link>
    <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-strong ml-4" to={`/professional/patients/${patient.id}/followup`}>Ver seguimiento cotidiano →</Link>
    </>}
    <div className="flex flex-wrap justify-between gap-3 items-center"><div>{!embedded && <h1 className="text-2xl font-bold">{patient.first_name} {patient.last_name}</h1>}<h2 className={`text-lg font-semibold${embedded ? '' : ' mt-2'}`}>Antropometría</h2><p className="text-sm text-text-secondary">Revisiones profesionales independientes del peso cotidiano del paciente.</p></div><Button onClick={() => { setFormError(''); setEditor({ date: localDate(), values: {}, note: '' }); }}>Nueva medición</Button></div>
    <Card className="space-y-4"><div className="flex flex-wrap items-end gap-3"><label className="form-label flex-1 min-w-40">Métrica<select className="form-control mt-1" value={metric.key} onChange={e => setMetricKey(e.target.value)}>{metrics.map(m => <option key={m.key} value={m.key}>{m.label} ({m.unit})</option>)}</select></label><label className="form-label">Período<select className="form-control mt-1" value={period} onChange={e => setPeriod(e.target.value)}><option value="7">7 días</option><option value="15">15 días</option><option value="30">30 días</option><option value="previous">Mes pasado</option><option value="custom">Personalizado</option></select></label>{period === 'custom' && <><label className="form-label">Desde<input className="form-control mt-1" type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} /></label><label className="form-label">Hasta<input className="form-control mt-1" type="date" value={to} min={from} max={localDate()} onChange={e => setTo(e.target.value)} /></label></>}</div>
      {!validRange ? <p role="alert">Indicá un rango válido: Desde debe ser anterior o igual a Hasta.</p> : chartRows.length ? <div className="overflow-x-auto"><div className="flex gap-4 h-52 items-end pt-5" role="img" aria-label={`Evolución de ${metric.label}; ${chartRows.length} registros. Valores detallados en el historial.`}>{chartRows.map(r => <div key={r.id} className="min-w-20 flex-1 flex flex-col items-center justify-end h-full"><span className="text-xs font-semibold mb-2">{r.values[metric.key]} {metric.unit}</span><div className="bg-brand-primary rounded-t-lg w-10" style={{ height: max === min ? 90 : 36 + (r.values[metric.key]! - min) / (max - min) * 100 }} /><span className="text-[11px] mt-2 whitespace-nowrap">{displayMeasurementDate(r.recorded_on)}</span></div>)}</div></div> : <p className="p-6 text-center text-text-secondary">No hay valores de esta métrica en el período elegido.</p>}
      <p className="text-xs text-text-secondary">Valores registrados, sin juicios ni proyecciones. La escala se ajusta al período.</p>
    </Card>
    <AnthropometryComparison key={patientId} rows={rows} metrics={metrics} />
    <Card className="space-y-4"><div className="flex flex-wrap justify-between gap-3"><h2 className="font-bold">Historial · {rows.length} revisiones</h2><Link className="text-sm text-brand-strong underline" to="/professional/settings">Configurar campos personalizados</Link></div>
      <details><summary className="cursor-pointer text-sm py-2">Elegir columnas visibles</summary><div className="flex flex-wrap gap-3">{metrics.map(m => <label key={m.key} className="inline-flex items-center gap-2 text-sm min-h-11"><input type="checkbox" checked={visible === null || visible.includes(m.key)} onChange={e => setVisible(keys => e.target.checked ? [...(keys ?? metrics.map(i => i.key)), m.key] : (keys ?? metrics.map(i => i.key)).filter(k => k !== m.key))} />{m.label}</label>)}</div></details>
      {!rows.length ? <p className="text-text-secondary">Todavía no hay mediciones. Podés registrar sólo los valores disponibles en la consulta.</p> : <><div className="hidden md:block overflow-x-auto"><table className="w-full text-sm"><thead><tr><th scope="col" className="p-3 text-left">Fecha</th>{tableMetrics.map(m => <th key={m.key} scope="col" className="p-3 text-left min-w-28">{m.label} ({m.unit})</th>)}<th scope="col" className="p-3 text-left">Acciones</th></tr></thead><tbody>{[...rows].reverse().map(r => <tr key={r.id} className="border-t border-border-subtle"><td className="px-3 py-1.5 whitespace-nowrap"><div className="flex items-center gap-2">{displayMeasurementDate(r.recorded_on)}<MeasurementNote note={r.note} /></div></td>{tableMetrics.map(m => <td key={m.key} className="px-3 py-1.5">{r.values[m.key] ?? '—'}</td>)}<td className="px-3 py-1.5 min-w-48">{actions(r)}</td></tr>)}</tbody></table></div><div className="md:hidden space-y-3">{[...rows].reverse().map(r => <div key={r.id} className="rounded-xl border border-border-subtle p-4 space-y-3"><h3 className="font-semibold">{displayMeasurementDate(r.recorded_on)}</h3><dl className="grid grid-cols-2 gap-3 text-sm">{tableMetrics.filter(m => r.values[m.key] !== undefined).map(m => <div key={m.key}><dt className="text-text-secondary">{m.label}</dt><dd className="font-semibold">{r.values[m.key]} {m.unit}</dd></div>)}</dl><MeasurementNote note={r.note} />{actions(r)}</div>)}</div></>}
    </Card>
    <Dialog isOpen={Boolean(editor)} onClose={() => { if (!busy) setEditor(null); }} title={editor?.id ? 'Editar medición' : 'Nueva medición'} description="Todos los valores son opcionales; completá al menos uno.">{editor && <form onSubmit={e => void submit(e)} className="space-y-4"><label className="form-label">Fecha<input className="form-control mt-1" type="date" required max={localDate()} value={editor.date} onChange={e => setEditor({ ...editor, date: e.target.value })} /></label><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{editingFields.map(m => <label key={m.key} className="form-label">{m.label} ({m.unit})<input className="form-control mt-1" type="number" min="0.01" max={anthropometryMetrics.some(base => base.key === m.key && base.unit === '%') ? 100 : 1000000} step="any" value={editor.values[m.key] ?? ''} onChange={e => setEditor({ ...editor, values: { ...editor.values, [m.key]: e.target.value } })} /></label>)}</div><label className="form-label">Nota de la revisión<textarea className="form-control mt-1" maxLength={500} value={editor.note} onChange={e => setEditor({ ...editor, note: e.target.value })} /></label>{formError && <p role="alert" className="text-sm text-semantic-critical">{formError}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="secondary" disabled={busy} onClick={() => setEditor(null)}>Cancelar</Button><Button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar medición'}</Button></div></form>}</Dialog>
    <Dialog isOpen={Boolean(remove)} onClose={() => { if (!busy) setRemove(null); }} title="Eliminar medición" description={`Se eliminará la revisión del ${remove ? displayMeasurementDate(remove.recorded_on) : ''}. Esta acción no se puede deshacer.`}>{formError && <p role="alert">{formError}</p>}<div className="flex justify-end gap-2"><Button variant="secondary" disabled={busy} onClick={() => setRemove(null)}>Conservar</Button><Button variant="destructive" disabled={busy} onClick={() => void confirmDelete()}>Eliminar medición</Button></div></Dialog>
  </section>;
}
import { MeasurementNote } from '../../../components/domain/MeasurementNote';
