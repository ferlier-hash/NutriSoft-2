import { useAuth } from '../../../auth/AuthProvider';
import { Button } from '../../../components/ui/Button';
import { AuthPageShell } from './AuthPageShell';

export function AccessPendingPage() {
  const { signOut } = useAuth();
  return (
    <AuthPageShell
      title="Acceso pendiente"
      description="Tu cuenta está identificada, pero todavía no tiene un rol o acceso activo asignado."
    >
      <p className="rounded-xl bg-surface-subtle p-3 text-xs text-text-secondary">Contactá al responsable de tu consultorio o al soporte de NutriSoft.</p>
      <Button type="button" variant="secondary" className="w-full mt-4" onClick={() => void signOut()}>Cerrar sesión</Button>
    </AuthPageShell>
  );
}
