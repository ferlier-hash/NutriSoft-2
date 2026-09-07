import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const LOCAL_ALLOWED_ORIGINS = new Set(['http://127.0.0.1:5173', 'http://127.0.0.1:5174']);
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3/calendars';

function corsHeaders(request: Request) { const origin = request.headers.get('Origin') ?? ''; return LOCAL_ALLOWED_ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}; }
function environment(name: string) { const value = Deno.env.get(name); if (!value) throw new Error(`Configuración faltante: ${name}`); return value; }
function fromBase64(value: string) { const binary = atob(value); return Uint8Array.from(binary, (character) => character.charCodeAt(0)); }
async function decrypt(ciphertext: string, iv: string) {
  const bytes = fromBase64(environment('GOOGLE_TOKEN_ENCRYPTION_KEY_BASE64'));
  if (bytes.byteLength !== 32) throw new Error('Clave de cifrado inválida.');
  const key = await crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['decrypt']);
  const value = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(iv) }, key, fromBase64(ciphertext));
  return new TextDecoder().decode(value);
}
async function googleAccessToken(refreshToken: string) {
  const response = await fetch(TOKEN_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: environment('GOOGLE_OAUTH_CLIENT_ID'), client_secret: environment('GOOGLE_OAUTH_CLIENT_SECRET'), refresh_token: refreshToken, grant_type: 'refresh_token' }) });
  const payload = await response.json() as { access_token?: string };
  if (!response.ok || !payload.access_token) throw new Error('Google no permitió actualizar la conexión. Reconectá tu cuenta.');
  return payload.access_token;
}

type SyncAppointment = { starts_at: string; ends_at: string; time_zone: string; modality: 'virtual' | 'in_person'; status: string; google_calendar_event_id: string | null; virtual_meeting_url: string | null };
type GoogleEvent = { id?: string; status?: string; transparency?: string };

