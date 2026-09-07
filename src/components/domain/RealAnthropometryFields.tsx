import { useEffect, useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { loadAnthropometryFields, saveAnthropometryField, type AnthropometryField } from '../../data/supabase/anthropometry.repository';

export function RealAnthropometryFields({ organizationId }: { organizationId: string }) {
  const [fields, setFields] = useState<AnthropometryField[]>([]);
  const [label, setLabel] = useState(''); const [unit, setUnit] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(true);
  useEffect(() => { let active = true; setBusy(true); loadAnthropometryFields(organizationId).then(data => { if (active) { setFields(data); setError(''); } }).catch(() => { if (active) setError('No pudimos cargar los campos.'); }).finally(() => { if (active) setBusy(false); }); return () => { active = false; }; }, [organizationId]);
  async function update(field: Parameters<typeof saveAnthropometryField>[1]) {
    setBusy(true); setError('');
    try { await saveAnthropometryField(organizationId, field); setFields(await loadAnthropometryFields(organizationId)); if (!field.id) { setLabel(''); setUnit(''); } }
    catch (e) { setError(e instanceof Error ? e.message : 'No pudimos guardar.'); }
    finally { setBusy(false); }
  }
  return <Card className="space-y-4"><h2 className="font-bold">Campos de antropometría</h2><p className="text-sm text-text-secondary">Campos adicionales para tus revisiones. Archivar conserva los valores históricos. El nombre y la unidad se conservan para mantener su significado.</p>
    <div className="grid sm:grid-cols-[1fr_6rem_auto] gap-3"><label className="form-label">Nombre<input className="form-control mt-1" maxLength={80} value={label} onChange={e => setLabel(e.target.value)} /></label><label className="form-label">Unidad<input className="form-control mt-1" maxLength={20} value={unit} onChange={e => setUnit(e.target.value)} /></label><Button disabled={busy || !label.trim() || !unit.trim()} onClick={() => void update({ label: label.trim(), unit: unit.trim(), position: Math.max(-1, ...fields.map(f => f.position)) + 1, status: 'active' })}>Agregar campo</Button></div>
    {error && <p role="alert" className="text-sm text-semantic-critical">{error}</p>}
    {busy && <p role="status" className="text-sm">Actualizando campos…</p>}
    {!busy && !fields.length && <p className="text-sm text-text-secondary">Aún no agregaste campos personalizados.</p>}
    {fields.map((field, index) => <div key={field.id} className="flex flex-wrap gap-2 items-center border-t border-border-subtle pt-3"><p className="flex-1 text-sm">{field.label} ({field.unit}) · {field.status === 'active' ? 'Activo' : 'Archivado'}</p><Button size="sm" variant="ghost" disabled={busy || index === 0} aria-label={`Subir ${field.label}`} onClick={() => void update({ ...field, position: fields[index - 1]!.position })}>↑</Button><Button size="sm" variant="ghost" disabled={busy || index === fields.length - 1} aria-label={`Bajar ${field.label}`} onClick={() => void update({ ...field, position: fields[index + 1]!.position })}>↓</Button><Button size="sm" variant="secondary" disabled={busy} onClick={() => void update({ ...field, status: field.status === 'active' ? 'archived' : 'active' })}>{field.status === 'active' ? 'Archivar' : 'Reactivar'}</Button></div>)}
  </Card>;
}
