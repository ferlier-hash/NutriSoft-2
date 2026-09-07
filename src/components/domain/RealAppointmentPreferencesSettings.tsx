import { CreditCard, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { getSupabaseClient } from '../../auth/supabase-client';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

const schema = z.object({
  currency: z.enum(['ARS','CLP','BRL','USD','MXN','COP','PEN','EUR','UYU']),
  durationMinutes: z.number().int().refine((value) => [15,30,45,60,75,90].includes(value)),
  virtualPrice: z.number().min(0),
  inPersonPrice: z.number().min(0),
  updatedAt: z.string().nullable(),
});
type Preferences = z.infer<typeof schema>;
const fallback: Preferences = { currency: 'ARS', durationMinutes: 45, virtualPrice: 0, inPersonPrice: 0, updatedAt: null };
const currencies = [
  ['ARS','Peso argentino'], ['CLP','Peso chileno'], ['BRL','Real brasileño'], ['USD','Dólar estadounidense'], ['MXN','Peso mexicano'], ['COP','Peso colombiano'], ['PEN','Sol peruano'], ['EUR','Euro'], ['UYU','Peso uruguayo'],
] as const;

export function RealAppointmentPreferencesSettings({ organizationId }: { organizationId: string }) {
  const [preferences, setPreferences] = useState<Preferences>(fallback);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const load = async () => {
    setLoading(true); setError('');
    const { data, error: problem } = await getSupabaseClient().schema('api').rpc('get_my_appointment_preferences', { p_org: organizationId });
    const parsed = schema.safeParse(data);
    if (problem || !parsed.success) setError('No pudimos cargar tus preferencias. Reintentá antes de editar.');
    else setPreferences(parsed.data);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [organizationId]);
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError(''); setSuccess('');
    const { data, error: problem } = await getSupabaseClient().schema('api').rpc('save_my_appointment_preferences', {
      p_org: organizationId,
      p_settings: { currency: preferences.currency, durationMinutes: preferences.durationMinutes, virtualPrice: preferences.virtualPrice, inPersonPrice: preferences.inPersonPrice },
      p_expected: preferences.updatedAt ?? undefined,
    });
    if (problem || typeof data !== 'string') setError(problem?.message || 'No pudimos guardar las preferencias.');
    else { setPreferences((current) => ({ ...current, updatedAt: data })); setSuccess('Preferencias guardadas. Se usarán al crear nuevas citas.'); }
    setSaving(false);
  };
  return <Card className="space-y-4"><div className="flex items-start gap-3"><CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-brand-strong"/><div><h2 className="font-bold">Preferencias de citas e ingresos</h2><p className="mt-1 text-sm text-text-secondary">Valores sugeridos al crear una cita. Podés modificarlos antes de guardar cada turno; el historial conserva sus propios importes y moneda.</p></div></div>
    {loading ? <p role="status" className="text-sm text-text-secondary">Cargando preferencias…</p> : <form className="space-y-4" onSubmit={(event) => void save(event)}><fieldset disabled={saving} className="grid gap-3 sm:grid-cols-2"><label className="form-label">Moneda predeterminada<select className="form-control" value={preferences.currency} onChange={(event) => setPreferences({ ...preferences, currency: event.target.value as Preferences['currency'] })}>{currencies.map(([value,label]) => <option key={value} value={value}>{value} · {label}</option>)}</select></label><label className="form-label">Duración sugerida<select className="form-control" value={preferences.durationMinutes} onChange={(event) => setPreferences({ ...preferences, durationMinutes: Number(event.target.value) })}>{[15,30,45,60,75,90].map((value) => <option key={value} value={value}>{value} min</option>)}</select></label><label className="form-label">Precio sugerido · virtual<input className="form-control" type="number" min="0" max="9999999999.99" step="0.01" value={preferences.virtualPrice} onChange={(event) => setPreferences({ ...preferences, virtualPrice: Number(event.target.value) })}/></label><label className="form-label">Precio sugerido · presencial<input className="form-control" type="number" min="0" max="9999999999.99" step="0.01" value={preferences.inPersonPrice} onChange={(event) => setPreferences({ ...preferences, inPersonPrice: Number(event.target.value) })}/></label></fieldset><Button type="submit" disabled={saving}>{saving ? 'Guardando…' : <><Save className="h-4 w-4"/>Guardar preferencias</>}</Button></form>}
    {error && <p role="alert" className="text-sm text-critical">{error}</p>}{success && <p role="status" className="text-sm text-brand-strong">{success}</p>}
  </Card>;
}
