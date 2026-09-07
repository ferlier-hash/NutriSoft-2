import { CheckCircle2, CircleUserRound, Eye, EyeOff, KeyRound, Save, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { useAuth } from '../../../auth/AuthProvider';
import { getSupabaseClient } from '../../../auth/supabase-client';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { PROFESSIONAL_SPECIALTIES, PROFESSIONAL_TIME_ZONES } from '../../../lib/professionalSpecialties';

const schema = z.object({
  fullName: z.string().trim().min(2).max(120), email: z.string().email(), phone: z.string().nullable(), accountUpdatedAt: z.string().nullable(),
  specialty: z.string().nullable(), registrationNumber: z.string().nullable(), registrationProvince: z.string().nullable(), registrationCountry: z.string().nullable(), timeZone: z.string().min(1), practiceUpdatedAt: z.string().nullable(),
});
type Profile = z.infer<typeof schema>;
const field = 'form-control';

export function RealProfessionalProfilePage() {
  const { accessContext, refreshAccess, updatePassword } = useAuth();
  const organization = useMemo(() => accessContext?.memberships.find((item) => item.role === 'nutritionist' && item.membership_status === 'active' && item.organization_status === 'active') ?? null, [accessContext]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const [password, setPassword] = useState(''); const [passwordRepeat, setPasswordRepeat] = useState(''); const [showPassword, setShowPassword] = useState(false); const [passwordBusy, setPasswordBusy] = useState(false); const [passwordMessage, setPasswordMessage] = useState('');
  const load = async () => {
    if (!organization) { setLoading(false); return; }
    setLoading(true); setError('');
    const { data, error: problem } = await getSupabaseClient().schema('api').rpc('get_my_professional_profile', { p_org: organization.organization_id });
    const parsed = schema.safeParse(data);
    if (problem || !parsed.success) setError('No pudimos cargar tu perfil. Reintentá antes de editar.'); else setProfile(parsed.data);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [organization?.organization_id]);
  const update = <K extends keyof Profile>(key: K, value: Profile[K]) => setProfile((current) => current ? { ...current, [key]: value } : current);
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!organization || !profile) return; setSaving(true); setError(''); setSuccess('');
    const { data, error: problem } = await getSupabaseClient().schema('api').rpc('save_my_professional_profile', {
      p_org: organization.organization_id,
      p_profile: { fullName: profile.fullName, phone: profile.phone ?? '', specialty: profile.specialty ?? '', registrationNumber: profile.registrationNumber ?? '', registrationProvince: profile.registrationProvince ?? '', registrationCountry: profile.registrationCountry ?? '', timeZone: profile.timeZone },
      p_expected_account: profile.accountUpdatedAt ?? undefined,
      p_expected_practice: profile.practiceUpdatedAt ?? undefined,
    });
    const versions = z.object({ accountUpdatedAt: z.string(), practiceUpdatedAt: z.string() }).safeParse(data);
    if (problem || !versions.success) setError(problem?.message || 'No pudimos guardar tu perfil.');
    else { setProfile({ ...profile, ...versions.data }); setSuccess('Perfil profesional guardado.'); await refreshAccess(); }
    setSaving(false);
  };
  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault(); setPasswordMessage('');
    if (password.length < 10) { setPasswordMessage('Usá al menos 10 caracteres.'); return; }
    if (password !== passwordRepeat) { setPasswordMessage('Las contraseñas no coinciden.'); return; }
    setPasswordBusy(true);
    try { await updatePassword(password); setPassword(''); setPasswordRepeat(''); setPasswordMessage('Contraseña actualizada.'); }
    catch (cause) { setPasswordMessage(cause instanceof Error ? cause.message : 'No pudimos actualizar la contraseña.'); }
    finally { setPasswordBusy(false); }
  };
  if (!organization) return <main className="mx-auto max-w-3xl p-4 sm:p-8"><Card><p>No encontramos un consultorio activo para tu perfil.</p></Card></main>;
  return <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-8"><div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong"><CircleUserRound className="h-6 w-6"/></span><div><h1 className="text-2xl font-bold text-text-primary">Mi perfil profesional</h1><p className="mt-1 text-sm text-text-secondary">Tu cuenta y tu práctica en {organization.organization_name}.</p></div></div>
    <Card highlighted className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-strong"/><p className="text-sm text-text-secondary"><b className="text-text-primary">Perfil contextual por consultorio.</b> La práctica se guarda para este consultorio. Tu nombre y teléfono pertenecen a tu cuenta; el correo se protege con un flujo de verificación.</p></Card>
    {loading ? <Card><p role="status">Cargando perfil…</p></Card> : profile && <form onSubmit={(event) => void save(event)} className="space-y-5"><Card className="space-y-4"><div><h2 className="font-bold">Cuenta</h2><p className="mt-1 text-sm text-text-secondary">Datos con los que te identificás dentro de NutriSoft.</p></div><div className="grid gap-3 sm:grid-cols-2"><label className="form-label sm:col-span-2">Nombre completo<input className={field} required maxLength={120} value={profile.fullName} onChange={(event) => update('fullName', event.target.value)}/></label><label className="form-label">Correo electrónico<input className={field} value={profile.email} disabled/><span className="mt-1 block text-xs text-text-secondary">El cambio de correo requiere verificación y estará disponible en un flujo específico.</span></label><label className="form-label">Teléfono<input className={field} type="tel" maxLength={30} value={profile.phone ?? ''} onChange={(event) => update('phone', event.target.value || null)}/></label></div></Card>
      <Card className="space-y-4"><div><h2 className="font-bold">Práctica profesional</h2><p className="mt-1 text-sm text-text-secondary">Información de este consultorio. La especialidad orienta la experiencia; no certifica credenciales.</p></div><div className="grid gap-3 sm:grid-cols-2"><label className="form-label">Especialidad<select className={field} value={profile.specialty ?? ''} onChange={(event) => update('specialty', event.target.value || null)}><option value="">Sin especialidad seleccionada</option>{PROFESSIONAL_SPECIALTIES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className="form-label">Zona horaria<select className={field} value={profile.timeZone} onChange={(event) => update('timeZone', event.target.value)}>{Array.from(new Set([profile.timeZone, ...PROFESSIONAL_TIME_ZONES])).map((item) => <option key={item} value={item}>{item.replaceAll('_',' ')}</option>)}</select></label></div></Card>
      <Card className="space-y-4"><div><h2 className="font-bold">Matrícula opcional</h2><p className="mt-1 text-sm text-text-secondary">Si completás un dato, completá los tres. NutriSoft los registra pero no verifica matrícula.</p></div><div className="grid gap-3 sm:grid-cols-3"><label className="form-label">Número<input className={field} maxLength={40} value={profile.registrationNumber ?? ''} onChange={(event) => update('registrationNumber', event.target.value || null)}/></label><label className="form-label">Provincia / estado<input className={field} maxLength={60} value={profile.registrationProvince ?? ''} onChange={(event) => update('registrationProvince', event.target.value || null)}/></label><label className="form-label">País<input className={field} maxLength={60} value={profile.registrationCountry ?? ''} onChange={(event) => update('registrationCountry', event.target.value || null)}/></label></div></Card>
      <div className="flex flex-wrap items-center justify-between gap-3"><span className="inline-flex items-center gap-1.5 text-xs text-text-secondary"><CheckCircle2 className="h-4 w-4 text-success"/>Los datos de práctica no alteran citas ya creadas.</span><Button type="submit" disabled={saving}>{saving ? 'Guardando…' : <><Save className="h-4 w-4"/>Guardar perfil</>}</Button></div></form>}
    {error && <p role="alert" className="rounded-xl border border-critical/20 bg-critical/10 p-3 text-sm text-critical">{error}</p>}{success && <p role="status" className="text-sm text-brand-strong">{success}</p>}
    <Card className="space-y-4"><div className="flex items-start gap-3"><KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-brand-strong"/><div><h2 className="font-bold">Contraseña</h2><p className="mt-1 text-sm text-text-secondary">Elegí una nueva contraseña de al menos 10 caracteres. No mostramos ni guardamos la contraseña actual.</p></div></div><form onSubmit={(event) => void changePassword(event)} className="grid gap-3 sm:grid-cols-2"><label className="form-label">Nueva contraseña<span className="relative mt-1 block"><input className={`${field} pr-12`} type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={10} value={password} onChange={(event) => setPassword(event.target.value)} required/><button type="button" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center text-text-secondary">{showPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button></span></label><label className="form-label">Repetí la contraseña<input className={field} type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={10} value={passwordRepeat} onChange={(event) => setPasswordRepeat(event.target.value)} required/></label><div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3"><p role={passwordMessage ? 'status' : undefined} className={`text-sm ${passwordMessage.includes('actualizada') ? 'text-brand-strong' : passwordMessage ? 'text-critical' : 'text-text-secondary'}`}>{passwordMessage || 'Usá una contraseña única para esta cuenta.'}</p><Button type="submit" variant="secondary" disabled={passwordBusy}>{passwordBusy ? 'Actualizando…' : 'Actualizar contraseña'}</Button></div></form></Card>
  </main>;
}
