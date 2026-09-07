import { CalendarDays, CheckCircle2, ChevronDown, ClipboardList, CreditCard, ExternalLink, HeartPulse, Palette, ShieldCheck, Clock3 } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '../../../auth/AuthProvider';
import { getSupabaseClient } from '../../../auth/supabase-client';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { publicEnvironment } from '../../../config/environment';
import { RealAnthropometryFields } from '../../../components/domain/RealAnthropometryFields';
import { CheckinSettings } from '../shared/RealDailyFollowupPage';
import { RealBrandingSettings } from '../../../components/domain/RealBranding';
import { RealScheduleSettings } from '../../../components/domain/RealScheduleSettings';
import { RealAppointmentPreferencesSettings } from '../../../components/domain/RealAppointmentPreferencesSettings';

type ConnectionStatus = 'loading' | 'not_connected' | 'connected' | 'error';
type CalendarOption = { id: string; summary: string; primary?: boolean };

function SettingsSection({ id, icon, title, description, status, open = false, children }: { id: string; icon: ReactNode; title: string; description: string; status?: string; open?: boolean; children: ReactNode }) {
  return <details id={id} className="group rounded-2xl border border-border-subtle bg-surface" open={open}>
    <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-strong sm:px-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong">{icon}</span>
      <span className="min-w-0 flex-1"><span className="block font-bold text-text-primary">{title}</span><span className="mt-0.5 block text-xs text-text-secondary">{description}</span></span>
      {status && <Badge variant="neutral" className="hidden sm:inline-flex">{status}</Badge>}
      <ChevronDown className="h-5 w-5 shrink-0 text-text-secondary transition-transform group-open:rotate-180" />
    </summary>
    <div className="border-t border-border-subtle p-3 sm:p-4">{children}</div>
  </details>;
}

