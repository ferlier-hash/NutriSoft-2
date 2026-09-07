import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import {
  getAuthorizedPortals,
  getDefaultPortal,
  hasSuspendedAccess,
  type Portal,
} from './access-control';
import { AuthPageShell } from '../app/routes/auth/AuthPageShell';
import { Button } from '../components/ui/Button';

const portalPaths: Record<Portal, string> = {
  admin: '/admin',
  professional: '/professional',
  patient: '/patient',
};

function LoadingAccessPage() {
  return (
    <AuthPageShell title="Verificando tu acceso" description="Estamos confirmando tu sesión y tus permisos.">
      <p role="status" className="text-sm text-text-secondary">Cargando…</p>
    </AuthPageShell>
  );
}

function AccessErrorPage({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <AuthPageShell title="No pudimos verificar tu acceso" description={message}>
      <Button type="button" className="w-full" onClick={onRetry}>Reintentar</Button>
    </AuthPageShell>
  );
}

export function DataIntegrationPendingPage() {
  return (
    <AuthPageShell
      title="Acceso verificado"
      description="Tu sesión y tus permisos son válidos. La conexión del portal con datos reales todavía está en preparación."
    >
      <p className="rounded-xl bg-surface-subtle p-3 text-xs text-text-secondary">
        Esta protección evita mostrar datos ficticios dentro de una sesión real.
      </p>
    </AuthPageShell>
  );
}

export function PortalGuard({ portal, children }: { portal: Portal; children: ReactNode }) {
  const { status, profile, accessContext, errorMessage, refreshAccess } = useAuth();

  if (status === 'demo') return children;
  if (status === 'loading') return <LoadingAccessPage />;
  if (status === 'error') {
    return <AccessErrorPage message={errorMessage ?? 'Ocurrió un error inesperado.'} onRetry={() => void refreshAccess()} />;
  }
  if (status === 'unauthenticated') return <Navigate to="/login" replace />;
  if (!profile) return <Navigate to="/access-pending" replace />;
  if (!accessContext) return <Navigate to="/access-pending" replace />;

  const authorizedPortals = getAuthorizedPortals(accessContext);
  if (!authorizedPortals.includes(portal)) {
    return <Navigate to={hasSuspendedAccess(accessContext) ? '/account-suspended' : '/'} replace />;
  }

  return children;
}

export function AuthLandingRedirect() {
  const { status, accessContext, errorMessage, refreshAccess } = useAuth();
  const authIntent = new URLSearchParams(window.location.search).get('auth');

  if (status === 'demo') return <Navigate to="/professional" replace />;
  if (status === 'loading') return <LoadingAccessPage />;
  if (authIntent === 'invite' || authIntent === 'recovery') return <Navigate to="/reset-password" replace />;
  if (status === 'error') {
    return <AccessErrorPage message={errorMessage ?? 'Ocurrió un error inesperado.'} onRetry={() => void refreshAccess()} />;
  }
  if (status === 'unauthenticated') return <Navigate to="/login" replace />;
  if (!accessContext) return <Navigate to="/access-pending" replace />;

  const defaultPortal = getDefaultPortal(accessContext);
  if (defaultPortal) return <Navigate to={portalPaths[defaultPortal]} replace />;
  return <Navigate to={hasSuspendedAccess(accessContext) ? '/account-suspended' : '/access-pending'} replace />;
}
