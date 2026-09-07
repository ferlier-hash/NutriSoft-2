import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../../../auth/AuthProvider';
import { Button } from '../../../components/ui/Button';
import { AuthPageShell } from './AuthPageShell';

const passwordSchema = z.object({
  password: z.string()
    .min(12, 'Usá al menos 12 caracteres.')
    .regex(/[a-z]/, 'Incluí al menos una letra minúscula.')
    .regex(/[A-Z]/, 'Incluí al menos una letra mayúscula.')
    .regex(/[0-9]/, 'Incluí al menos un número.')
    .regex(/[^A-Za-z0-9]/, 'Incluí al menos un símbolo, por ejemplo ! o #.'),
  confirmation: z.string(),
}).refine(values => values.password === values.confirmation, {
  message: 'Las contraseñas no coinciden.',
  path: ['confirmation'],
});

type PasswordValues = z.infer<typeof passwordSchema>;

export function ResetPasswordPage() {
  const { status, user, errorMessage, updatePassword } = useAuth();
  const [updated, setUpdated] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
  });

  const onSubmit = handleSubmit(async values => {
    setSubmitError(null);
    try {
      await updatePassword(values.password);
      const url = new URL(window.location.href);
      url.searchParams.delete('auth');
      window.history.replaceState(null, '', url);
      setUpdated(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'No pudimos actualizar la contraseña.');
    }
  });

  if (status === 'demo') {
    return <AuthPageShell title="Modo demostración activo" description="Los enlaces de recuperación se prueban en el ambiente de autenticación local."><Button asChild className="w-full"><Link to="/professional">Volver</Link></Button></AuthPageShell>;
  }

  if (status !== 'loading' && !user) {
    return <AuthPageShell title="Enlace de activación no válido" description={errorMessage ?? 'El enlace venció, fue utilizado o no corresponde a una sesión de recuperación.'}><div className="space-y-3"><p className="rounded-xl bg-surface-subtle p-3 text-xs text-text-secondary">No se modificó ninguna cuenta. Volvé al profesional, reenviá la invitación y abrí únicamente el nuevo enlace de activación.</p><Button asChild className="w-full"><Link to="/login">Volver al acceso</Link></Button></div></AuthPageShell>;
  }

  return (
    <AuthPageShell title="Creá una nueva contraseña" description="Usá 12 o más caracteres, con mayúscula, minúscula, número y símbolo. Evitá reutilizar una contraseña anterior.">
      {updated ? (
        <div className="space-y-4">
          <p role="status" className="rounded-xl bg-semantic-success-bg p-3 text-xs text-semantic-success">Tu contraseña fue actualizada correctamente.</p>
          <Button asChild className="w-full"><Link to="/">Continuar</Link></Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="new-password" className="block text-xs font-semibold text-text-primary mb-1.5">Nueva contraseña</label>
            <div className="relative">
              <input id="new-password" type={showPasswords ? 'text' : 'password'} autoComplete="new-password" aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'new-password-error' : undefined} className="form-control w-full pr-11" {...register('password')} />
              <button type="button" onClick={() => setShowPasswords(value => !value)} aria-label={showPasswords ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-text-secondary hover:text-brand-strong">
                {showPasswords ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
            {errors.password && <p id="new-password-error" className="mt-1 text-xs text-semantic-critical">{errors.password.message}</p>}
          </div>
          <div>
            <label htmlFor="password-confirmation" className="block text-xs font-semibold text-text-primary mb-1.5">Repetir contraseña</label>
            <div className="relative">
              <input id="password-confirmation" type={showPasswords ? 'text' : 'password'} autoComplete="new-password" aria-invalid={Boolean(errors.confirmation)} aria-describedby={errors.confirmation ? 'password-confirmation-error' : undefined} className="form-control w-full pr-11" {...register('confirmation')} />
              <button type="button" onClick={() => setShowPasswords(value => !value)} aria-label={showPasswords ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-text-secondary hover:text-brand-strong">
                {showPasswords ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
            {errors.confirmation && <p id="password-confirmation-error" className="mt-1 text-xs text-semantic-critical">{errors.confirmation.message}</p>}
          </div>
          {submitError && <p role="alert" className="rounded-xl bg-semantic-critical-bg p-3 text-xs text-semantic-critical">{submitError}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting || status === 'loading'}>{isSubmitting ? 'Guardando…' : 'Guardar contraseña'}</Button>
        </form>
      )}
    </AuthPageShell>
  );
}
