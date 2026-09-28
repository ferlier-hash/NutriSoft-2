import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from '../app/routes/auth/LoginPage';
import { ForgotPasswordPage } from '../app/routes/auth/ForgotPasswordPage';

const { auth } = vi.hoisted(() => ({
  auth: {
    status: 'unauthenticated',
    signIn: vi.fn(),
    requestPasswordReset: vi.fn(),
  },
}));

vi.mock('../auth/AuthProvider', () => ({ useAuth: () => auth }));

function renderAuthPage(page: React.ReactNode) {
  return render(<MemoryRouter>{page}</MemoryRouter>);
}

describe('pantallas de autenticación REAL', () => {
  beforeEach(() => {
    auth.signIn.mockReset();
    auth.requestPasswordReset.mockReset();
  });

  it('presenta el formulario de acceso sin simular una sesión', () => {
    renderAuthPage(<LoginPage />);

    expect(screen.getByRole('heading', { name: 'Ingresá a tu cuenta' })).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeEnabled();
  });

  it('ofrece el formulario real de recuperación de acceso', () => {
    renderAuthPage(<ForgotPasswordPage />);

    expect(screen.getByRole('heading', { name: 'Recuperá tu acceso' })).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toHaveAttribute('type', 'email');
    expect(screen.getByRole('button', { name: 'Enviar instrucciones' })).toBeEnabled();
    expect(screen.queryByText('La recuperación real no se envía en modo demostración.')).not.toBeInTheDocument();
  });
});
