import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../../../auth/AuthProvider';
import { Button } from '../../../components/ui/Button';
import { AuthPageShell } from './AuthPageShell';

const recoverySchema = z.object({
  email: z.string().trim().email('Ingresá un correo válido.'),
});

type RecoveryValues = z.infer<typeof recoverySchema>;

export function ForgotPasswordPage() {
  const { status, requestPasswordReset } = useAuth();
  const [sent, setSent] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RecoveryValues>({
    resolver: zodResolver(recoverySchema),
  });

  const onSubmit = handleSubmit(async values => {
    setSubmitError(null);
    try {
      await requestPasswordReset(values.email);
      setSent(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'No pudimos procesar la solicitud.');
    }
  });

  return (
    <AuthPageShell
      title="Recuperá tu acceso"
      description="Te enviaremos instrucciones si el correo corresponde a una cuenta habilitada."
    >
      {status === 'demo' ? (
        <div className="space-y-4">
          <p className="rounded-xl bg-surface-subtle p-3 text-xs text-text-secondary">La recuperación real no se envía en modo demostración.</p>
          <Button asChild variant="secondary" className="w-full"><Link to="/professional">Volver</Link></Button>
        </div>
      ) : sent ? (
        <div className="space-y-4">
          <p role="status" className="rounded-xl bg-semantic-success-bg p-3 text-xs text-semantic-success">Si existe una cuenta habilitada, vas a recibir un correo con los próximos pasos.</p>
          {import.meta.env.DEV && (
            <a
              href="http://127.0.0.1:54324"
              target="_blank"
              rel="noreferrer"
              className="block rounded-xl border border-border-subtle bg-surface-subtle p-3 text-center text-xs font-semibold text-brand-strong hover:border-brand-primary hover:underline"
            >
              Abrir Buzón de pruebas local
            </a>
          )}
          <Button asChild variant="secondary" className="w-full"><Link to="/login">Volver al acceso</Link></Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="recovery-email" className="block text-xs font-semibold text-text-primary mb-1.5">Correo electrónico</label>
            <input id="recovery-email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'recovery-email-error' : undefined} className="form-control w-full" {...register('email')} />
            {errors.email && <p id="recovery-email-error" className="mt-1 text-xs text-semantic-critical">{errors.email.message}</p>}
          </div>
          {submitError && <p role="alert" className="rounded-xl bg-semantic-critical-bg p-3 text-xs text-semantic-critical">{submitError}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? 'Enviando…' : 'Enviar instrucciones'}</Button>
          <Button asChild variant="ghost" className="w-full"><Link to="/login">Volver al acceso</Link></Button>
        </form>
      )}
    </AuthPageShell>
  );
}
