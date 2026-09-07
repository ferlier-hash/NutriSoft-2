import { z } from 'zod';

const optionalUrl = z.union([z.literal(''), z.string().url()]).optional();

const publicEnvironmentSchema = z
  .object({
    VITE_APP_ENV: z.enum(['local', 'staging', 'production']).default('local'),
    VITE_ENABLE_DEMO_MODE: z.enum(['true', 'false']).default('true'),
    VITE_SUPABASE_URL: optionalUrl,
    VITE_SUPABASE_ANON_KEY: z.string().optional(),
    VITE_SENTRY_DSN: optionalUrl,
  })
  .superRefine((environment, context) => {
    const hasSupabaseUrl = Boolean(environment.VITE_SUPABASE_URL);
    const hasSupabaseKey = Boolean(environment.VITE_SUPABASE_ANON_KEY);

    if (hasSupabaseUrl !== hasSupabaseKey) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY deben configurarse juntas.',
      });
    }

    if (environment.VITE_ENABLE_DEMO_MODE === 'false' && (!hasSupabaseUrl || !hasSupabaseKey)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La autenticación real requiere URL y clave pública de Supabase.',
      });
    }
  });

export interface PublicEnvironment {
  appEnvironment: 'local' | 'staging' | 'production';
  demoMode: boolean;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  sentryDsn?: string;
}

export function parsePublicEnvironment(environment: Record<string, unknown>): PublicEnvironment {
  const parsed = publicEnvironmentSchema.parse(environment);

  return {
    appEnvironment: parsed.VITE_APP_ENV,
    demoMode: parsed.VITE_ENABLE_DEMO_MODE === 'true',
    supabaseUrl: parsed.VITE_SUPABASE_URL || undefined,
    supabaseAnonKey: parsed.VITE_SUPABASE_ANON_KEY || undefined,
    sentryDsn: parsed.VITE_SENTRY_DSN || undefined,
  };
}

export const publicEnvironment = parsePublicEnvironment(import.meta.env);
