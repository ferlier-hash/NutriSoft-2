import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { publicEnvironment } from '../config/environment';
import { accessContextSchema, type AccessContext } from './access-control';

let supabaseClientPromise: ReturnType<typeof importSupabaseClient> | undefined;

type PendingUrlAuth =
  | { kind: 'session'; accessToken: string; refreshToken: string }
  | { kind: 'code'; code: string }
  | null;

function readPendingAuthFromUrl(): PendingUrlAuth {
  if (typeof window === 'undefined') return null;

  const query = new URLSearchParams(window.location.search);
  const code = query.get('code');
  if (code) return { kind: 'code', code };

  const hash = window.location.hash;
  const legacyRoutePrefix = '#/reset-password#';
  const tokenFragment = hash.startsWith(legacyRoutePrefix)
    ? hash.slice(legacyRoutePrefix.length)
    : hash.startsWith('#access_token=')
      ? hash.slice(1)
      : null;

  if (!tokenFragment) return null;

  const values = new URLSearchParams(tokenFragment);
  const accessToken = values.get('access_token');
  const refreshToken = values.get('refresh_token');
  if (!accessToken || !refreshToken) return null;

  return { kind: 'session', accessToken, refreshToken };
}

function clearPendingAuthFromUrl() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete('code');
  url.searchParams.set('auth', 'invite');
  url.hash = '#/reset-password';
  window.history.replaceState(null, '', url);
}

const pendingUrlAuth = readPendingAuthFromUrl();

async function importSupabaseClient() {
  const module = await import('./supabase-client');
  return module.getSupabaseClient();
}

function loadSupabaseClient() {
  supabaseClientPromise ??= importSupabaseClient();
  return supabaseClientPromise;
}

export interface AuthProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
}

type AuthStatus = 'demo' | 'loading' | 'unauthenticated' | 'authenticated' | 'error';

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  profile: AuthProfile | null;
  accessContext: AccessContext | null;
  errorMessage: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  refreshAccess: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapProfile(row: {
  id: string | null;
  email: string | null;
  full_name: string | null;
  phone: string | null;
} | null): AuthProfile | null {
  if (!row?.id || !row.email || !row.full_name) return null;
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone ?? undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(
    publicEnvironment.demoMode ? null : undefined,
  );
  const [status, setStatus] = useState<AuthStatus>(
    publicEnvironment.demoMode ? 'demo' : 'loading',
  );
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [accessContext, setAccessContext] = useState<AccessContext | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestSequence = useRef(0);

  const loadAccess = async (activeSession: Session) => {
    const sequence = ++requestSequence.current;
    setStatus('loading');
    setErrorMessage(null);
    const supabase = await loadSupabaseClient();

    // La activación de una invitación de paciente no confía en datos del navegador:
    // la RPC usa exclusivamente auth.uid() y es idempotente para sesiones posteriores.
    const activationResult = await supabase.schema('api').rpc('complete_patient_invitation');
    if (activationResult.error) {
      setStatus('error');
      setErrorMessage('No pudimos completar la activación de la cuenta. Intentá nuevamente.');
      return;
    }

    const [profileResult, accessResult] = await Promise.all([
      supabase.schema('api').from('current_profile').select('id,email,full_name,phone').maybeSingle(),
      supabase.schema('api').rpc('get_current_access_context'),
    ]);

    if (sequence !== requestSequence.current) return;
    if (profileResult.error || accessResult.error) {
      setProfile(null);
      setAccessContext(null);
      setStatus('error');
      setErrorMessage('No pudimos verificar los permisos de la cuenta. Intentá nuevamente.');
      return;
    }

    const parsedAccess = accessContextSchema.safeParse(accessResult.data);
    if (!parsedAccess.success || parsedAccess.data.user_id !== activeSession.user.id) {
      setProfile(null);
      setAccessContext(null);
      setStatus('error');
      setErrorMessage('El contexto de acceso recibido no es válido.');
      return;
    }

    setProfile(mapProfile(profileResult.data));
    setAccessContext(parsedAccess.data);
    setStatus('authenticated');
  };

  useEffect(() => {
    if (publicEnvironment.demoMode) return;

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    void loadSupabaseClient().then(supabase => {
      if (cancelled) return;
      const initialSession = pendingUrlAuth?.kind === 'session'
        ? supabase.auth.setSession({
          access_token: pendingUrlAuth.accessToken,
          refresh_token: pendingUrlAuth.refreshToken,
        })
        : pendingUrlAuth?.kind === 'code'
          ? supabase.auth.exchangeCodeForSession(pendingUrlAuth.code)
          : supabase.auth.getSession();

      void initialSession.then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data.session && pendingUrlAuth) {
          setErrorMessage('No pudimos validar el enlace de activación. Solicitá uno nuevo desde la invitación pendiente.');
          setStatus('error');
          return;
        }
        if (data.session && pendingUrlAuth) clearPendingAuthFromUrl();
        setSession(data.session);
      });

      const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (!cancelled) setSession(nextSession);
      });
      unsubscribe = () => data.subscription.unsubscribe();
    }).catch(() => {
      if (!cancelled) {
        setErrorMessage('No pudimos iniciar el servicio de autenticación.');
        setStatus('error');
      }
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (publicEnvironment.demoMode || session === undefined) return;
    if (!session) {
      requestSequence.current += 1;
      setProfile(null);
      setAccessContext(null);
      setErrorMessage(null);
      setStatus('unauthenticated');
      return;
    }
    void loadAccess(session);
  }, [session]);

  const signIn = async (email: string, password: string) => {
    const supabase = await loadSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw new Error('El correo o la contraseña no son correctos.');
  };

  const signOut = async () => {
    const supabase = await loadSupabaseClient();
    requestSequence.current += 1;
    setProfile(null);
    setAccessContext(null);
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw new Error('No pudimos cerrar la sesión. Intentá nuevamente.');
  };

  const requestPasswordReset = async (email: string) => {
    const supabase = await loadSupabaseClient();
    const redirectTo = `${window.location.origin}${window.location.pathname}?auth=recovery`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo,
    });
    if (error) throw new Error('No pudimos procesar la solicitud. Intentá nuevamente.');
  };

  const updatePassword = async (password: string) => {
    const supabase = await loadSupabaseClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error?.message.includes('at least one character')) {
      throw new Error('La contraseña debe incluir mayúscula, minúscula, número y símbolo.');
    }
    if (error) throw new Error('No pudimos actualizar la contraseña. Solicitá un nuevo enlace.');
  };

  const refreshAccess = async () => {
    if (session) await loadAccess(session);
  };

  const value: AuthContextValue = {
    status,
    user: session?.user ?? null,
    profile,
    accessContext,
    errorMessage,
    signIn,
    signOut,
    requestPasswordReset,
    updatePassword,
    refreshAccess,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe utilizarse dentro de AuthProvider');
  return context;
}
