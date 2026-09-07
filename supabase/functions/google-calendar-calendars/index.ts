import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDARS_ENDPOINT = 'https://www.googleapis.com/calendar/v3/users/me/calendarList';
const LOCAL_ALLOWED_ORIGINS = new Set(['http://127.0.0.1:5173', 'http://127.0.0.1:5174']);

type GoogleCalendar = { id: string; summary: string; primary?: boolean; accessRole?: string };

function corsHeaders(request: Request) {
  const origin = request.headers.get('Origin') ?? '';
  return LOCAL_ALLOWED_ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};
}

function requiredEnvironment(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Configuración faltante: ${name}`);
  return value;
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function decryptRefreshToken(ciphertext: string, iv: string): Promise<string> {
  const keyBytes = fromBase64(requiredEnvironment('GOOGLE_TOKEN_ENCRYPTION_KEY_BASE64'));
  if (keyBytes.byteLength !== 32) throw new Error('Clave de cifrado inválida.');
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(iv) },
    key,
    fromBase64(ciphertext),
  );
  return new TextDecoder().decode(plaintext);
}

async function authenticatedOwner(request: Request, organizationId: string) {
  const authorization = request.headers.get('Authorization');
  if (!authorization) throw new Error('No autorizado.');
  const supabaseUrl = requiredEnvironment('SUPABASE_URL');
  const anonKey = requiredEnvironment('SUPABASE_ANON_KEY');
  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) throw new Error('Sesión inválida.');
  const { data: connection, error: connectionError } = await userClient.schema('api').rpc('get_google_calendar_connection_status', {
    p_organization_id: organizationId,
  });
  if (connectionError || connection?.[0]?.status !== 'connected') throw new Error('No hay una conexión activa de Google Calendar.');
  return { organizationId, nutritionistUserId: userData.user.id };
}

async function calendarsFromGoogle(organizationId: string, nutritionistUserId: string): Promise<GoogleCalendar[]> {
  const supabaseUrl = requiredEnvironment('SUPABASE_URL');
  const serviceKey = requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY');
  const clientId = requiredEnvironment('GOOGLE_OAUTH_CLIENT_ID');
  const clientSecret = requiredEnvironment('GOOGLE_OAUTH_CLIENT_SECRET');
  const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: stored, error: storedError } = await service.schema('api').rpc('get_google_calendar_connection_for_service', {
    p_organization_id: organizationId,
    p_nutritionist_user_id: nutritionistUserId,
  });
  const connection = stored?.[0];
  if (storedError || !connection) throw new Error('No encontramos la conexión de Google Calendar.');
  const refreshToken = await decryptRefreshToken(connection.refresh_token_ciphertext, connection.refresh_token_iv);
  const tokenResponse = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const tokenPayload = await tokenResponse.json() as { access_token?: string };
  if (!tokenResponse.ok || !tokenPayload.access_token) throw new Error('Google no permitió actualizar la conexión. Reconectá tu cuenta.');
  const calendarsResponse = await fetch(GOOGLE_CALENDARS_ENDPOINT, { headers: { Authorization: `Bearer ${tokenPayload.access_token}` } });
  const calendarsPayload = await calendarsResponse.json() as { items?: GoogleCalendar[]; error?: { status?: string } };
  if (!calendarsResponse.ok) {
    console.error('Google calendar list refused', calendarsResponse.status, calendarsPayload.error?.status ?? 'unknown');
    throw new Error(`Google no permitió listar los calendarios (estado ${calendarsResponse.status}).`);
  }
  return (calendarsPayload.items ?? [])
    .filter((calendar) => Boolean(calendar.id && calendar.summary))
    .map((calendar) => ({ id: calendar.id, summary: calendar.summary, primary: calendar.primary, accessRole: calendar.accessRole }));
}

Deno.serve(async (request) => {
  let stage = 'initialization';
  try {
    if (request.method === 'OPTIONS') return new Response(null, { headers: { ...corsHeaders(request), 'Access-Control-Allow-Headers': 'authorization, content-type' } });
    const requestUrl = new URL(request.url);
    const organizationId = requestUrl.searchParams.get('organization_id');
    if (!organizationId) return Response.json({ message: 'Falta el consultorio.' }, { status: 400, headers: corsHeaders(request) });
    stage = 'authenticate_owner';
    const owner = await authenticatedOwner(request, organizationId);
    stage = 'list_google_calendars';
    const calendars = await calendarsFromGoogle(owner.organizationId, owner.nutritionistUserId);

    if (request.method === 'GET') {
      return Response.json({ calendars }, { headers: { ...corsHeaders(request), 'Cache-Control': 'no-store' } });
    }
    if (request.method !== 'POST') return new Response('Método no permitido.', { status: 405, headers: corsHeaders(request) });
    const selection = await request.json() as { calendar_id?: string };
    const selected = calendars.find((calendar) => calendar.id === selection.calendar_id);
    if (!selected) return Response.json({ message: 'Elegí un calendario disponible de tu cuenta de Google.' }, { status: 422, headers: corsHeaders(request) });
    const service = createClient(requiredEnvironment('SUPABASE_URL'), requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
    stage = 'save_selection';
    const { error } = await service.schema('api').rpc('set_google_calendar_selection_for_service', {
      p_organization_id: owner.organizationId,
      p_nutritionist_user_id: owner.nutritionistUserId,
      p_calendar_id: selected.id,
      p_calendar_label: selected.summary,
    });
    if (error) throw new Error('No pudimos guardar el calendario elegido.');
    return Response.json({ selected_calendar: { label: selected.summary } }, { headers: corsHeaders(request) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No pudimos gestionar los calendarios de Google.';
    console.error('google-calendar-calendars failed', stage, message);
    return Response.json({ message }, { status: message === 'No autorizado.' || message === 'Sesión inválida.' ? 401 : 400, headers: corsHeaders(request) });
  }
});
