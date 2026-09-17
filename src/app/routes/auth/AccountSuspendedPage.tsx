import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/AuthProvider';
import { Button } from '../../../components/ui/Button';
import { AuthPageShell } from './AuthPageShell';

export function AccountSuspendedPage() {
  const { signOut, status } = useAuth();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');

  if (status === 'unauthenticated') return <Navigate to="/login" replace />;

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setSignOutError('');
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : 'No pudimos cerrar la sesión. Intentá nuevamente.');
      setIsSigningOut(false);
    }
  };

  return (
    <AuthPageShell
      title="Cuenta suspendida"
      description="El acceso operativo está temporalmente deshabilitado para este consultorio."
    >
      <p className="rounded-xl bg-semantic-warning-bg p-3 text-xs text-semantic-warning">No se cargó información clínica. Contactá al responsable de la cuenta para revisar el estado del servicio.</p>
      {signOutError && <p role="alert" className="mt-3 text-sm text-critical">{signOutError}</p>}
      <Button type="button" variant="secondary" className="mt-4 w-full" disabled={isSigningOut} onClick={() => void handleSignOut()}>{isSigningOut ? 'Cerrando…' : 'Cerrar sesión'}</Button>
    </AuthPageShell>
  );
}
