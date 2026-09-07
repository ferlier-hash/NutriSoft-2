import { useState } from 'react';
import { CheckCircle2, ClipboardCheck, Copy, Pencil, Plus, Trash2, Unlink, UserRound } from 'lucide-react';
import { useMock } from '../../provider';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Dialog } from '../../../components/ui/Dialog';
import { useToast } from '../../../components/ui/Toast';

export function NextStepsPage() {
  const { professionalNextStepLists, professionalPatients, createNextStepList, updateNextStepList, assignNextStepList, unassignNextStepList, duplicateNextStepList, deleteNextStepList } = useMock();
  const { showToast } = useToast();
  const [editorOpen, setEditorOpen] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [durationDays, setDurationDays] = useState(7);
  const [tasksText, setTasksText] = useState('');
  const [patientId, setPatientId] = useState('');

  const closeEditor = () => { setEditorOpen(false); setEditingId(null); setTitle(''); setDurationDays(7); setTasksText(''); };
  const openCreate = () => { closeEditor(); setEditorOpen(true); };
  const openEdit = (id: string) => {
    const list = professionalNextStepLists.find(item => item.id === id);
    if (!list) return;
    setEditingId(id); setTitle(list.title); setDurationDays(list.durationDays); setTasksText(list.items.map(item => item.text).join('\n')); setEditorOpen(true);
  };
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const input = { title, durationDays, items: tasksText.split('\n') };
      if (editingId) updateNextStepList(editingId, input);
      else createNextStepList(input);
      showToast(editingId ? 'Lista actualizada' : 'Lista creada', 'Los próximos pasos quedaron listos para asignar.');
      closeEditor();
    } catch (error) { showToast('No se pudo guardar', error instanceof Error ? error.message : 'Revisá los datos.', 'error'); }
  };
  const assignedPatient = (id?: string) => professionalPatients.find(patient => patient.id === id);

  return <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div><h2 className="text-2xl font-bold text-text-primary flex items-center gap-2"><ClipboardCheck className="w-6 h-6 text-brand-strong" />Próximos pasos</h2><p className="text-xs text-text-secondary mt-1">Listas individuales de tareas para acompañar a cada paciente durante los próximos 7 a 15 días.</p></div>
      <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" />Nueva lista</Button>
    </header>

    <div className="rounded-2xl border border-[#C6D4F8] bg-[#F4F6FE] p-4 text-xs text-[#2D3F99]"><strong>Una lista activa por paciente.</strong> Cada lista pertenece a una sola persona para conservar sus checks y comentarios. Duplicala si querés reutilizar su estructura con otro paciente.</div>

    {professionalNextStepLists.length === 0 ? <Card className="py-12 text-center"><ClipboardCheck className="w-8 h-8 text-text-tertiary mx-auto" /><p className="text-sm font-semibold mt-3">Todavía no creaste listas</p><p className="text-xs text-text-secondary mt-1">Creá la primera y asignala a un paciente.</p></Card> : <div className="space-y-3">{professionalNextStepLists.map(list => {
      const patient = assignedPatient(list.patientId);
      const completed = list.items.filter(item => item.completed).length;
      return <article key={list.id} className="rounded-2xl border border-border-subtle bg-surface p-4 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(220px,.7fr)_auto] gap-4 lg:items-center">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold text-text-primary">{list.title}</h3><Badge variant="neutral">{list.durationDays} días</Badge></div><p className="text-xs text-text-secondary mt-1">{list.items.length} tareas · {completed} completadas</p><div className="h-1.5 rounded-full bg-surface-subtle overflow-hidden mt-3"><div className="h-full bg-brand-primary rounded-full" style={{ width: `${list.items.length ? completed / list.items.length * 100 : 0}%` }} /></div></div>
          <div>{patient ? <div className="rounded-xl bg-surface-tinted px-3 py-2.5"><p className="text-[10px] uppercase tracking-wide font-bold text-text-tertiary">Paciente asignado</p><p className="text-xs font-semibold text-text-primary mt-1 flex items-center gap-1.5"><UserRound className="w-3.5 h-3.5 text-brand-strong" />{patient.firstName} {patient.lastName}</p></div> : <p className="text-xs text-text-tertiary">Sin paciente asignado</p>}</div>
          <div className="flex items-center justify-end gap-1">
            <button type="button" onClick={() => openEdit(list.id)} className="min-w-11 min-h-11 rounded-xl inline-flex items-center justify-center text-text-secondary hover:bg-surface-subtle" aria-label={`Editar ${list.title}`} title="Editar"><Pencil className="w-4 h-4" /></button>
            <button type="button" onClick={() => { duplicateNextStepList(list.id); showToast('Lista duplicada', 'La copia quedó sin asignar.'); }} className="min-w-11 min-h-11 rounded-xl inline-flex items-center justify-center text-text-secondary hover:bg-surface-subtle" aria-label={`Duplicar ${list.title}`} title="Duplicar"><Copy className="w-4 h-4" /></button>
            {patient ? <button type="button" onClick={() => { unassignNextStepList(list.id); showToast('Lista desaplicada', 'La lista quedó disponible sin borrar su contenido.'); }} className="min-w-11 min-h-11 rounded-xl inline-flex items-center justify-center text-text-secondary hover:bg-surface-subtle" aria-label={`Desaplicar ${list.title}`} title="Desaplicar"><Unlink className="w-4 h-4" /></button> : <Button size="sm" variant="secondary" onClick={() => { setAssigningId(list.id); setPatientId(''); }}>Aplicar</Button>}
            <button type="button" onClick={() => { deleteNextStepList(list.id); showToast('Lista eliminada', 'La lista dejó de estar disponible.'); }} className="min-w-11 min-h-11 rounded-xl inline-flex items-center justify-center text-semantic-critical hover:bg-[#FCEBEA]" aria-label={`Eliminar ${list.title}`} title="Eliminar"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-border-subtle space-y-2">{list.items.map(item => <div key={item.id} className={`grid grid-cols-[20px_minmax(0,1fr)] ${patient ? 'sm:grid-cols-[20px_minmax(0,1fr)_minmax(180px,.8fr)]' : ''} gap-2 text-xs`}><CheckCircle2 className={`w-4 h-4 mt-0.5 ${item.completed ? 'text-semantic-success' : 'text-text-tertiary'}`} /><span className={item.completed ? 'line-through text-text-secondary' : 'text-text-primary'}>{item.text}</span>{patient && <span className="col-start-2 sm:col-start-auto text-text-secondary italic">{item.patientComment || 'Sin comentario'}</span>}</div>)}</div>
      </article>;
    })}</div>}

    <Dialog isOpen={editorOpen} onClose={closeEditor} title={editingId ? 'Editar lista de próximos pasos' : 'Nueva lista de próximos pasos'} description="Cada renglón se convertirá en una tarea del checklist."><form onSubmit={save} className="space-y-4"><div><label htmlFor="next-steps-title" className="form-label">Título *</label><input id="next-steps-title" className="form-control" value={title} onChange={event => setTitle(event.target.value)} required /></div><div><label htmlFor="next-steps-duration" className="form-label">Duración *</label><select id="next-steps-duration" className="form-control" value={durationDays} onChange={event => setDurationDays(Number(event.target.value))}>{Array.from({ length: 9 }, (_, index) => index + 7).map(days => <option key={days} value={days}>{days} días</option>)}</select></div><div><label htmlFor="next-steps-items" className="form-label">Tareas, una por línea *</label><textarea id="next-steps-items" rows={7} className="form-control" value={tasksText} onChange={event => setTasksText(event.target.value)} placeholder={'Preparar una botella de agua\nIncluir una fruta en la merienda'} required /></div><div className="flex justify-end gap-2 pt-3 border-t border-border-subtle"><Button type="button" variant="ghost" onClick={closeEditor}>Cancelar</Button><Button type="submit">{editingId ? 'Guardar cambios' : 'Crear lista'}</Button></div></form></Dialog>

    <Dialog isOpen={!!assigningId} onClose={() => setAssigningId(null)} title="Aplicar lista a un paciente" description="Si el paciente ya tiene otra lista, quedará desaplicada sin eliminarse."><form onSubmit={event => { event.preventDefault(); if (!assigningId || !patientId) return; try { assignNextStepList(assigningId, patientId); showToast('Lista aplicada', 'El paciente ya puede verla en su inicio.'); setAssigningId(null); } catch (error) { showToast('No se pudo aplicar', error instanceof Error ? error.message : 'Revisá la selección.', 'error'); } }} className="space-y-4"><div><label htmlFor="next-steps-patient" className="form-label">Paciente *</label><select id="next-steps-patient" className="form-control" value={patientId} onChange={event => setPatientId(event.target.value)} required><option value="">Seleccionar paciente</option>{professionalPatients.map(patient => <option key={patient.id} value={patient.id}>{patient.firstName} {patient.lastName}</option>)}</select></div><div className="flex justify-end gap-2 pt-3 border-t border-border-subtle"><Button type="button" variant="ghost" onClick={() => setAssigningId(null)}>Cancelar</Button><Button type="submit" disabled={!patientId}>Aplicar lista</Button></div></form></Dialog>
  </div>;
}
