import React, { useEffect, useState } from 'react';
import { useMock } from '../../app/provider';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import type { Organization, OrganizationPlan } from '../../types';

interface CreateOrganizationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (organization: Organization) => void;
}

export const CreateOrganizationDialog: React.FC<CreateOrganizationDialogProps> = ({ isOpen, onClose, onCreated }) => {
  const { addOrganization } = useMock();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [plan, setPlan] = useState<OrganizationPlan>('PRO');
  const [responsibleName, setResponsibleName] = useState('');
  const [responsibleEmail, setResponsibleEmail] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setName('');
    setLocation('');
    setPlan('PRO');
    setResponsibleName('');
    setResponsibleEmail('');
  }, [isOpen]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const organization = addOrganization({ name, location, plan, responsibleName, responsibleEmail });
      showToast('Consultorio registrado', `Se creó ${organization.name}. La invitación de ${organization.primaryContact.name} quedó pendiente de envío.`);
      onClose();
      onCreated?.(organization);
    } catch (error) {
      showToast('No se pudo registrar', error instanceof Error ? error.message : 'Revisá los datos ingresados.', 'error');
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Registrar nuevo consultorio" description="Creá el consultorio, asigná su plan inicial y prepará la invitación del responsable principal.">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2"><label htmlFor="new-consultorio-name" className="form-label">Nombre del consultorio *</label><input id="new-consultorio-name" required value={name} onChange={event => setName(event.target.value)} className="form-control" placeholder="Ej. Consultorio Horizonte" /></div>
          <div><label htmlFor="new-consultorio-location" className="form-label">Ubicación *</label><input id="new-consultorio-location" required value={location} onChange={event => setLocation(event.target.value)} className="form-control" placeholder="Ciudad, provincia" /></div>
          <div><label htmlFor="new-consultorio-plan" className="form-label">Plan inicial *</label><select id="new-consultorio-plan" value={plan} onChange={event => setPlan(event.target.value as OrganizationPlan)} className="form-control"><option value="BASIC">Basic · $30.000</option><option value="PRO">Pro · $60.000</option><option value="ULTRA">Ultra · $100.000</option><option value="CUSTOM">Custom · $200.000</option></select></div>
          <div><label htmlFor="new-responsible-name" className="form-label">Nombre completo del responsable *</label><input id="new-responsible-name" required value={responsibleName} onChange={event => setResponsibleName(event.target.value)} className="form-control" autoComplete="name" /></div>
          <div><label htmlFor="new-responsible-email" className="form-label">Email del responsable *</label><input id="new-responsible-email" type="email" required value={responsibleEmail} onChange={event => setResponsibleEmail(event.target.value)} className="form-control" autoComplete="email" /></div>
        </div>
        <div className="rounded-xl bg-[#F4F6FE] border border-[#D7DDF7] p-3 text-[11px] text-[#3E4C92]">En esta etapa se registra una invitación pendiente. El envío automático real se activará mediante el backend seguro de correo.</div>
        <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" variant="primary">Registrar consultorio</Button></div>
      </form>
    </Dialog>
  );
};
