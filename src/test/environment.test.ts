import { describe, expect, it } from 'vitest';
import { parsePublicEnvironment } from '../config/environment';

describe('configuración pública de ambientes', () => {
  it('usa un entorno local demostrativo de forma segura por defecto', () => {
    expect(parsePublicEnvironment({})).toEqual({
      appEnvironment: 'local',
      demoMode: true,
      supabaseUrl: undefined,
      supabaseAnonKey: undefined,
      sentryDsn: undefined,
    });
  });

  it('acepta una configuración pública completa de Supabase', () => {
    expect(
      parsePublicEnvironment({
        VITE_APP_ENV: 'staging',
        VITE_ENABLE_DEMO_MODE: 'false',
        VITE_SUPABASE_URL: 'https://example.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'public-anon-key',
      }),
    ).toMatchObject({
      appEnvironment: 'staging',
      demoMode: false,
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'public-anon-key',
    });
  });

  it('rechaza una URL de Supabase sin su clave pública', () => {
    expect(() =>
      parsePublicEnvironment({ VITE_SUPABASE_URL: 'https://example.supabase.co' }),
    ).toThrow('VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY deben configurarse juntas.');
  });

  it('rechaza valores de entorno desconocidos', () => {
    expect(() => parsePublicEnvironment({ VITE_APP_ENV: 'qa' })).toThrow();
  });

  it('exige configuración de Supabase cuando se desactiva la demostración', () => {
    expect(() => parsePublicEnvironment({ VITE_ENABLE_DEMO_MODE: 'false' })).toThrow(
      'La autenticación real requiere URL y clave pública de Supabase.',
    );
  });
});
