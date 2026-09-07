import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockProvider } from '../app/provider';
import { IncomePage } from '../app/routes/professional/IncomePage';
import { ToastProvider } from '../components/ui/Toast';

describe('Ingresos profesionales', () => {
  it('muestra métricas por moneda, gráfico financiero consolidado y filtros amplios de período', async () => {
    const user = userEvent.setup();

    render(
      <MockProvider>
        <ToastProvider>
          <IncomePage />
        </ToastProvider>
      </MockProvider>
    );

    expect(screen.getByRole('heading', { name: 'Ingresos' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cobros y pendientes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mes actual' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '12 meses' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Personalizado' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cobrado ·/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Pendiente ·/ })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Personalizado' }));

    expect(screen.getByLabelText('Desde')).toBeInTheDocument();
    expect(screen.getByLabelText('Hasta')).toBeInTheDocument();
    expect(screen.queryByLabelText('Moneda del gráfico')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Pendiente ·/ }));
    expect(screen.getByRole('button', { name: /Pendiente ·/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /Cobrado ·/ })).toHaveAttribute('aria-pressed', 'true');
  });
});
