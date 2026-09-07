import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, Navigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../../../auth/AuthProvider';
import { Button } from '../../../components/ui/Button';
import { AuthPageShell } from './AuthPageShell';

const loginSchema = z.object({
  email: z.string().trim().email('Ingresá un correo válido.'),
  password: z.string().min(1, 'Ingresá tu contraseña.'),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { status, signIn } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  if (status === 'authenticated') return <Navigate to="/" replace />;

  if (status === 'demo') {
    return (
      <AuthPageShell
        title="Modo demostración activo"
        description="La autenticación real está aislada mientras trabajás con datos ficticios."
      >
        <Button asChild className="w-full">
          <Link to="/professional">Volver a la demostración</Link>
        </Button>
      </AuthPageShell>
    );
  }

  const onSubmit = handleSubmit(async values => {
    setSubmitError(null);
    try {
      await signIn(values.email, values.password);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'No pudimos iniciar sesión.');
    }
  });

  return (
    <AuthPageShell
      title="Ingresá a tu cuenta"
      description="Usá el correo con el que recibiste tu invitación."
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="login-email" className="block text-xs font-semibold text-text-primary mb-1.5">
            Correo electrónico
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'login-email-error' : undefined}
            className="form-control w-full"
            {...register('email')}
          />
          {errors.email && <p id="login-email-error" className="mt-1 text-xs text-semantic-critical">{errors.email.message}</p>}
        </div>
        <div>
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <label htmlFor="login-password" className="text-xs font-semibold text-text-primary">Contraseña</label>
            <Link to="/forgot-password" className="text-xs font-semibold text-brand-strong hover:underline">¿La olvidaste?</Link>
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'login-password-error' : undefined}
              className="form-control w-full pr-11"
              {...register('password')}
            />
            <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-text-secondary hover:text-brand-strong">
              {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
          {errors.password && <p id="login-password-error" className="mt-1 text-xs text-semantic-critical">{errors.password.message}</p>}
        </div>
        {submitError && <p role="alert" className="rounded-xl bg-semantic-critical-bg p-3 text-xs text-semantic-critical">{submitError}</p>}
        <Button type="submit" className="w-full" disabled={isSubmitting || status === 'loading'}>
          {isSubmitting || status === 'loading' ? 'Verificando…' : 'Ingresar'}
        </Button>
      </form>
    </AuthPageShell>
  );
}
