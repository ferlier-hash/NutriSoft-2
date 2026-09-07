import React, { useEffect, useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';

interface InvitePersonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  nameLabel: string;
  submitLabel: string;
  onSubmit: (name: string, email: string) => void;
}

export const InvitePersonDialog: React.FC<InvitePersonDialogProps> = ({ isOpen, onClose, title, description, nameLabel, submitLabel, onSubmit }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setName('');
    setEmail('');
  }, [isOpen]);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title} description={description}>
      <form onSubmit={event => { event.preventDefault(); onSubmit(name, email); }} className="space-y-4">
        <div><label htmlFor="invite-person-name" className="form-label">{nameLabel} *</label><input id="invite-person-name" required value={name} onChange={event => setName(event.target.value)} className="form-control" autoComplete="name" /></div>
        <div><label htmlFor="invite-person-email" className="form-label">Correo electrónico *</label><input id="invite-person-email" type="email" required value={email} onChange={event => setEmail(event.target.value)} className="form-control" autoComplete="email" /></div>
        <div className="rounded-xl bg-[#F4F6FE] border border-[#D7DDF7] p-3 text-[11px] text-[#3E4C92]">La invitación quedará pendiente de aceptación. El correo real será enviado automáticamente cuando conectemos el servicio transaccional del backend.</div>
        <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" variant="primary">{submitLabel}</Button></div>
      </form>
    </Dialog>
  );
};
