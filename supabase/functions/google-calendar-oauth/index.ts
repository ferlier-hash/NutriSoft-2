import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GOOGLE_AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/calendar.events',
];
const REDIRECT_URI = 'http://localhost:54321/functions/v1/google-calendar-oauth';
const LOCAL_ALLOWED_ORIGINS = new Set(['http://127.0.0.1:5173', 'http://127.0.0.1:5174']);

function corsHeaders(request: Request) {
  const origin = request.headers.get('Origin') ?? '';
  return LOCAL_ALLOWED_ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' } : {};
}

function requiredEnvironment(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Configuración faltante: ${name}`);
  return value;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function sha256(value: string): Promise<string> {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function encryptRefreshToken(token: string) {
  const keyBytes = fromBase64(requiredEnvironment('GOOGLE_TOKEN_ENCRYPTION_KEY_BASE64'));
  if (keyBytes.byteLength !== 32) throw new Error('GOOGLE_TOKEN_ENCRYPTION_KEY_BASE64 debe contener 32 bytes.');
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(token));
  return { ciphertext: toBase64(new Uint8Array(ciphertext)), iv: toBase64(iv) };
}

function redirect(url: URL): Response {
  return new Response(null, { status: 302, headers: { Location: url.toString(), 'Cache-Control': 'no-store' } });
}

function frontendRedirect(status: 'connected' | 'error', reason?: string): Response {
  const configuredUrl = requiredEnvironment('GOOGLE_OAUTH_FRONTEND_RETURN_URL');
  const separator = configuredUrl.includes('?') ? '&' : '?';
  const destination = new URL(`${configuredUrl}${separator}google=${status}${reason ? `&reason=${encodeURIComponent(reason)}` : ''}`);
  return redirect(destination);
}

function failureRedirect(code: string): Response {
  return frontendRedirect('error', code);
}

Deno.serve(async (request) => {
  let stage = 'initialization';
  try {
    if (request.method === 'OPTIONS') return new Response(null, { headers: { ...corsHeaders(request), 'Access-Control-Allow-Headers': 'authorization, content-type' } });
    const requestUrl = new URL(request.url);
    const supabaseUrl = requiredEnvironment('SUPABASE_URL');
    const anonKey = requiredEnvironment('SUPABASE_ANON_KEY');
    const serviceKey = requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY');
    const clientId = requiredEnvironment('GOOGLE_OAUTH_CLIENT_ID');
    const clientSecret = requiredEnvironment('GOOGLE_OAUTH_CLIENT_SECRET');

    if (requestUrl.searchParams.has('code')) {
      stage = 'callback_validation';
      const state = requestUrl.searchParams.get('state');
      if (!state || requestUrl.searchParams.get('error')) return failureRedirect('authorization_denied');

      const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
      stage = 'consume_state';
      const stateHash = await sha256(state);
      const { data: consumed, error: consumeError } = await service.schema('api').rpc('consume_google_calendar_oauth_state', { p_state_hash: stateHash });
      const owner = Array.isArray(consumed) ? consumed[0] : null;
      if (consumeError || !owner) return failureRedirect('invalid_state');

      stage = 'exchange_token';
      const tokenResponse = await fetch(GOOGLE_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: requestUrl.searchParams.get('code') ?? '',
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });
      const payload = await tokenResponse.json() as { refresh_token?: string; expires_in?: number; scope?: string };
      if (!tokenResponse.ok || !payload.refresh_token) return failureRedirect('token_exchange_failed');

      stage = 'encrypt_refresh_token';
      const encrypted = await encryptRefreshToken(payload.refresh_token);
      const expiry = payload.expires_in ? new Date(Date.now() + payload.expires_in * 1000).toISOString() : null;
      stage = 'store_connection';
      const { error: storeError } = await service.schema('api').rpc('store_google_calendar_connection', {
        p_organization_id: owner.organization_id,
        p_nutritionist_user_id: owner.nutritionist_user_id,
        p_refresh_token_ciphertext: encrypted.ciphertext,
        p_refresh_token_iv: encrypted.iv,
        p_granted_scopes: (payload.scope ?? '').split(' ').filter(Boolean),
        p_access_token_expires_at: expiry,
      });
      if (storeError) return failureRedirect('connection_store_failed');

      stage = 'redirect_connected';
      return frontendRedirect('connected');
    }

    stage = 'start_authorization';
    const authorization = request.headers.get('Authorization');
    const organizationId = requestUrl.searchParams.get('organization_id');
    if (!authorization || !organizationId) return new Response('No autorizado.', { status: 401 });

    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authorization } },
    });
    const state = toBase64(crypto.getRandomValues(new Uint8Array(32))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
    stage = 'create_state';
    const { error: stateError } = await userClient.schema('api').rpc('create_google_calendar_oauth_state', {
      p_organization_id: organizationId,
      p_state_hash: await sha256(state),
      p_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    if (stateError) {
      console.error('OAuth state rejected', stateError.message);
      return Response.json(
        { message: `No autorizado para conectar este calendario: ${stateError.message}` },
        { status: 403, headers: corsHeaders(request) },
      );
    }

    const googleUrl = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);
    googleUrl.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: GOOGLE_SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      state,
    }).toString();
    if (request.headers.get('Accept')?.includes('application/json')) {
      return Response.json({ authorization_url: googleUrl.toString() }, { headers: { ...corsHeaders(request), 'Cache-Control': 'no-store' } });
    }
    return redirect(googleUrl);
  } catch (error) {
    console.error('google-calendar-oauth failed', stage, error instanceof Error ? error.message : 'unknown');
    try {
      return frontendRedirect('error', 'unexpected_callback_error');
    } catch {
      return new Response('No se pudo iniciar la conexión con Google Calendar.', { status: 500 });
    }
  }
});
