import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '../auth/AuthProvider';
import { LoginPage } from '../app/routes/auth/LoginPage';
import { ForgotPasswordPage } from '../app/routes/auth/ForgotPasswordPage';

function renderAuthPage(page: React.ReactNode) {
  return render(
    <AuthProvider>
      <MemoryRouter>{page}</MemoryRouter>
    </AuthProvider>,
  );
}

describe('pantallas de autenticación en modo demostración', () => {
  it('no presenta un formulario real ni oculta que los datos son ficticios', () => {
    renderAuthPage(<LoginPage />);
    expect(screen.getByRole('heading', { name: 'Modo demostración activo' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a la demostración' })).toHaveAttribute('href', '/professional');
  });

  it('no simula el envío de recuperación de contraseña', () => {
    renderAuthPage(<ForgotPasswordPage />);
    expect(screen.getByText('La recuperación real no se envía en modo demostración.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviar instrucciones' })).not.toBeInTheDocument();
  });
});
