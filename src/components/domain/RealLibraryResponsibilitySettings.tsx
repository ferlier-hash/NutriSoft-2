import { useEffect, useState } from 'react';
import { CheckCircle2, Library, ShieldCheck } from 'lucide-react';
import { loadLibrarySettings, setLibraryResponsibility, type LibrarySettings } from '../../data/supabase/library.repository';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useToast } from '../ui/Toast';

export function RealLibraryResponsibilitySettings({ organizationId }: { organizationId: string }) {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<LibrarySettings | null>(null);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { let active=true; void loadLibrarySettings(organizationId).then(value => { if(active){ setSettings(value); setChecked(value.accepted); } }).catch(cause => active && setError(cause instanceof Error ? cause.message : 'No pudimos cargar esta configuración.')); return () => { active=false; }; }, [organizationId]);
  const save = async () => {
    if (!settings) return;
    setSaving(true); setError('');
    try { await setLibraryResponsibility(organizationId,checked,settings.policy_version); const next=await loadLibrarySettings(organizationId); setSettings(next); setChecked(next.accepted); showToast(next.accepted ? 'Biblioteca habilitada' : 'Nuevas cargas deshabilitadas', next.accepted ? 'Ya podés agregar PDFs y enlaces.' : 'Tus recursos existentes se conservaron.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos guardar esta decisión.'); }
    finally { setSaving(false); }
  };
  if (!settings && !error) return <p role="status" className="text-sm text-text-secondary">Cargando configuración de Biblioteca…</p>;
  return <Card highlighted className="space-y-4">
    <div className="flex items-start justify-between gap-3"><div className="flex gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-brand-strong"><Library className="h-5 w-5"/></span><div><h3 className="font-bold">Responsabilidad sobre recursos</h3><p className="mt-1 text-sm text-text-secondary">Esta aceptación es obligatoria para agregar o reemplazar contenidos.</p></div></div>{settings && <Badge variant={settings.accepted ? 'active' : 'neutral'}>{settings.accepted ? 'Habilitada' : 'Pendiente'}</Badge>}</div>
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border-subtle bg-surface p-4 text-sm leading-relaxed text-text-secondary"><input className="mt-1 h-4 w-4 accent-brand-strong" type="checkbox" checked={checked} onChange={event => setChecked(event.target.checked)}/><span><b className="text-text-primary">Declaro que soy responsable de cada recurso que agregue.</b><br/>Confirmo que cuento con los derechos, licencias y autorizaciones necesarios para subir y compartir cada material; que no incluiré datos personales o clínicos sin autorización; y que asumo la responsabilidad por el contenido y su uso. Entiendo que NutriSoft no verifica su titularidad ni sus licencias.</span></label>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="flex items-start gap-2 text-xs text-text-secondary"><ShieldCheck className="h-4 w-4 shrink-0 text-brand-strong"/>{settings?.accepted_at ? <>Aceptado el {new Intl.DateTimeFormat('es-AR',{dateStyle:'medium'}).format(new Date(settings.accepted_at))}. Podés revocarlo sin borrar recursos existentes.</> : 'Sin esta aceptación no se podrán agregar PDFs ni enlaces.'}</p><Button disabled={!settings || saving || checked===settings.accepted} onClick={() => void save()}>{saving ? 'Guardando…' : checked ? <><CheckCircle2 className="h-4 w-4"/>Guardar y habilitar</> : 'Revocar aceptación'}</Button></div>
    {error && <p role="alert" className="text-sm text-critical">{error}</p>}
  </Card>;
}