export function RealGoogleCalendarSettingsPage() {
  const { accessContext } = useAuth();
  const [opening, setOpening] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('loading');
  const [calendarSelected, setCalendarSelected] = useState(false);
  const [calendarLabel, setCalendarLabel] = useState<string | null>(null);
  const [calendars, setCalendars] = useState<CalendarOption[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState('');
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [savingCalendar, setSavingCalendar] = useState(false);
  const organization = useMemo(
    () => accessContext?.memberships.find(
      (item) => item.role === 'nutritionist' && item.membership_status === 'active' && item.organization_status === 'active',
    ) ?? null,
    [accessContext],
  );

  useEffect(() => {
    let active = true;
    const loadConnectionStatus = async () => {
      if (!organization) {
        if (active) setConnectionStatus('not_connected');
        return;
      }
      const { data, error } = await getSupabaseClient()
        .schema('api')
        .rpc('get_google_calendar_connection_status', { p_organization_id: organization.organization_id });
      if (!active) return;
      if (error) {
        setConnectionStatus('error');
        setConnectionError('No pudimos consultar el estado de Google Calendar. Podés reintentar la conexión.');
        return;
      }
      const status = data?.[0];
      setConnectionStatus(status?.status === 'connected' ? 'connected' : 'not_connected');
      setCalendarSelected(Boolean(status?.calendar_selected));
      setCalendarLabel(status?.calendar_label ?? null);
    };
    void loadConnectionStatus();
    return () => { active = false; };
  }, [organization]);

  useEffect(() => {
    let active = true;
    const loadCalendars = async () => {
      if (!organization || connectionStatus !== 'connected' || calendarSelected || !publicEnvironment.supabaseUrl) return;
      setLoadingCalendars(true);
      try {
        const { data: { session } } = await getSupabaseClient().auth.getSession();
        if (!session) throw new Error('Sesión vencida');
        const endpoint = new URL('/functions/v1/google-calendar-calendars', publicEnvironment.supabaseUrl);
        endpoint.searchParams.set('organization_id', organization.organization_id);
        const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${session.access_token}` } });
        const payload = await response.json() as { calendars?: CalendarOption[]; message?: string };
        if (!response.ok) throw new Error(payload.message || 'No pudimos obtener tus calendarios.');
        if (!active) return;
        const availableCalendars = payload.calendars ?? [];
        setCalendars(availableCalendars);
        setSelectedCalendarId(availableCalendars.find((calendar) => calendar.primary)?.id ?? availableCalendars[0]?.id ?? '');
      } catch (error) {
        if (active) setConnectionError(error instanceof Error ? error.message : 'No pudimos obtener tus calendarios.');
      } finally {
        if (active) setLoadingCalendars(false);
      }
    };
    void loadCalendars();
    return () => { active = false; };
  }, [calendarSelected, connectionStatus, organization]);

  const connect = async () => {
    if (!organization || !publicEnvironment.supabaseUrl) return;
    setOpening(true);
    setConnectionError(null);
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session) throw new Error('Sesión vencida');
      const endpoint = new URL('/functions/v1/google-calendar-oauth', publicEnvironment.supabaseUrl);
      endpoint.searchParams.set('organization_id', organization.organization_id);
      const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${session.access_token}`, Accept: 'application/json' } });
      const raw = await response.text();
      let payload: { authorization_url?: string; message?: string } = {};
      try { payload = raw ? JSON.parse(raw) : {}; } catch { /* La función puede devolver texto seguro. */ }
      if (!response.ok || !payload.authorization_url) throw new Error(payload.message || raw || `No pudimos iniciar la autorización (${response.status}).`);
      window.location.assign(payload.authorization_url);
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'No pudimos iniciar la autorización.');
      setOpening(false);
    }
  };

  const saveCalendarSelection = async () => {
    if (!organization || !publicEnvironment.supabaseUrl || !selectedCalendarId) return;
    setSavingCalendar(true);
    setConnectionError(null);
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session) throw new Error('Sesión vencida');
      const endpoint = new URL('/functions/v1/google-calendar-calendars', publicEnvironment.supabaseUrl);
      endpoint.searchParams.set('organization_id', organization.organization_id);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendar_id: selectedCalendarId }),
      });
      const payload = await response.json() as { message?: string };
      if (!response.ok) throw new Error(payload.message || 'No pudimos guardar el calendario elegido.');
      setCalendarSelected(true);
      setCalendarLabel(calendars.find((calendar) => calendar.id === selectedCalendarId)?.summary ?? null);
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'No pudimos guardar el calendario elegido.');
    } finally {
      setSavingCalendar(false);
    }
  };

  const connected = connectionStatus === 'connected';
  const openSettingsSection = (id: string) => {
    window.requestAnimationFrame(() => {
      const section = document.getElementById(id);
      if (!section) return;
      section.setAttribute('open', '');
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Configuración</h1>
        <p className="mt-1 text-sm text-text-secondary">Administrá tus horarios, reglas de citas, conexión con Google y preferencias del consultorio.</p>
      </div>
      <Card highlighted className="space-y-4">
        <div>
          <h2 className="font-bold text-text-primary">Lo esencial, a mano</h2>
          <p className="mt-1 text-sm text-text-secondary">Abrí sólo el tema que necesitás. Tus cambios se guardan por separado.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <button type="button" onClick={() => openSettingsSection('settings-schedule')} className="min-h-16 rounded-xl bg-surface/80 p-3 text-left text-sm transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong"><b className="block text-text-primary">Agenda</b><span className="text-text-secondary">Horarios y reglas</span></button>
          <button type="button" onClick={() => openSettingsSection('settings-google')} className="min-h-16 rounded-xl bg-surface/80 p-3 text-left text-sm transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong"><b className="block text-text-primary">Google Calendar</b><span className="text-text-secondary">{connected ? (calendarSelected ? 'Calendario elegido' : 'Elegí un calendario') : 'Pendiente de conexión'}</span></button>
          <button type="button" onClick={() => openSettingsSection('settings-preferences')} className="min-h-16 rounded-xl bg-surface/80 p-3 text-left text-sm transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong"><b className="block text-text-primary">Citas e ingresos</b><span className="text-text-secondary">Moneda, duración y precios</span></button>
        </div>
      </Card>
      <SettingsSection id="settings-schedule" icon={<Clock3 className="h-5 w-5" />} title="Agenda y reglas" description="Horarios, descansos, bloqueos, vacaciones y plazos." open>
        {organization ? <RealScheduleSettings key={`schedule-${organization.organization_id}`} organizationId={organization.organization_id} /> : <p className="text-sm text-text-secondary">No encontramos un consultorio activo.</p>}
      </SettingsSection>
      <SettingsSection id="settings-preferences" icon={<CreditCard className="h-5 w-5" />} title="Preferencias de citas e ingresos" description="Moneda, duración y precios sugeridos para nuevas citas." open>
        {organization ? <RealAppointmentPreferencesSettings key={`preferences-${organization.organization_id}`} organizationId={organization.organization_id} /> : <p className="text-sm text-text-secondary">No encontramos un consultorio activo.</p>}
      </SettingsSection>
      <SettingsSection id="settings-google" icon={<CalendarDays className="h-5 w-5" />} title="Google Calendar" description="Cuenta, calendario seleccionado y sincronización de tus citas." status={connected ? 'Conectado' : 'Pendiente'} open={!connected}>
      <Card highlighted className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/80 text-brand-strong"><CalendarDays className="h-5 w-5" /></span>
            <div>
              <h2 className="font-bold text-text-primary">Google Calendar</h2>
              <p className="mt-1 text-sm text-text-secondary">Vas a elegir un único calendario para {organization?.organization_name ?? 'tu consultorio'}.</p>
            </div>
          </div>
          <Badge variant={connected ? 'active' : 'info'}>{connected ? 'Conectado' : 'Conexión segura'}</Badge>
        </div>

        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <p className="rounded-xl bg-surface/80 p-3 text-text-secondary"><b className="block text-text-primary">Tus citas se reflejan en Google</b>Agenda conserva la fuente de verdad.</p>
          <p className="rounded-xl bg-surface/80 p-3 text-text-secondary"><b className="block text-text-primary">Privacidad protegida</b>Eventos externos sólo bloquean horarios.</p>
        </div>

        {connected && (
          <div className="flex items-start gap-3 rounded-xl border border-success/20 bg-success/10 p-3 text-sm text-text-secondary" role="status">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
            <p><b className="block text-text-primary">Tu cuenta de Google ya está conectada.</b>{calendarSelected ? <>Calendario en uso: <b>{calendarLabel ?? 'Calendario seleccionado'}</b>.</> : 'El próximo paso es elegir el calendario que vas a usar; todavía no se sincronizaron citas.'}</p>
          </div>
        )}
        {connected && !calendarSelected && (
          <section className="space-y-3 rounded-xl border border-border-subtle bg-surface/80 p-4" aria-labelledby="calendar-selector-title">
            <div>
              <h3 id="calendar-selector-title" className="font-semibold text-text-primary">Elegí tu calendario</h3>
              <p className="mt-1 text-sm text-text-secondary">Sólo se usará para crear tus citas de NutriSoft y bloquear horarios ocupados.</p>
            </div>
            {loadingCalendars ? <p className="text-sm text-text-secondary">Buscando tus calendarios…</p> : calendars.length > 0 ? <>
              <label className="block text-sm font-medium text-text-primary" htmlFor="google-calendar-select">Calendario de Google</label>
              <select id="google-calendar-select" value={selectedCalendarId} onChange={(event) => setSelectedCalendarId(event.target.value)} className="w-full rounded-xl border border-border-subtle bg-surface-subtle px-3 py-2.5 text-sm text-text-primary focus:border-brand-strong focus:bg-surface focus:outline-none">
                {calendars.map((calendar) => <option key={calendar.id} value={calendar.id}>{calendar.summary}{calendar.primary ? ' · principal' : ''}</option>)}
              </select>
              <Button onClick={() => void saveCalendarSelection()} disabled={!selectedCalendarId || savingCalendar}>{savingCalendar ? 'Guardando…' : 'Usar este calendario'}</Button>
            </> : <p className="text-sm text-text-secondary">No encontramos calendarios disponibles en esta cuenta.</p>}
          </section>
        )}
        {connectionError && <p role="alert" className="rounded-xl border border-critical/20 bg-critical/10 p-3 text-sm text-critical">{connectionError}</p>}

        <div className="flex flex-col gap-3 border-t border-border-subtle pt-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2 text-xs text-text-secondary"><ShieldCheck className="h-4 w-4 text-brand-strong" />Podés desconectar cuando quieras.</span>
          {connected ? <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={loadingCalendars || savingCalendar} onClick={() => { setCalendarSelected(false); setCalendarLabel(null); }}>Cambiar calendario</Button>
            <Button variant="outline" disabled={opening} onClick={() => void connect()}>{opening ? 'Abriendo Google…' : 'Cambiar cuenta de Google'}</Button>
          </div> : <Button disabled={!organization || opening || connectionStatus === 'loading'} onClick={() => void connect()}>{opening ? 'Abriendo Google…' : <><ExternalLink className="h-4 w-4" />Conectar Google</>}</Button>}
        </div>
        {connected && calendarSelected && <p className="border-t border-border-subtle pt-3 text-xs text-text-secondary">Al cambiar el calendario, las próximas sincronizaciones usarán el nuevo. Al cambiar cuenta de Google, vas a autorizar la nueva cuenta y elegir su calendario. Las citas existentes no se moverán automáticamente.</p>}
      </Card>
      </SettingsSection>
      <SettingsSection id="settings-checkins" icon={<ClipboardList className="h-5 w-5" />} title="Check-ins" description="Preguntas generales, selección y alertas importantes.">
        {organization ? <CheckinSettings key={`checkin-${organization.organization_id}`} org={organization.organization_id} /> : <p className="text-sm text-text-secondary">No encontramos un consultorio activo.</p>}
      </SettingsSection>
      <SettingsSection id="settings-anthropometry" icon={<HeartPulse className="h-5 w-5" />} title="Antropometría" description="Campos estándar y personalizados para las mediciones profesionales.">
        {organization ? <RealAnthropometryFields key={organization.organization_id} organizationId={organization.organization_id} /> : <p className="text-sm text-text-secondary">No encontramos un consultorio activo.</p>}
      </SettingsSection>
      <SettingsSection id="settings-brand" icon={<Palette className="h-5 w-5" />} title="Marca del consultorio · Custom" description="Colores, logos y cabeceras para las experiencias de profesional y paciente.">
        <RealBrandingSettings />
      </SettingsSection>
    </main>
  );
}
