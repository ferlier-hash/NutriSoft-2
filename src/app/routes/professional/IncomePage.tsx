import { useMemo, useState } from 'react';
import { Banknote, BarChart3, CalendarClock, ChevronRight, CircleDollarSign, Plus, RotateCcw, TrendingUp } from 'lucide-react';
import { useMock } from '../../provider';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { useToast } from '../../../components/ui/Toast';
import type { Appointment, AppointmentCurrency } from '../../../types';

type ChartPeriod = 'current' | '3m' | '6m' | '12m' | 'all' | 'custom';
type CurrencyTotals = Partial<Record<AppointmentCurrency, number>>;
const paymentText = (status: Appointment['paymentStatus']) => ({ paid: 'Pagado', partial: 'Parcial', no_charge: 'Sin cargo', refunded: 'Reembolsado', pending: 'Pendiente' })[status];

const money = (amount: number, currency: AppointmentCurrency = 'ARS') =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);

const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const parseMonth = (value: string) => {
  const [year, month] = value.split('-').map(Number);
  return new Date(year ?? new Date().getFullYear(), (month ?? 1) - 1, 1);
};

const addMonths = (date: Date, amount: number) => new Date(date.getFullYear(), date.getMonth() + amount, 1);

const monthLabel = (key: string) => {
  const date = parseMonth(key);
  return new Intl.DateTimeFormat('es-AR', { month: 'short', year: '2-digit' }).format(date);
};
const localDateValue = (date = new Date()) => { const offset = date.getTimezoneOffset() * 60_000; return new Date(date.getTime() - offset).toISOString().slice(0, 10); };

const monthsBetween = (start: Date, end: Date) => {
  const months: string[] = [];
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (current <= last) {
    months.push(monthKey(current));
    current.setMonth(current.getMonth() + 1);
  }
  return months;
};

const addCurrencyTotal = (totals: CurrencyTotals, currency: AppointmentCurrency, amount: number) => ({
  ...totals,
  [currency]: (totals[currency] ?? 0) + amount,
});

function MoneyStack({ totals, fallbackCurrency }: { totals: CurrencyTotals; fallbackCurrency: AppointmentCurrency }) {
  const entries = (Object.entries(totals) as [AppointmentCurrency, number][])
    .filter(([, amount]) => amount > 0)
    .sort(([a], [b]) => a.localeCompare(b));

  if (entries.length === 0) {
    return <p className="text-2xl font-bold text-text-primary mt-1">{money(0, fallbackCurrency)}</p>;
  }

  return (
    <div className="mt-1 space-y-1">
      {entries.map(([currency, total]) => (
        <p key={currency} className="text-2xl font-bold text-text-primary leading-tight">
          {money(total, currency)}
        </p>
      ))}
    </div>
  );
}

