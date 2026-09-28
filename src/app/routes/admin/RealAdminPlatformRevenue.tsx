import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { History, Plus, RefreshCw } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import type { AdminPlatformBillingCycle, AdminPlatformReceipt, AdminPlatformRevenueRow, BillingFrequency, CommercialPlan } from '../../../data/admin-platform-revenue.types';
import { extendAdminPlatformBillingDueDate, loadAdminPlatformBilling, loadAdminPlatformReceipts, loadAdminPlatformRevenue, recordAdminCommercialReceipt, setAdminCommercialTerm, voidAdminCommercialReceipt } from '../../../data/supabase/admin-platform-revenue.repository';

const PAGE_SIZE = 25;
const CURRENCIES = ['ARS','USD','CLP','BRL','MXN','COP','PEN','UYU','EUR'];
type DataState = { status: 'loading' } | { status: 'error' } | { status: 'success'; organizations: AdminPlatformRevenueRow[]; receipts: AdminPlatformReceipt[]; totalReceipts: number; billing: AdminPlatformBillingCycle[] };
type ActionState = { type: 'term'; organization: AdminPlatformRevenueRow } | { type: 'receipt'; organization: AdminPlatformRevenueRow; suggestedAmount?: number } | { type: 'extension'; cycle: AdminPlatformBillingCycle } | null;

