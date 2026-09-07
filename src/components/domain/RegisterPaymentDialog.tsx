import React, { useEffect, useState } from 'react';
import { useMock } from '../../app/provider';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { advanceBillingDate, formatCurrency } from '../../lib/adminCommercial';
import { formatShortDate } from '../../lib/dateUtils';
import type { Organization } from '../../types';

interface RegisterPaymentDialogProps {
  organization: Organization | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RegisterPaymentDialog: React.FC<RegisterPaymentDialogProps> = ({ organization, isOpen, onClose }) => {
  const { registerPayment } = useMock();
  const { showToast } = useToast();
  const [amount, setAmount] = useState('');
  const [paidAt, setPaidAt] = useState('');
  const [method, setMethod] = useState('Transferencia');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!isOpen || !organization) return;
    setAmount(String(organization.monthlyPrice));
    setPaidAt(new Date().toISOString().slice(0, 10));
    setMethod('Transferencia');
    setNote('');
  }, [isOpen, organization]);

  if (!organization) return null;
  const nextDue = advanceBillingDate(organization.nextBillingDate);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      registerPayment(organization.id, {
        amount: Number(amount),
        paidAt: new Date(`${paidAt}T12:00:00`).toISOString(),
        method,
        note: note.trim() || undefined,
      });
      showToast('Pago registrado', `${organization.name} quedó activo. Próximo vencimiento: ${formatShortDate(nextDue)}.`);
      onClose();
    } catch (error) {
      showToast('No se pudo registrar', error instanceof Error ? error.message : 'Revisá los datos del pago.', 'error');
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Registrar pago" description="Confirmá el cobro y actualizá el próximo vencimiento de forma auditada.">
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-xl bg-surface-subtle border border-border-subtle p-3 grid grid-cols-2 gap-3 text-xs">
          <div><p className="text-text-tertiary">Consultorio</p><p className="font-bold text-text-primary mt-1">{organization.name}</p></div>
          <div><p className="text-text-tertiary">Plan vigente</p><p className="font-bold text-text-primary mt-1">{organization.plan}</p></div>
          <div><p className="text-text-tertiary">Vencimiento actual</p><p className="font-bold text-text-primary mt-1">{formatShortDate(organization.nextBillingDate)}</p></div>
          <div><p className="text-text-tertiary">Próximo vencimiento</p><p className="font-bold text-brand-strong mt-1">{formatShortDate(nextDue)}</p></div>
        </div>
        <div><label htmlFor="payment-dialog-amount" className="form-label">Monto cobrado (ARS) *</label><input id="payment-dialog-amount" type="number" min="1" required value={amount} onChange={event => setAmount(event.target.value)} className="form-control" /><p className="text-[11px] text-text-tertiary mt-1">Tarifa del plan: {formatCurrency(organization.monthlyPrice)}</p></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label htmlFor="payment-dialog-date" className="form-label">Fecha de pago *</label><input id="payment-dialog-date" type="date" required value={paidAt} onChange={event => setPaidAt(event.target.value)} className="form-control" /></div>
          <div><label htmlFor="payment-dialog-method" className="form-label">Medio de pago *</label><select id="payment-dialog-method" value={method} onChange={event => setMethod(event.target.value)} className="form-control"><option>Transferencia</option><option>Mercado Pago</option><option>Efectivo</option><option>Otro</option></select></div>
        </div>
        <div><label htmlFor="payment-dialog-note" className="form-label">Nota o comprobante</label><textarea id="payment-dialog-note" rows={3} value={note} onChange={event => setNote(event.target.value)} className="form-control resize-none" placeholder="Ej. Transferencia Banco Macro · operación 12345" /></div>
        <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" variant="primary">Confirmar cobro</Button></div>
      </form>
    </Dialog>
  );
};
