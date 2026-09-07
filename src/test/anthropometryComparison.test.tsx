import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { AnthropometryComparison } from '../components/domain/AnthropometryComparison';

it('compara hasta tres revisiones contra la primera elegida, sin duplicados', async () => {
  const user = userEvent.setup();
  render(<AnthropometryComparison rows={[
    { id: 'a', recorded_on: '2026-08-01', values: { weight: 75 } },
    { id: 'b', recorded_on: '2026-08-10', values: { weight: 73 } },
    { id: 'c', recorded_on: '2026-08-20', values: { weight: 74 } },
  ]} metrics={[{ key: 'weight', label: 'Peso', unit: 'kg' }]} />);
  const selects = screen.getAllByRole('combobox');
  expect(selects).toHaveLength(3);
  await user.selectOptions(selects[0]!, 'b');
  await user.selectOptions(selects[1]!, 'a');
  await user.selectOptions(selects[2]!, 'c');
  const table = within(screen.getByRole('table'));
  expect(table.getByText('+2 kg')).toBeInTheDocument();
  expect(table.getByText('+1 kg')).toBeInTheDocument();
  expect(within(selects[1]!).getByRole('option', { name: /10\/8\/2026/ })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Limpiar comparación' }));
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});