export function IncomePage() {
  const {
    professionalAppointments,
    professionalAppointmentPaymentMovements,
    professionalPatients,
    professionalPracticeSettings,
    recordAppointmentPayment,
    recordAppointmentRefund,
  } = useMock();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [appointmentId, setAppointmentId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'cash' | 'transfer' | 'other'>('transfer');
  const [note, setNote] = useState('');
  const [paidAt, setPaidAt] = useState(localDateValue());
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundMovementId, setRefundMovementId] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundDate, setRefundDate] = useState(localDateValue());
  const [refundNote, setRefundNote] = useState('');
  const [listPatientFilter, setListPatientFilter] = useState('all');
  const [listPaymentFilter, setListPaymentFilter] = useState<'all' | Appointment['paymentStatus']>('all');
  const [listModalityFilter, setListModalityFilter] = useState<'all' | Appointment['modality']>('all');
  const [selectedIncomeAppointment, setSelectedIncomeAppointment] = useState<Appointment | null>(null);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('6m');
  const [customStart, setCustomStart] = useState(monthKey(addMonths(new Date(), -5)));
  const [customEnd, setCustomEnd] = useState(monthKey(new Date()));
  const [showPaid, setShowPaid] = useState(true);
  const [showPending, setShowPending] = useState(true);

  const fallbackCurrency = professionalPracticeSettings?.currency ?? 'ARS';

  const paidByAppointment = useMemo(() => {
    const totals = new Map<string, number>();
    professionalAppointmentPaymentMovements.forEach(movement => {
      totals.set(movement.appointmentId, (totals.get(movement.appointmentId) ?? 0) + ((movement.kind ?? 'payment') === 'refund' ? -movement.amount : movement.amount));
    });
    return totals;
  }, [professionalAppointmentPaymentMovements]);

  const metrics = useMemo(() => {
    let paid: CurrencyTotals = {};
    let pending: CurrencyTotals = {};
    let projected: CurrencyTotals = {};
    let lost: CurrencyTotals = {};
    let partial: CurrencyTotals = {};
    const today = new Date();

    professionalAppointmentPaymentMovements.forEach(movement => {
      paid = addCurrencyTotal(paid, movement.currency, (movement.kind ?? 'payment') === 'refund' ? -movement.amount : movement.amount);
    });

    professionalAppointments.forEach(appointment => {
      const alreadyPaid = paidByAppointment.get(appointment.id) ?? 0;
      const remaining = Math.max(0, appointment.quotedAmount - alreadyPaid);
      if ((appointment.paymentStatus === 'pending' || appointment.paymentStatus === 'partial') && remaining > 0) {
        pending = addCurrencyTotal(pending, appointment.currency, remaining);
      }
      if (appointment.paymentStatus === 'partial' && remaining > 0) partial = addCurrencyTotal(partial, appointment.currency, remaining);
      if (new Date(appointment.startsAt) > today && ['requested', 'confirmed'].includes(appointment.status)) {
        projected = addCurrencyTotal(projected, appointment.currency, appointment.quotedAmount);
      }
      if (['cancelled_by_patient', 'cancelled_by_professional', 'no_show'].includes(appointment.status) && appointment.paymentStatus === 'no_charge') {
        lost = addCurrencyTotal(lost, appointment.currency, appointment.quotedAmount);
      }
    });

    return { paid, pending, projected, lost, partial };
  }, [paidByAppointment, professionalAppointments, professionalAppointmentPaymentMovements]);

  const chartPaidRows = useMemo(() => professionalAppointmentPaymentMovements.map(movement => ({
    id: movement.id,
    amount: (movement.kind ?? 'payment') === 'refund' ? -movement.amount : movement.amount,
    currency: movement.currency,
    month: monthKey(new Date(movement.occurredAt)),
  })), [professionalAppointmentPaymentMovements]);

  const chartPendingRows = useMemo(() => professionalAppointments
    .map(appointment => {
      const alreadyPaid = paidByAppointment.get(appointment.id) ?? 0;
      const remaining = Math.max(0, appointment.quotedAmount - alreadyPaid);
      if (!['pending', 'partial'].includes(appointment.paymentStatus) || remaining === 0) return null;
      return {
        id: appointment.id,
        amount: remaining,
        currency: appointment.currency,
        month: monthKey(new Date(appointment.startsAt)),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null), [paidByAppointment, professionalAppointments]);

  const chartCurrency = fallbackCurrency;

  const chartMonths = useMemo(() => {
    const rowDates = [...chartPaidRows, ...chartPendingRows]
      .filter(row => row.currency === chartCurrency)
      .map(row => parseMonth(row.month));
    const today = new Date();

    if (chartPeriod === 'current') return [monthKey(today)];
    if (chartPeriod === '3m') return monthsBetween(addMonths(today, -2), today);
    if (chartPeriod === '6m') return monthsBetween(addMonths(today, -5), today);
    if (chartPeriod === '12m') return monthsBetween(addMonths(today, -11), today);
    if (chartPeriod === 'custom') {
      const start = parseMonth(customStart <= customEnd ? customStart : customEnd);
      const end = parseMonth(customStart <= customEnd ? customEnd : customStart);
      return monthsBetween(start, end);
    }

    if (rowDates.length === 0) return [monthKey(today)];
    return monthsBetween(new Date(Math.min(...rowDates.map(date => date.getTime()))), new Date(Math.max(...rowDates.map(date => date.getTime()))));
  }, [chartPeriod, chartCurrency, chartPaidRows, chartPendingRows, customEnd, customStart]);

  const chartData = useMemo(() => chartMonths.map(month => {
    const paid = Math.max(0, chartPaidRows
      .filter(row => row.currency === chartCurrency && row.month === month)
      .reduce((sum, row) => sum + row.amount, 0));
    const pending = chartPendingRows
      .filter(row => row.currency === chartCurrency && row.month === month)
      .reduce((sum, row) => sum + row.amount, 0);
    return {
      month,
      label: monthLabel(month),
      paid,
      pending,
      visiblePaid: showPaid ? paid : 0,
      visiblePending: showPending ? pending : 0,
      total: (showPaid ? paid : 0) + (showPending ? pending : 0),
    };
  }), [chartCurrency, chartMonths, chartPaidRows, chartPendingRows, showPaid, showPending]);

  const maxChartTotal = Math.max(1, ...chartData.map(item => item.total));
  const chartHasData = chartData.some(item => item.total > 0);
  const chartTotals = chartData.reduce((totals, item) => ({
    paid: totals.paid + item.visiblePaid,
    pending: totals.pending + item.visiblePending,
  }), { paid: 0, pending: 0 });

  const chargeable = professionalAppointments.filter(item => item.paymentStatus !== 'paid' && item.paymentStatus !== 'no_charge');
  const selectedAppointment = professionalAppointments.find(item => item.id === appointmentId);

  const openPayment = (appointment?: Appointment) => {
    const target = appointment ?? chargeable[0];
    const alreadyPaid = target ? paidByAppointment.get(target.id) ?? 0 : 0;
    const remaining = target ? Math.max(0, target.quotedAmount - alreadyPaid) : 0;
    setAppointmentId(target?.id ?? '');
    setAmount(target ? String(remaining || target.quotedAmount) : '');
    setOpen(true);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      recordAppointmentPayment({ appointmentId, amount: Number(amount), method, note, occurredAt: `${paidAt}T12:00:00` });
      setOpen(false);
      setNote('');
      setPaidAt(localDateValue());
      showToast('Cobro registrado', 'El estado de pago, las métricas y el gráfico se actualizaron sin recargar.');
    } catch (error) {
      showToast('No pudimos registrar el cobro', error instanceof Error ? error.message : 'Reintentá.', 'error');
    }
  };
  const refundableMovements = professionalAppointmentPaymentMovements.filter(movement => {
    if ((movement.kind ?? 'payment') !== 'payment') return false;
    const refunded = professionalAppointmentPaymentMovements.filter(item => item.refundedPaymentMovementId === movement.id).reduce((sum, item) => sum + item.amount, 0);
    return movement.amount > refunded;
  });
  const selectedRefundMovement = refundableMovements.find(item => item.id === refundMovementId);
  const openRefund = (appointment: Appointment) => {
    const target = refundableMovements.find(item => item.appointmentId === appointment.id);
    setRefundMovementId(target?.id ?? ''); setRefundAmount(target ? String(target.amount - professionalAppointmentPaymentMovements.filter(item => item.refundedPaymentMovementId === target.id).reduce((sum, item) => sum + item.amount, 0)) : ''); setRefundDate(localDateValue()); setRefundNote(''); setRefundOpen(true);
  };
  const submitRefund = (event: React.FormEvent) => { event.preventDefault(); try { recordAppointmentRefund({ paymentMovementId: refundMovementId, amount: Number(refundAmount), occurredAt: `${refundDate}T12:00:00`, note: refundNote }); setRefundOpen(false); showToast('Reembolso registrado', 'Los ingresos muestran ahora el importe neto cobrado.'); } catch (error) { showToast('No pudimos registrar el reembolso', error instanceof Error ? error.message : 'Revisá el importe.', 'error'); } };
  const listedAppointments = professionalAppointments.filter(appointment => (listPatientFilter === 'all' || appointment.patientId === listPatientFilter) && (listPaymentFilter === 'all' || appointment.paymentStatus === listPaymentFilter) && (listModalityFilter === 'all' || appointment.modality === listModalityFilter));

  return <div className="p-6 space-y-6 max-w-7xl mx-auto">
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <CircleDollarSign className="w-6 h-6 text-brand-strong" />
          <h1 className="text-2xl font-bold text-text-primary">Ingresos</h1>
        </div>
        <p className="text-sm text-text-secondary mt-1">Registrá cobros manuales de tus citas. NutriSoft no procesa pagos ni emite comprobantes.</p>
      </div>
      <Button onClick={() => openPayment()} disabled={chargeable.length === 0}><Plus className="w-4 h-4" />Registrar cobro</Button>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">{[
      { label: 'Cobrado', value: metrics.paid, icon: TrendingUp, tone: 'text-semantic-success bg-semantic-success-bg' },
      { label: 'Pendiente', value: metrics.pending, icon: CalendarClock, tone: 'text-semantic-warning bg-semantic-warning-bg' },
      { label: 'Proyectado', value: metrics.projected, icon: Banknote, tone: 'text-brand-strong bg-brand-soft' },
      { label: 'No cobrado por cancelación', value: metrics.lost, icon: CircleDollarSign, tone: 'text-semantic-critical bg-semantic-critical-bg' },
      { label: 'Parciales por completar', value: metrics.partial, icon: CalendarClock, tone: 'text-semantic-info bg-semantic-info-bg' },
    ].map(item => {
      const Icon = item.icon;
      return <Card key={item.label}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.tone}`}><Icon className="w-4 h-4" /></div>
        <p className="text-xs text-text-secondary mt-5">{item.label}</p>
        <MoneyStack totals={item.value} fallbackCurrency={fallbackCurrency} />
      </Card>;
    })}</div>

    <Card className="space-y-4 p-5">
      <div className="space-y-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-strong" />
            <h2 className="font-bold text-base text-text-primary">Cobros y pendientes</h2>
          </div>
          <p className="text-xs text-text-secondary mt-1">Cobrado por fecha de pago; pendiente según la fecha de la cita. Moneda configurada: {chartCurrency}.</p>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1" aria-label="Período del gráfico">
          <span className="shrink-0 text-xs font-semibold text-text-secondary px-2">Período</span>
          <div className="flex shrink-0 gap-1 rounded-xl border border-border-subtle bg-surface-subtle p-1">
            {[
              ['current', 'Mes actual'],
              ['3m', '3 meses'],
              ['6m', '6 meses'],
              ['12m', '12 meses'],
              ['all', 'Todo'],
              ['custom', 'Personalizado'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition ${chartPeriod === value ? 'bg-surface text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                onClick={() => setChartPeriod(value as ChartPeriod)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {chartPeriod === 'custom' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
        <div>
          <label className="form-label" htmlFor="income-chart-start">Desde</label>
          <input id="income-chart-start" className="form-control" type="month" value={customStart} onChange={event => setCustomStart(event.target.value)} />
        </div>
        <div>
          <label className="form-label" htmlFor="income-chart-end">Hasta</label>
          <input id="income-chart-end" className="form-control" type="month" value={customEnd} onChange={event => setCustomEnd(event.target.value)} />
        </div>
      </div>}

      {chartHasData ? <div className="space-y-3">
        <div className="overflow-x-auto pb-1">
          <div className="min-w-[480px]">
            <div className="h-52 flex items-end gap-2 border-b border-border-subtle px-1">
              {chartData.map(month => (
                <div key={month.month} className="flex-1 min-w-14 flex flex-col items-center justify-end gap-1.5">
                  <div className="h-40 w-full flex items-end justify-center">
                    <div
                      className="w-9 max-w-full h-full rounded-t-xl bg-surface-subtle border border-border-subtle overflow-hidden flex flex-col justify-end"
                      title={`${month.label}: Cobrado ${money(month.visiblePaid, chartCurrency)}. Pendiente ${money(month.visiblePending, chartCurrency)}.`}
                      aria-label={`${month.label}: Cobrado ${money(month.visiblePaid, chartCurrency)}. Pendiente ${money(month.visiblePending, chartCurrency)}.`}
                    >
                      {month.visiblePending > 0 && <div style={{ height: `${(month.visiblePending / maxChartTotal) * 100}%` }} className="bg-[#F5E8A9]" />}
                      {month.visiblePaid > 0 && <div style={{ height: `${(month.visiblePaid / maxChartTotal) * 100}%` }} className="bg-brand-primary" />}
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-text-secondary capitalize">{month.label}</p>
                    <p className="text-[11px] text-text-tertiary">{month.total > 0 ? money(month.total, chartCurrency) : '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Series del gráfico">
          <button type="button" aria-pressed={showPaid} disabled={showPaid && !showPending} onClick={() => setShowPaid(value => !value)} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong disabled:cursor-not-allowed ${showPaid ? 'border-border-subtle bg-surface text-text-secondary' : 'border-border-subtle bg-surface-subtle text-text-tertiary line-through'}`}>
            <span className="w-2.5 h-2.5 rounded-full bg-brand-primary" />
            Cobrado · {money(chartTotals.paid, chartCurrency)}
          </button>
          <button type="button" aria-pressed={showPending} disabled={showPending && !showPaid} onClick={() => setShowPending(value => !value)} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong disabled:cursor-not-allowed ${showPending ? 'border-border-subtle bg-surface text-text-secondary' : 'border-border-subtle bg-surface-subtle text-text-tertiary line-through'}`}>
            <span className="w-2.5 h-2.5 rounded-full bg-[#F5E8A9]" />
            Pendiente · {money(chartTotals.pending, chartCurrency)}
          </button>
        </div>
      </div> : <div className="rounded-2xl border border-dashed border-border-subtle bg-surface-subtle p-6 text-sm text-text-secondary">
        No hay cobros registrados para este período y moneda. Cuando registres un cobro, el gráfico se actualizará acá.
      </div>}
    </Card>

    <Card className="p-0 overflow-hidden">
      <div className="p-5 border-b border-border-subtle">
        <h2 className="font-bold text-base">Citas y cobros</h2>
        <p className="text-xs text-text-secondary mt-1">Sólo lo registrado se computa como ingreso real, usando la fecha del cobro.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4"><select className="form-control" aria-label="Filtrar citas de ingresos por paciente" value={listPatientFilter} onChange={event => setListPatientFilter(event.target.value)}><option value="all">Todos los pacientes</option>{professionalPatients.map(patient => <option key={patient.id} value={patient.id}>{patient.firstName} {patient.lastName}</option>)}</select><select className="form-control" aria-label="Filtrar citas de ingresos por pago" value={listPaymentFilter} onChange={event => setListPaymentFilter(event.target.value as typeof listPaymentFilter)}><option value="all">Todos los pagos</option>{(['pending', 'partial', 'paid', 'no_charge', 'refunded'] as const).map(value => <option key={value} value={value}>{paymentText(value)}</option>)}</select><select className="form-control" aria-label="Filtrar citas de ingresos por modalidad" value={listModalityFilter} onChange={event => setListModalityFilter(event.target.value as typeof listModalityFilter)}><option value="all">Todas las modalidades</option><option value="virtual">Virtual</option><option value="in_person">Presencial</option></select></div>
      </div>
      <div className="divide-y divide-border-subtle">{listedAppointments.length === 0 ? <p className="p-8 text-center text-sm text-text-secondary">No encontramos citas con estos filtros.</p> : listedAppointments.slice().sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime()).map(appointment => {
        const patient = professionalPatients.find(item => item.id === appointment.patientId);
        const paid = paidByAppointment.get(appointment.id) ?? 0;
        const date = new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(new Date(appointment.startsAt));
        return <button key={appointment.id} type="button" onClick={() => setSelectedIncomeAppointment(appointment)} aria-label={`Abrir cobros de ${patient?.firstName ?? 'Paciente'} ${patient?.lastName ?? ''}`} className="w-full p-4 flex flex-col md:flex-row md:items-center gap-3 text-left hover:bg-surface-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-strong">
          <div className="flex-1">
            <p className="font-bold text-sm text-text-primary">{patient?.firstName} {patient?.lastName}</p>
            <p className="text-xs text-text-secondary mt-1">{date} · {appointment.modality === 'virtual' ? 'Virtual' : 'Presencial'}</p>
          </div>
          <div className="text-sm md:text-right">
            <p className="font-semibold text-text-primary">{money(paid, appointment.currency)} <span className="font-normal text-text-tertiary">de {money(appointment.quotedAmount, appointment.currency)}</span></p>
            <Badge variant={appointment.paymentStatus === 'paid' ? 'active' : appointment.paymentStatus === 'partial' ? 'info' : appointment.paymentStatus === 'no_charge' || appointment.paymentStatus === 'refunded' ? 'neutral' : 'pending'}>{appointment.paymentStatus === 'paid' ? 'Pagado' : appointment.paymentStatus === 'partial' ? 'Pago parcial' : appointment.paymentStatus === 'no_charge' ? 'Sin cargo' : appointment.paymentStatus === 'refunded' ? 'Reembolsado' : 'Pendiente'}</Badge>
          </div>
          <span aria-hidden="true" className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border-subtle bg-surface text-brand-strong"><ChevronRight className="w-4 h-4" /></span>
        </button>;
      })}</div>
    </Card>

    <Dialog isOpen={open} onClose={() => setOpen(false)} title="Registrar cobro" description="El registro es interno. No procesa el pago ni genera facturación fiscal.">
      <form className="space-y-4" onSubmit={submit}>
        <div>
          <label className="form-label" htmlFor="income-appointment">Cita</label>
          <select
            id="income-appointment"
            className="form-control"
            required
            value={appointmentId}
            onChange={event => {
              const nextAppointment = professionalAppointments.find(item => item.id === event.target.value);
              const alreadyPaid = nextAppointment ? paidByAppointment.get(nextAppointment.id) ?? 0 : 0;
              setAppointmentId(event.target.value);
              setAmount(nextAppointment ? String(Math.max(0, nextAppointment.quotedAmount - alreadyPaid) || nextAppointment.quotedAmount) : '');
            }}
          >
            {chargeable.map(item => {
              const patient = professionalPatients.find(person => person.id === item.patientId);
              return <option key={item.id} value={item.id}>{patient?.firstName} {patient?.lastName} · {money(item.quotedAmount, item.currency)}</option>;
            })}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label" htmlFor="income-amount">Monto ({selectedAppointment?.currency ?? fallbackCurrency})</label>
            <input id="income-amount" className="form-control" min="1" required type="number" value={amount} onChange={event => setAmount(event.target.value)} />
          </div>
          <div>
            <label className="form-label" htmlFor="income-method">Medio</label>
            <select id="income-method" className="form-control" value={method} onChange={event => setMethod(event.target.value as typeof method)}><option value="transfer">Transferencia</option><option value="cash">Efectivo</option><option value="other">Otro</option></select>
          </div>
        </div>
        <div><label className="form-label" htmlFor="income-paid-at">Fecha de cobro</label><input id="income-paid-at" className="form-control" type="date" max={localDateValue()} value={paidAt} onChange={event => setPaidAt(event.target.value)} required /></div>
        <div>
          <label className="form-label" htmlFor="income-note">Nota opcional</label>
          <textarea id="income-note" className="form-control resize-y" maxLength={500} rows={3} value={note} onChange={event => setNote(event.target.value)} placeholder="Ej. Abonó una parte en efectivo" />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button type="submit">Registrar cobro</Button>
        </div>
      </form>
    </Dialog>
    <Dialog isOpen={refundOpen} onClose={() => setRefundOpen(false)} title="Registrar reembolso" description="No procesa una devolución: sólo registra el ajuste para calcular el ingreso neto."><form className="space-y-4" onSubmit={submitRefund}><div><label className="form-label" htmlFor="refund-payment">Cobro original</label><select id="refund-payment" className="form-control" required value={refundMovementId} onChange={event => { const movement = refundableMovements.find(item => item.id === event.target.value); const alreadyRefunded = movement ? professionalAppointmentPaymentMovements.filter(item => item.refundedPaymentMovementId === movement.id).reduce((sum, item) => sum + item.amount, 0) : 0; setRefundMovementId(event.target.value); setRefundAmount(movement ? String(movement.amount - alreadyRefunded) : ''); }}>{refundableMovements.map(movement => { const patient = professionalPatients.find(person => person.id === professionalAppointments.find(appointment => appointment.id === movement.appointmentId)?.patientId); return <option key={movement.id} value={movement.id}>{patient?.firstName} {patient?.lastName} · {money(movement.amount, movement.currency)}</option>; })}</select></div><div className="grid grid-cols-2 gap-3"><div><label className="form-label" htmlFor="refund-amount">Monto ({selectedRefundMovement?.currency ?? fallbackCurrency})</label><input id="refund-amount" className="form-control" type="number" min="1" max={selectedRefundMovement?.amount} value={refundAmount} onChange={event => setRefundAmount(event.target.value)} required /></div><div><label className="form-label" htmlFor="refund-date">Fecha</label><input id="refund-date" className="form-control" type="date" max={localDateValue()} value={refundDate} onChange={event => setRefundDate(event.target.value)} required /></div></div><div><label className="form-label" htmlFor="refund-note">Nota opcional</label><textarea id="refund-note" className="form-control resize-y" rows={3} maxLength={500} value={refundNote} onChange={event => setRefundNote(event.target.value)} /></div><div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setRefundOpen(false)}>Cancelar</Button><Button type="submit">Registrar reembolso</Button></div></form></Dialog>
    <Dialog isOpen={Boolean(selectedIncomeAppointment)} onClose={() => setSelectedIncomeAppointment(null)} title={selectedIncomeAppointment ? `${professionalPatients.find(patient => patient.id === selectedIncomeAppointment.patientId)?.firstName ?? 'Paciente'} · cobros` : 'Cobros'} description="Registrá o consultá los movimientos de esta cita sin cambiar su estado operativo.">{selectedIncomeAppointment && <div className="space-y-4"><div className="rounded-2xl border border-border-subtle bg-surface-subtle p-4"><p className="text-xs text-text-secondary">Importe de la cita</p><p className="mt-1 text-xl font-bold text-text-primary">{money(selectedIncomeAppointment.quotedAmount, selectedIncomeAppointment.currency)}</p><div className="mt-3 flex flex-wrap gap-2"><Badge variant={selectedIncomeAppointment.paymentStatus === 'paid' ? 'active' : selectedIncomeAppointment.paymentStatus === 'partial' ? 'info' : selectedIncomeAppointment.paymentStatus === 'no_charge' || selectedIncomeAppointment.paymentStatus === 'refunded' ? 'neutral' : 'pending'}>{paymentText(selectedIncomeAppointment.paymentStatus)}</Badge><span className="text-xs text-text-secondary">Cobrado neto: {money(Math.max(0, paidByAppointment.get(selectedIncomeAppointment.id) ?? 0), selectedIncomeAppointment.currency)}</span></div></div><div className="flex flex-wrap justify-end gap-2">{selectedIncomeAppointment.paymentStatus !== 'paid' && selectedIncomeAppointment.paymentStatus !== 'no_charge' && <Button type="button" onClick={() => { setSelectedIncomeAppointment(null); openPayment(selectedIncomeAppointment); }}><Plus className="w-4 h-4" />Registrar cobro</Button>}{(paidByAppointment.get(selectedIncomeAppointment.id) ?? 0) > 0 && <Button type="button" variant="secondary" onClick={() => { setSelectedIncomeAppointment(null); openRefund(selectedIncomeAppointment); }}><RotateCcw className="w-4 h-4" />Registrar reembolso</Button>}</div></div>}</Dialog>
  </div>;
}
