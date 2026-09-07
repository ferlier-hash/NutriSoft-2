import { useAuth } from '../../../auth/AuthProvider';
import { Button } from '../../../components/ui/Button';
import { AuthPageShell } from './AuthPageShell';

export function AccountSuspendedPage() {
  const { signOut } = useAuth();
  return (
    <AuthPageShell
      title="Cuenta suspendida"
      description="El acceso operativo está temporalmente deshabilitado para este consultorio."
    >
      <p className="rounded-xl bg-semantic-warning-bg p-3 text-xs text-semantic-warning">No se cargó información clínica. Contactá al responsable de la cuenta para revisar el estado del servicio.</p>
      <Button type="button" variant="secondary" className="w-full mt-4" onClick={() => void signOut()}>Cerrar sesión</Button>
    </AuthPageShell>
  );
}