async function hasExternalBusyEvent(token: string, calendarId: string, appointment: SyncAppointment) {
  const params = new URLSearchParams({ timeMin: appointment.starts_at, timeMax: appointment.ends_at, singleEvents: 'true', showDeleted: 'false', maxResults: '2500', fields: 'items(id,status,transparency),nextPageToken' });
  let pageToken: string | undefined;
  do {
    if (pageToken) params.set('pageToken', pageToken);
    const response = await fetch(`${CALENDAR_API}/${calendarId}/events?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    const payload = await response.json() as { items?: GoogleEvent[]; nextPageToken?: string };
    if (!response.ok) throw new Error('Google no permitió verificar la disponibilidad. Podés reintentar desde Agenda.');
    if ((payload.items ?? []).some((event) => event.id !== appointment.google_calendar_event_id && event.status !== 'cancelled' && event.transparency !== 'transparent')) return true;
    pageToken = payload.nextPageToken;
  } while (pageToken);
  return false;
}

function meetUrl(payload: { conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> } }) {
  return payload.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === 'video')?.uri ?? null;
}

Deno.serve(async (request) => {
  let stage = 'initialization';
  try {
    if (request.method === 'OPTIONS') return new Response(null, { headers: { ...corsHeaders(request), 'Access-Control-Allow-Headers': 'authorization, content-type' } });
    if (request.method !== 'POST') return new Response('Método no permitido.', { status: 405, headers: corsHeaders(request) });
    const authorization = request.headers.get('Authorization');
    if (!authorization) throw new Error('No autorizado.');
    const { appointment_id: appointmentId } = await request.json() as { appointment_id?: string };
    if (!appointmentId) return Response.json({ message: 'Falta la cita.' }, { status: 400, headers: corsHeaders(request) });

    const supabaseUrl = environment('SUPABASE_URL');
    const user = createClient(supabaseUrl, environment('SUPABASE_ANON_KEY'), { auth: { persistSession: false }, global: { headers: { Authorization: authorization } } });
    stage = 'verify_user';
    const { data: identity, error: identityError } = await user.auth.getUser();
    if (identityError || !identity.user) throw new Error('Sesión inválida.');
    stage = 'authorized_appointment';
    const { data: rows, error: appointmentError } = await user.schema('api').rpc('get_appointment_for_google_sync', { p_appointment_id: appointmentId });
    const appointment = rows?.[0];
    if (appointmentError || !appointment) throw new Error('Cita no encontrada o sin permisos.');
    if (!appointment.selected_google_calendar_id) return Response.json({ state: 'not_configured', message: 'Elegí un calendario de Google antes de sincronizar citas.' }, { status: 409, headers: corsHeaders(request) });

    const service = createClient(supabaseUrl, environment('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
    stage = 'load_secure_connection';
    const { data: connections, error: connectionError } = await service.schema('api').rpc('get_google_calendar_connection_for_service', { p_organization_id: appointment.organization_id, p_nutritionist_user_id: identity.user.id });
    const connection = connections?.[0];
    if (connectionError || !connection) throw new Error('No encontramos la conexión de Google Calendar.');
    const token = await googleAccessToken(await decrypt(connection.refresh_token_ciphertext, connection.refresh_token_iv));
    const calendarId = encodeURIComponent(appointment.selected_google_calendar_id);
    const shouldRemove = ['cancelled_by_patient', 'cancelled_by_professional', 'rescheduled'].includes(appointment.status);
    if (shouldRemove) {
      if (appointment.google_calendar_event_id) {
        stage = 'delete_google_event';
        const response = await fetch(`${CALENDAR_API}/${calendarId}/events/${encodeURIComponent(appointment.google_calendar_event_id)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok && response.status !== 404) throw new Error('Google no permitió quitar el evento cancelado.');
      }
      await service.schema('api').rpc('set_google_calendar_sync_result_for_service', { p_appointment_id: appointment.appointment_id, p_google_calendar_event_id: null, p_virtual_meeting_url: null, p_has_external_conflict: false });
      return Response.json({ state: 'removed' }, { headers: corsHeaders(request) });
    }
    if (appointment.status !== 'confirmed') return Response.json({ state: 'not_ready' }, { headers: corsHeaders(request) });

    stage = 'check_external_availability';
    const hasConflict = await hasExternalBusyEvent(token, calendarId, appointment as SyncAppointment);
    const recreateWithoutMeet = appointment.modality === 'in_person' && Boolean(appointment.virtual_meeting_url);
    if (recreateWithoutMeet && appointment.google_calendar_event_id) {
      stage = 'remove_previous_virtual_event';
      const removal = await fetch(`${CALENDAR_API}/${calendarId}/events/${encodeURIComponent(appointment.google_calendar_event_id)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!removal.ok && removal.status !== 404) throw new Error('Google no permitió actualizar la modalidad de la cita. Podés reintentarla desde Agenda.');
    }
    const existingEventId = recreateWithoutMeet ? null : appointment.google_calendar_event_id;
    const eventPayload: Record<string, unknown> = { summary: 'Consulta NutriSoft', start: { dateTime: appointment.starts_at, timeZone: appointment.time_zone }, end: { dateTime: appointment.ends_at, timeZone: appointment.time_zone } };
    if (appointment.modality === 'virtual' && !appointment.virtual_meeting_url) eventPayload.conferenceData = { createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: 'hangoutsMeet' } } };
    stage = existingEventId ? 'update_google_event' : 'create_google_event';
    const baseUrl = existingEventId ? `${CALENDAR_API}/${calendarId}/events/${encodeURIComponent(existingEventId)}` : `${CALENDAR_API}/${calendarId}/events`;
    const eventUrl = eventPayload.conferenceData ? `${baseUrl}?conferenceDataVersion=1` : baseUrl;
    const response = await fetch(eventUrl, { method: existingEventId ? 'PATCH' : 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(eventPayload) });
    const payload = await response.json() as { id?: string; error?: { status?: string }; conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> } };
    if (!response.ok || !payload.id) { console.error('Google event rejected', response.status, payload.error?.status ?? 'unknown'); throw new Error('Google no permitió sincronizar la cita. Podés reintentarla desde Agenda.'); }

    stage = 'save_sync_result';
    const { error: saveError } = await service.schema('api').rpc('set_google_calendar_sync_result_for_service', {
      p_appointment_id: appointment.appointment_id,
      p_google_calendar_event_id: payload.id,
      p_virtual_meeting_url: appointment.modality === 'virtual' ? (meetUrl(payload) ?? appointment.virtual_meeting_url) : null,
      p_has_external_conflict: hasConflict,
    });
    if (saveError) throw new Error('La cita se creó en Google, pero no pudimos confirmar la sincronización local.');
    return Response.json({ state: hasConflict ? 'synced_with_conflict' : 'synced' }, { headers: corsHeaders(request) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No pudimos sincronizar la cita.';
    console.error('google-calendar-events failed', stage, message);
    return Response.json({ message }, { status: message === 'No autorizado.' || message === 'Sesión inválida.' ? 401 : 400, headers: corsHeaders(request) });
  }
});
