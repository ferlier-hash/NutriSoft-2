import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const apiUrl = 'http://127.0.0.1:54321';
const password = 'LocalOnly-A9!test';
const email = `phase31-auth-${Date.now()}@nutrisoft.test`;

function readLocalSupabaseStatus() {
  return JSON.parse(
    execFileSync('npx', ['supabase', 'status', '-o', 'json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }),
  );
}

function ensureRequiredLocalServices() {
  execFileSync('docker', ['start', 'supabase_rest_nutrisoft', 'supabase_kong_nutrisoft'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function waitForLocalAuth() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`${apiUrl}/auth/v1/health`);
      if (response.ok) return;
    } catch {
      // El reset de Supabase puede terminar unos segundos antes que el proxy y Auth.
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('Supabase Auth local no respondió dentro de los 15 segundos esperados.');
}

function assignPlatformAdmin(userId) {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error('Supabase devolvió un identificador inválido.');

  const sql = [
    `INSERT INTO app.profiles (id, email, full_name) VALUES ('${userId}'::uuid, '${email}', 'Prueba Auth 3.1');`,
    `INSERT INTO app.user_platform_roles (user_id, role) VALUES ('${userId}'::uuid, 'platform_admin');`,
  ].join(' ');

  execFileSync(
    'docker',
    ['exec', 'supabase_db_nutrisoft', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', sql],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
}

function removeApplicationIdentity(userId) {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error('Supabase devolvió un identificador inválido.');

  const sql = [
    `DELETE FROM app.user_platform_roles WHERE user_id = '${userId}'::uuid;`,
    `DELETE FROM app.profiles WHERE id = '${userId}'::uuid;`,
  ].join(' ');

  execFileSync(
    'docker',
    ['exec', 'supabase_db_nutrisoft', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', sql],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
}

ensureRequiredLocalServices();
const status = readLocalSupabaseStatus();
await waitForLocalAuth();
const admin = createClient(apiUrl, status.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let createdUser;

try {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw created.error;
  createdUser = created.data.user;
  assignPlatformAdmin(createdUser.id);

  const client = createClient(apiUrl, status.PUBLISHABLE_KEY || status.ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, flowType: 'pkce' },
  });
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;

  const access = await client.schema('api').rpc('get_current_access_context');
  if (access.error) throw access.error;
  if (access.data?.platform_role !== 'platform_admin' || access.data?.user_id !== createdUser.id) {
    throw new Error('El contexto de acceso no coincide con el usuario autenticado.');
  }

  const profile = await client.schema('api').from('current_profile').select('id,email,full_name,phone').maybeSingle();
  if (profile.error || profile.data?.id !== createdUser.id) {
    throw new Error('El perfil propio no coincide con el usuario autenticado.');
  }

  const [metrics, organizations] = await Promise.all([
    client.schema('api').rpc('get_admin_metrics'),
    client.schema('api').from('admin_organizations').select('id,name,slug,status,created_at,updated_at'),
  ]);
  if (metrics.error || organizations.error) {
    const cause = metrics.error?.message || organizations.error?.message || 'error desconocido';
    throw new Error(`El Platform Admin no pudo consultar su superficie real de sólo lectura: ${cause}`);
  }
  if (typeof metrics.data?.organizations_total !== 'number' || !Array.isArray(organizations.data)) {
    throw new Error('La superficie administrativa devolvió un contrato inválido.');
  }
  const allowedOrganizationKeys = new Set(['id', 'name', 'slug', 'status', 'created_at', 'updated_at']);
  if (organizations.data.some(row => Object.keys(row).some(key => !allowedOrganizationKeys.has(key)))) {
    throw new Error('La superficie administrativa expuso campos fuera del contrato permitido.');
  }

  const signedOut = await client.auth.signOut({ scope: 'local' });
  if (signedOut.error) throw signedOut.error;
} finally {
  if (createdUser?.id) {
    removeApplicationIdentity(createdUser.id);
    const removed = await admin.auth.admin.deleteUser(createdUser.id);
    if (removed.error) throw removed.error;
  }
}

console.log('Autenticación y datos Admin E2E local: PASS');
