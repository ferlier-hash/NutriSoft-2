import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { publicEnvironment } from '../config/environment';
import type { Database } from '../types/database.types';

let client: SupabaseClient<Database> | undefined;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (client) return client;

  if (!publicEnvironment.supabaseUrl || !publicEnvironment.supabaseAnonKey) {
    throw new Error('La autenticación real requiere configurar Supabase.');
  }

  client = createClient<Database>(
    publicEnvironment.supabaseUrl,
    publicEnvironment.supabaseAnonKey,
    {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        persistSession: true,
        storageKey: `nutrisoft-${publicEnvironment.appEnvironment}-auth`,
      },
    },
  );

  return client;
}