export function RealAdminPlatformRevenue({ from, to }: { from: string; to: string }) {
  const [state, setState] = useState<DataState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [offset, setOffset] = useState(0);
  const [action, setAction] = useState<ActionState>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [receiptPeriodStart, setReceiptPeriodStart] = useState('');
  const [receiptRequestId, setReceiptRequestId] = useState('');
  const [extensionDate, setExtensionDate] = useState('');
  const exclusiveTo = useMemo(() => addDays(to, 1), [to]);

  useEffect(() => {
    let current = true;
    setState({ status: 'loading' });
    void Promise.all([
      loadAdminPlatformRevenue(from, exclusiveTo),
      loadAdminPlatformReceipts(from, exclusiveTo, PAGE_SIZE, offset),
      loadAdminPlatformBilling(from, exclusiveTo),
    ]).then(([organizations, receipts, billing]) => current && setState({ status: 'success', organizations, receipts: receipts.rows, totalReceipts: receipts.totalCount, billing }))
      .catch(() => current && setState({ status: 'error' }));
    return () => { current = false; };
  }, [attempt, exclusiveTo, from, offset]);

  const visibleOrganizations = useMemo(() => {
    const value = query.trim().toLocaleLowerCase('es-AR');
    if (state.status !== 'success') return [];
    return state.organizations.filter(item => !value || `${item.organizationName} ${item.organizationSlug}`.toLocaleLowerCase('es-AR').includes(value));
  }, [query, state]);
  const platformTotals = useMemo(() => {
    if (state.status !== 'success') return [];
    const totals = new Map<string, { currency: string; amount: number; receipts: number }>();
    for (const item of state.organizations.flatMap(row => row.receivedByCurrency)) {
      const prior = totals.get(item.currency);
      totals.set(item.currency,{currency:item.currency,amount:(prior?.amount??0)+item.amount,receipts:(prior?.receipts??0)+item.receiptCount});
    }
    return [...totals.values()].sort((a,b)=>a.currency.localeCompare(b.currency));
  },[state]);

  const refresh = () => { setAction(null); setError(''); setSaving(false); setAttempt(value => value + 1); };
  const saveTerm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (action?.type !== 'term') return;
    const data = new FormData(event.currentTarget);
    setSaving(true); setError('');
    try {
      await setAdminCommercialTerm({ organizationId: action.organization.organizationId, plan: data.get('plan') as CommercialPlan, frequency: data.get('frequency') as BillingFrequency, amount: Number(data.get('amount')), currency: String(data.get('currency')), effectiveFrom: String(data.get('effectiveFrom')) });
      refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudo guardar la tarifa.'); setSaving(false); }
  };
  const saveReceipt = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (action?.type !== 'receipt' || !action.organization.termId) return;
    const data = new FormData(event.currentTarget);
    const frequency = action.organization.billingFrequency ?? 'monthly';
    const periodStart = String(data.get('periodStart'));
    setSaving(true); setError('');
    try {
      await recordAdminCommercialReceipt({ organizationId: action.organization.organizationId, termId: action.organization.termId, requestId: receiptRequestId, amount: Number(data.get('amount')), currency: action.organization.termCurrency ?? 'ARS', receivedOn: String(data.get('receivedOn')), periodStart, periodEnd: periodEndFor(periodStart, frequency, action.organization.effectiveFrom ?? periodStart) });
      refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudo registrar el cobro.'); setSaving(false); }
  };
  const saveExtension = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (action?.type !== 'extension') return;
    const data = new FormData(event.currentTarget);
    setSaving(true); setError('');
    try { await extendAdminPlatformBillingDueDate(action.cycle.termId, action.cycle.periodStart, String(data.get('newDueDate'))); refresh(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudo otorgar la prórroga.'); setSaving(false); }
  };
  const openCycleReceipt = (cycle: AdminPlatformBillingCycle) => {
    if (state.status !== 'success') return;
    const organization = state.organizations.find(item => item.organizationId === cycle.organizationId);
    if (!organization?.termId) return;
    setError(''); setReceiptPeriodStart(cycle.periodStart); setReceiptRequestId(crypto.randomUUID());
    setAction({ type: 'receipt', organization, suggestedAmount: cycle.balance });
  };
  const voidReceipt = async (receipt: AdminPlatformReceipt) => {
    if (receipt.status !== 'received' || !window.confirm(`¿Anular el registro de ${formatCurrency(receipt.amount, receipt.currency)} de ${receipt.organizationName}? El registro quedará visible como anulado.`)) return;
    setError('');
    try { await voidAdminCommercialReceipt(receipt.receiptId); setAttempt(value => value + 1); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudo anular el registro.'); }
  };

  return <section aria-label="Ingresos de Nutrify" className="space-y-4 rounded-2xl border border-border-subtle bg-surface p-4 shadow-sm sm:p-5">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-strong">Finanzas de plataforma · registro manual</p><h3 className="mt-1 text-xl font-bold text-text-primary">Ingresos de Nutrify</h3><p className="mt-1 max-w-4xl text-xs leading-5 text-text-secondary">Administrá la tarifa negociada con cada consultorio y registrá los cobros recibidos. No procesa pagos ni genera facturas. Está separado de los ingresos que cada profesional registra por sus pacientes.</p></div>
      <label className="text-xs font-semibold text-text-secondary">Buscar consultorio<input aria-label="Buscar consultorio en ingresos de Nutrify" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nombre o identificador" className="mt-1 min-h-10 w-full rounded-xl border border-border-subtle bg-surface px-3 text-sm font-normal text-text-primary sm:w-64" /></label>
    </header>
    {error && <p role="alert" className="rounded-xl border border-[#F8C4C1] bg-[#FCEBEA] p-3 text-sm text-[#902A24]">{error}</p>}
    {state.status === 'loading' && <p role="status" className="p-4 text-sm text-text-secondary">Cargando acuerdos y cobros…</p>}
    {state.status === 'error' && <div role="alert" className="rounded-xl border border-[#F8C4C1] bg-[#FCEBEA] p-4"><p className="text-sm text-[#902A24]">No pudimos cargar los ingresos de plataforma.</p><Button type="button" variant="secondary" className="mt-3 gap-2" onClick={() => setAttempt(value => value + 1)}><RefreshCw className="h-4 w-4" aria-hidden="true" /> Reintentar</Button></div>}
    {state.status === 'success' && <>
      <section aria-label="Totales de cobros de Nutrify por moneda" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{platformTotals.length?platformTotals.map(total=><article key={total.currency} className="rounded-xl border border-border-subtle bg-surface-subtle p-4"><p className="text-xs text-text-secondary">Recibido · {total.currency}</p><p className="mt-1 text-2xl font-bold text-text-primary">{formatCurrency(total.amount,total.currency)}</p><p className="mt-1 text-[11px] text-text-tertiary">{total.receipts} cobros en el período</p></article>):<p className="rounded-xl border border-border-subtle bg-surface-subtle p-4 text-sm text-text-secondary">Sin cobros de Nutrify en el período seleccionado.</p>}</section>
      <div className="overflow-x-auto rounded-xl border border-border-subtle">
        <table className="w-full min-w-[960px] border-collapse text-left text-xs">
          <thead className="bg-surface-subtle"><tr className="text-[10px] uppercase tracking-wide text-text-secondary"><th scope="col" className="table-cell-admin">Consultorio</th><th scope="col" className="table-cell-admin">Plan actual</th><th scope="col" className="table-cell-admin">Tarifa acordada</th><th scope="col" className="table-cell-admin">Cobrado en el período</th><th scope="col" className="table-cell-admin">Acciones</th></tr></thead>
          <tbody className="divide-y divide-border-subtle">
            {visibleOrganizations.map(row => {
              const scheduled = Boolean(row.effectiveFrom && row.effectiveFrom > todayDate());
              return <tr key={row.organizationId} className="align-top">
                <th scope="row" className="table-cell-admin"><span className="font-semibold text-text-primary">{row.organizationName}</span><span className="mt-1 block text-[10px] font-normal text-text-tertiary">{row.organizationSlug}</span></th>
                <td className="table-cell-admin">{row.currentPlan?.toUpperCase() ?? 'Sin plan'}</td>
                <td className="table-cell-admin">
                  {row.termAmount === null || !row.termCurrency ? <span className="text-text-tertiary">Tarifa pendiente</span> : <><span className="font-semibold text-text-primary">{formatCurrency(row.termAmount,row.termCurrency)}</span><span className="block mt-1 text-text-secondary">/{row.billingFrequency === 'yearly' ? 'año' : 'mes'} · {row.termPlan?.toUpperCase()}</span><span className="block mt-1 text-[10px] text-text-tertiary">{scheduled ? 'Programada desde' : 'Vigente desde'} {formatDate(row.effectiveFrom)}</span></>}
                  {row.termHistory.length > 0 && <details className="mt-2"><summary className="flex cursor-pointer list-none items-center gap-1 text-[10px] font-semibold text-brand-strong"><History className="h-3.5 w-3.5" aria-hidden="true" /> Historial ({row.termHistory.length})</summary><ul className="mt-2 space-y-1.5">{row.termHistory.map(term => { const future = term.effectiveFrom > todayDate(); const status = term.cancelledAt ? `cancelada ${formatDate(term.cancelledAt.slice(0,10))}` : term.effectiveTo ? formatDate(term.effectiveTo) : future ? 'programada' : 'vigente'; return <li key={term.termId} className="rounded-lg bg-surface-subtle p-2">{formatCurrency(term.amount,term.currency)} / {term.billingFrequency === 'yearly' ? 'año' : 'mes'} · {term.plan.toUpperCase()}<span className="block text-[10px] text-text-tertiary">Desde {formatDate(term.effectiveFrom)} · {status}</span></li>; })}</ul></details>}
                </td>
                <td className="table-cell-admin">{row.receivedByCurrency.length ? row.receivedByCurrency.map(item => <p key={item.currency} className="whitespace-nowrap font-semibold">{formatCurrency(item.amount,item.currency)} <span className="font-normal text-text-tertiary">({item.receiptCount})</span></p>) : <span className="text-text-tertiary">Sin cobros registrados</span>}</td>
                <td className="table-cell-admin"><div className="flex flex-col items-start gap-2"><Button type="button" variant="secondary" size="sm" onClick={() => { setError(''); setAction({ type: 'term', organization: row }); }}>Configurar tarifa</Button><Button type="button" variant="outline" size="sm" disabled={!row.termId || scheduled} onClick={() => { setError(''); setReceiptPeriodStart(defaultReceiptStart(row)); setReceiptRequestId(crypto.randomUUID()); setAction({ type: 'receipt', organization: row }); }}><Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> {scheduled ? 'Cobro disponible al iniciar vigencia' : 'Registrar cobro'}</Button></div></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
      {visibleOrganizations.length === 0 && <p className="p-4 text-center text-sm text-text-secondary">No hay consultorios que coincidan con la búsqueda.</p>}
      <section aria-label="Facturación y vencimientos comerciales" className="space-y-4 rounded-2xl border border-border-subtle bg-surface p-4 sm:p-5">
        <header><p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-strong">Ciclos completos · gestión manual</p><h3 className="mt-1 text-lg font-bold text-text-primary">Facturación y vencimientos</h3><p className="mt-1 text-xs leading-5 text-text-secondary">Control interno de importes acordados. El vencimiento base es el inicio del ciclo; podés otorgar una prórroga por ciclo. No emite facturas fiscales ni procesa pagos. Períodos: {from} – {to}.</p></header>
        {(() => {
          const billing = state.billing.filter(cycle => !query.trim() || `${cycle.organizationName} ${cycle.organizationSlug}`.toLocaleLowerCase('es-AR').includes(query.trim().toLocaleLowerCase('es-AR')));
          const overdueCount = billing.filter(cycle => cycle.dueStatus === 'overdue' && cycle.balance > 0).length;
          const graceCount = billing.filter(cycle => cycle.dueStatus === 'grace' && cycle.balance > 0).length;
          const openCount = billing.filter(cycle => cycle.paymentStatus !== 'paid').length;
          return <>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <article className="rounded-xl border border-border-subtle bg-surface-subtle p-3"><p className="text-xs text-text-secondary">Ciclos del período</p><p className="mt-1 text-2xl font-bold">{billing.length}</p></article>
              <article className="rounded-xl border border-border-subtle bg-surface-subtle p-3"><p className="text-xs text-text-secondary">Saldos abiertos</p><p className="mt-1 text-2xl font-bold">{openCount}</p></article>
              <article className="rounded-xl border border-border-subtle bg-surface-subtle p-3"><p className="text-xs text-text-secondary">En prórroga manual</p><p className="mt-1 text-2xl font-bold">{graceCount}</p></article>
              <article className="rounded-xl border border-border-subtle bg-surface-subtle p-3"><p className="text-xs text-text-secondary">Vencidos</p><p className="mt-1 text-2xl font-bold">{overdueCount}</p></article>
            </div>
            <div className="max-h-[32rem] overflow-auto rounded-xl border border-border-subtle">
              <table className="w-full min-w-[1020px] text-left text-xs"><thead className="sticky top-0 bg-surface-subtle"><tr className="text-[10px] uppercase tracking-wide text-text-secondary"><th scope="col" className="table-cell-admin">Consultorio</th><th scope="col" className="table-cell-admin">Ciclo</th><th scope="col" className="table-cell-admin">Vencimiento</th><th scope="col" className="table-cell-admin">Esperado</th><th scope="col" className="table-cell-admin">Recibido</th><th scope="col" className="table-cell-admin">Saldo</th><th scope="col" className="table-cell-admin">Estado</th><th scope="col" className="table-cell-admin">Acciones</th></tr></thead>
                <tbody className="divide-y divide-border-subtle">{billing.map(cycle => {
                  const status = billingStatusLabel(cycle);
                  return <tr key={`${cycle.termId}-${cycle.periodStart}`}>
                    <th scope="row" className="table-cell-admin"><span className="font-semibold">{cycle.organizationName}</span><span className="mt-1 block text-[10px] text-text-tertiary">{cycle.plan.toUpperCase()} · {cycle.frequency === 'yearly' ? 'anual' : 'mensual'}</span></th>
                    <td className="table-cell-admin whitespace-nowrap">{formatDate(cycle.periodStart)} – {formatDate(cycle.periodEnd)}</td>
                    <td className="table-cell-admin whitespace-nowrap">{formatDate(cycle.dueDate)}{cycle.extensionCount > 0 && <span className="block text-[10px] text-text-tertiary">{cycle.extensionCount} prórroga{cycle.extensionCount === 1 ? '' : 's'} · última por Platform Admin: {formatTimestamp(cycle.latestExtensionAt)}</span>}</td>
                    <td className="table-cell-admin whitespace-nowrap font-semibold">{formatCurrency(cycle.expectedAmount,cycle.currency)}</td>
                    <td className="table-cell-admin whitespace-nowrap">{formatCurrency(cycle.receivedAmount,cycle.currency)}</td>
                    <td className="table-cell-admin whitespace-nowrap font-semibold">{formatCurrency(cycle.balance,cycle.currency)}</td>
                    <td className="table-cell-admin"><span className={cycle.dueStatus === 'overdue' ? 'font-semibold text-semantic-critical' : cycle.dueStatus === 'grace' ? 'font-semibold text-semantic-warning' : 'font-medium text-text-primary'}>{status}</span></td>
                    <td className="table-cell-admin"><div className="flex gap-2">{cycle.balance > 0 && <Button type="button" variant="secondary" size="sm" onClick={() => openCycleReceipt(cycle)}>Registrar cobro</Button>}{cycle.balance > 0 && <Button type="button" variant="outline" size="sm" onClick={() => { setError(''); setExtensionDate(''); setAction({ type: 'extension', cycle }); }}>Dar prórroga</Button>}</div></td>
                  </tr>;
                })}</tbody>
              </table>
              {billing.length === 0 && <p className="p-4 text-center text-sm text-text-secondary">No hay ciclos comerciales en este período para los consultorios filtrados.</p>}
            </div>
          </>;
        })()}
      </section>
      <div className="flex flex-col gap-2 border-t border-border-subtle pt-4 sm:flex-row sm:items-center sm:justify-between"><h4 className="font-semibold text-text-primary">Cobros recibidos de la plataforma</h4><p className="text-[11px] text-text-secondary">{from} – {to} · {state.totalReceipts.toLocaleString('es-AR')} movimientos</p></div>
      <div className="overflow-x-auto rounded-xl border border-border-subtle"><table className="w-full min-w-[740px] text-left text-xs"><thead className="bg-surface-subtle"><tr className="text-[10px] uppercase tracking-wide text-text-secondary"><th className="table-cell-admin">Fecha recibida</th><th className="table-cell-admin">Consultorio</th><th className="table-cell-admin">Período cubierto</th><th className="table-cell-admin">Importe</th><th className="table-cell-admin">Estado</th><th className="table-cell-admin">Acción</th></tr></thead><tbody className="divide-y divide-border-subtle">{state.receipts.map(receipt => <tr key={receipt.receiptId}><td className="table-cell-admin">{formatDate(receipt.receivedOn)}</td><th scope="row" className="table-cell-admin font-semibold">{receipt.organizationName}</th><td className="table-cell-admin">{formatDate(receipt.periodStart)} – {formatDate(receipt.periodEnd)}</td><td className="table-cell-admin font-semibold">{formatCurrency(receipt.amount,receipt.currency)}</td><td className="table-cell-admin">{receipt.status === 'received' ? 'Recibido' : 'Anulado'}</td><td className="table-cell-admin">{receipt.status === 'received' && <Button type="button" variant="ghost" size="sm" onClick={() => voidReceipt(receipt)}>Anular</Button>}</td></tr>)}</tbody></table>{state.receipts.length===0 && <p className="p-4 text-center text-sm text-text-secondary">No hay cobros registrados en este período.</p>}</div>
      <div className="flex items-center justify-between"><p className="text-[11px] text-text-tertiary">Mostrando {state.receipts.length ? offset+1 : 0}–{offset+state.receipts.length} de {state.totalReceipts}</p><div className="flex gap-2"><Button type="button" variant="secondary" disabled={offset===0} onClick={() => setOffset(value => Math.max(0,value-PAGE_SIZE))}>Anterior</Button><Button type="button" variant="secondary" disabled={offset+state.receipts.length>=state.totalReceipts} onClick={() => setOffset(value => value+PAGE_SIZE)}>Siguiente</Button></div></div>
    </>}

    <Dialog isOpen={action?.type==='term'} onClose={() => !saving && setAction(null)} title="Configurar tarifa acordada" description="El cambio crea una nueva versión; las tarifas anteriores permanecen en el historial.">
      {action?.type==='term' && <form onSubmit={saveTerm} className="space-y-4">
        <p className="rounded-xl bg-surface-subtle p-3 text-xs text-text-secondary">{action.organization.organizationName}. No se cobra automáticamente ni se convierte moneda.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold">Plan<select name="plan" defaultValue={action.organization.currentPlan ?? 'pro'} className={inputClass}><option value="pro">PRO</option><option value="ultra">ULTRA</option><option value="custom">CUSTOM</option></select></label>
          <label className="text-xs font-semibold">Frecuencia<select name="frequency" defaultValue={action.organization.billingFrequency ?? 'monthly'} className={inputClass}><option value="monthly">Mensual</option><option value="yearly">Anual</option></select></label>
          <label className="text-xs font-semibold">Importe acordado<input name="amount" type="number" min="0" max="9999999999.99" step="0.01" defaultValue={action.organization.termAmount ?? ''} required className={inputClass} /></label>
          <label className="text-xs font-semibold">Moneda<select name="currency" defaultValue={action.organization.termCurrency ?? 'ARS'} className={inputClass}>{CURRENCIES.map(currency=><option key={currency} value={currency}>{currency}</option>)}</select></label>
          <label className="text-xs font-semibold sm:col-span-2">Vigente desde<input name="effectiveFrom" type="date" defaultValue={defaultEffectiveFrom(action.organization)} required className={inputClass} /><span className="mt-1 block font-normal text-text-tertiary">Podés elegir cualquier fecha. El ciclo mensual se cuenta desde ese día y se cobra completo (por ejemplo, del 15 al 14). Los días 29–31 se ajustan al último día de los meses más cortos.</span></label>
        </div>
        <p className="text-[11px] text-text-secondary">Las versiones anteriores y las programaciones reemplazadas quedan en el historial. Las fechas no pueden superponerse con períodos ya cobrados.</p>
        {error && <p role="alert" className="text-sm text-semantic-critical">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" disabled={saving} onClick={()=>setAction(null)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving?'Guardando…':'Guardar tarifa'}</Button></div>
      </form>}
    </Dialog>
    <Dialog isOpen={action?.type==='receipt'} onClose={() => !saving && setAction(null)} title="Registrar cobro recibido" description="Registro manual de dinero ya recibido por Nutrify. No inicia ningún pago.">
      {action?.type==='receipt' && <form onSubmit={saveReceipt} className="space-y-4"><p className="rounded-xl bg-surface-subtle p-3 text-xs text-text-secondary">{action.organization.organizationName} · tarifa {formatCurrency(action.organization.termAmount ?? 0, action.organization.termCurrency ?? 'ARS')} / {action.organization.billingFrequency==='yearly'?'año':'mes'}. El ciclo completo se cuenta desde el inicio de la tarifa; podés registrar un cobro parcial.</p><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="text-xs font-semibold sm:col-span-2">Fecha de recepción<input name="receivedOn" type="date" max={todayDate()} defaultValue={todayDate()} required className={inputClass} /></label><label className="text-xs font-semibold">Período desde<input name="periodStart" type="date" min={action.organization.effectiveFrom ?? undefined} value={receiptPeriodStart} onChange={event=>setReceiptPeriodStart(event.target.value)} required className={inputClass} /></label><label className="text-xs font-semibold">Período hasta<input aria-label="Período hasta (calculado)" readOnly value={receiptPeriodStart?periodEndFor(receiptPeriodStart,action.organization.billingFrequency ?? 'monthly',action.organization.effectiveFrom ?? receiptPeriodStart):''} className={inputClass} /></label><label className="text-xs font-semibold">Importe recibido<input name="amount" type="number" min="0.01" max="9999999999.99" step="0.01" defaultValue={action.suggestedAmount ?? action.organization.termAmount ?? ''} required className={inputClass} /></label><label className="text-xs font-semibold">Moneda<input aria-label="Moneda de cobro" readOnly value={action.organization.termCurrency ?? 'ARS'} className={inputClass} /></label></div>{error && <p role="alert" className="text-sm text-semantic-critical">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="secondary" disabled={saving} onClick={()=>setAction(null)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving?'Registrando…':'Registrar cobro'}</Button></div></form>}
    </Dialog>
    <Dialog isOpen={action?.type==='extension'} onClose={() => !saving && setAction(null)} title="Otorgar prórroga manual" description="La nueva fecha se aplica sólo a este ciclo y queda en el historial.">
      {action?.type==='extension' && <form onSubmit={saveExtension} className="space-y-4">
        <p className="rounded-xl bg-surface-subtle p-3 text-xs text-text-secondary">{action.cycle.organizationName} · ciclo {formatDate(action.cycle.periodStart)} – {formatDate(action.cycle.periodEnd)} · vencimiento actual {formatDate(action.cycle.dueDate)}. La prórroga no altera ciclos futuros.</p>
        <label className="text-xs font-semibold">Nueva fecha límite<input name="newDueDate" type="date" min={laterDate(todayDate(), addDays(action.cycle.dueDate, 1))} value={extensionDate} onChange={event=>setExtensionDate(event.target.value)} required className={inputClass} /></label>
        <p className="text-[11px] text-text-secondary">El cambio quedará auditado con fecha y hora y el actor Platform Admin.</p>
        {error && <p role="alert" className="text-sm text-semantic-critical">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" disabled={saving} onClick={()=>setAction(null)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving?'Guardando…':'Confirmar prórroga'}</Button></div>
      </form>}
    </Dialog>
  </section>;
}

const inputClass = 'mt-1 min-h-10 w-full rounded-xl border border-border-subtle bg-surface px-3 text-sm font-normal text-text-primary';
function formatCurrency(amount: number,currency: string) { try { return new Intl.NumberFormat('es-AR',{style:'currency',currency,maximumFractionDigits:2}).format(amount); } catch { return `${amount.toLocaleString('es-AR')} ${currency}`; } }
function formatDate(value: string | null) { if (!value) return '—'; return new Intl.DateTimeFormat('es-AR',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'UTC'}).format(new Date(`${value.slice(0,10)}T00:00:00Z`)); }
function formatTimestamp(value: string | null) { if (!value) return '—'; return new Intl.DateTimeFormat('es-AR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'America/Argentina/Cordoba'}).format(new Date(value)); }
function todayDate() { return new Date().toISOString().slice(0,10); }
function addDays(value: string,days:number) { const date=new Date(`${value}T00:00:00Z`); date.setUTCDate(date.getUTCDate()+days); return date.toISOString().slice(0,10); }
function laterDate(a:string,b:string) { return a>b?a:b; }
function billingStatusLabel(cycle:AdminPlatformBillingCycle) { if (cycle.paymentStatus==='paid') return 'Pagado'; const prefix=cycle.paymentStatus==='partial'?'Parcial · ':''; return `${prefix}${({grace:'En gracia',overdue:'Vencido',due_today:'Vence hoy',upcoming:'Pendiente',settled:'Pagado'} as const)[cycle.dueStatus]}`; }
function defaultEffectiveFrom(row:AdminPlatformRevenueRow) { return row.effectiveFrom && row.effectiveFrom > todayDate() ? row.effectiveFrom : todayDate(); }
function cycleStart(anchor:string,today:string,frequency:BillingFrequency) {
  const [,anchorMonth,anchorDay]=anchor.split('-').map(Number); const [todayYear,todayMonth]=today.split('-').map(Number); const todayValue=new Date(`${today}T00:00:00Z`);
  let candidate=frequency==='yearly'?dateForAnchor(todayYear??2000,anchorMonth??1,anchorDay??1):dateForAnchor(todayYear??2000,todayMonth??1,anchorDay??1);
  if (candidate>todayValue) { const previousMonth=(todayMonth??1)===1?12:(todayMonth??1)-1; const previousYear=(todayMonth??1)===1?(todayYear??2000)-1:(todayYear??2000); candidate=frequency==='yearly'?dateForAnchor((todayYear??2000)-1,anchorMonth??1,anchorDay??1):dateForAnchor(previousYear,previousMonth,anchorDay??1); }
  return candidate.toISOString().slice(0,10)<anchor ? anchor : candidate.toISOString().slice(0,10);
}
function defaultReceiptStart(row: AdminPlatformRevenueRow) { return cycleStart(row.effectiveFrom ?? todayDate(),todayDate(),row.billingFrequency ?? 'monthly'); }
function dateForAnchor(year:number,month:number,anchorDay:number) { const lastDay=new Date(Date.UTC(year,month,0)).getUTCDate(); return new Date(Date.UTC(year,month-1,Math.min(anchorDay,lastDay))); }
function periodEndFor(startValue:string,frequency:BillingFrequency,anchor:string) { const [year,month]=startValue.split('-').map(Number); const [,anchorMonth,anchorDay]=anchor.split('-').map(Number); const next=frequency==='yearly'?dateForAnchor((year??2000)+1,anchorMonth??month??1,anchorDay??1):dateForAnchor(year??2000,(month??1)+1,anchorDay??1); next.setUTCDate(next.getUTCDate()-1); return next.toISOString().slice(0,10); }
