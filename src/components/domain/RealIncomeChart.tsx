import { incomeMoney } from '../../lib/realIncome';

export function RealIncomeChart({ rows, currency, showPaid, showPending }: {
  rows: { key: string; paid: number; pending: number }[]; currency: string; showPaid: boolean; showPending: boolean;
}) {
  const maximum = Math.max(1, ...rows.flatMap(r => [showPaid ? Math.abs(r.paid) : 0, showPending ? r.pending : 0]));
  const negative = showPaid && rows.some(r => r.paid < 0);
  const monthLabel = (key: string) => new Date(`${key}-15T12:00:00`).toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
  return <div className="space-y-2">
    {/* Keyboard focus permits scrolling the chart without a mouse. */}
    {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Gráfico mensual de ingresos; desplazable horizontalmente">
      <div className="flex py-3">{rows.map(row => <div key={row.key} className="min-w-24 flex-1 text-center text-xs">
        <div className="flex h-32 items-end justify-center gap-2 border-b border-border-hover">
          {showPaid && <div aria-hidden className="w-7 rounded-t bg-brand-primary" style={{ height: `${Math.max(0, row.paid) / maximum * 120}px` }} />}
          {showPending && <div aria-hidden className="w-7 rounded-t bg-semantic-warning-bg border border-semantic-warning/30" style={{ height: `${row.pending / maximum * 120}px` }} />}
        </div>
        {negative && <div className="flex h-32 items-start justify-center gap-2">
          {showPaid && <div aria-hidden className="w-7 rounded-b bg-brand-primary" style={{ height: `${Math.max(0, -row.paid) / maximum * 120}px` }} />}
          {showPending && <div aria-hidden className="w-7" />}
        </div>}
        <p className="mt-2 font-semibold">{monthLabel(row.key)}</p>
        {showPaid && <p className="mt-1">Neto {incomeMoney(row.paid, currency)}</p>}
        {showPending && <p className="text-text-secondary">Pend. {incomeMoney(row.pending, currency)}</p>}
      </div>)}</div>
    </div>
    {negative && <p className="text-xs text-text-secondary">Debajo de la línea de cero: las devoluciones del mes superan los cobros.</p>}
    {!rows.some(r => r.paid || r.pending) && <p className="text-sm text-text-secondary">Sin importes registrados para este período y filtros.</p>}
  </div>;
}
