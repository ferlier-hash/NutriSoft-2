import { execFileSync } from 'node:child_process';
import { createClient, type Session } from '@supabase/supabase-js';
import type { Page } from '@playwright/test';

const apiUrl = 'http://127.0.0.1:54321';

function localStatus() {
  return JSON.parse(execFileSync('npx', ['supabase', 'status', '-o', 'json'], { encoding: 'utf8' })) as {
    SERVICE_ROLE_KEY: string;
    PUBLISHABLE_KEY?: string;
    ANON_KEY?: string;
  };
}

async function createSession(email: string): Promise<Session> {
  const status = localStatus();
  const admin = createClient(apiUrl, status.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const generated = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (generated.error) throw generated.error;
  const tokenHash = generated.data.properties?.hashed_token;
  if (!tokenHash) throw new Error(`No se pudo generar una sesión sintética para ${email}.`);
  const client = createClient(apiUrl, status.PUBLISHABLE_KEY || status.ANON_KEY || '', { auth: { persistSession: false, autoRefreshToken: false } });
  const verified = await client.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });
  if (verified.error || !verified.data.session) throw verified.error ?? new Error(`Sesión vacía para ${email}.`);
  return verified.data.session;
}

export async function authenticateAs(page: Page, email: string) {
  const session = await createSession(email);
  await page.context().addInitScript(({ value }) => {
    window.localStorage.setItem('nutrisoft-local-auth', JSON.stringify(value));
  }, { value: session });
}

export async function authenticateStagingRole(page: Page, role: 'admin' | 'nonadmin') {
  const email = process.env[`STAGING_E2E_${role.toUpperCase()}_EMAIL`];
  const password = process.env[`STAGING_E2E_${role.toUpperCase()}_PASSWORD`];
  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!email || !password || !url || !anonKey) {
    throw new Error(`Faltan variables protegidas de autenticación E2E de staging para el rol ${role}.`);
  }

  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`No se pudo autenticar la cuenta sintética E2E (${role}).`);

  const appEnvironment = process.env.STAGING_E2E_APP_ENV ?? 'staging';
  await page.context().addInitScript(({ storageKey, value }) => {
    window.localStorage.setItem(storageKey, JSON.stringify(value));
  }, { storageKey: `nutrisoft-${appEnvironment}-auth`, value: data.session });
}
