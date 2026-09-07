import React, { useState } from 'react';
import { Copy, Pencil, Plus, Sparkles, Trash2, UserRoundCheck, Users } from 'lucide-react';
import { useMock } from '../../provider';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Dialog } from '../../../components/ui/Dialog';
import { useToast } from '../../../components/ui/Toast';

export const RecommendationsPage: React.FC = () => {
  const { professionalMotivationalPhrases, professionalRecommendations, professionalPatients, addMotivationalPhrase, updateMotivationalPhrase, duplicateMotivationalPhrase, deleteMotivationalPhrase, setMotivationalPhrasePatients } = useMock();
  const { showToast } = useToast();
  const [creating, setCreating] = useState(false);
  const [newText, setNewText] = useState('');
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const openAssignment = (phraseId: string) => {
    setApplyingId(phraseId);
    setSelectedPatients(professionalRecommendations.filter(rec => rec.phraseId === phraseId).map(rec => rec.patientId));
  };

  const savePhrase = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      addMotivationalPhrase(newText);
      setNewText('');
      setCreating(false);
      showToast('Frase creada', 'Ya podés aplicarla a uno o varios pacientes.');
    } catch (error) {
      showToast('No se pudo crear', error instanceof Error ? error.message : 'Revisá la frase.', 'error');
    }
  };

  const applyPhrase = () => {
    if (!applyingId) return;
    setMotivationalPhrasePatients(applyingId, selectedPatients);
    setApplyingId(null);
    showToast('Asignaciones actualizadas', selectedPatients.length ? `La frase está visible para ${selectedPatients.length} paciente${selectedPatients.length === 1 ? '' : 's'}.` : 'La frase ya no está aplicada a pacientes.');
  };

  const openEditor = (phraseId: string, text: string) => {
    setEditingId(phraseId);
    setEditingText(text);
  };

  const saveEdit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingId) return;
    try {
      updateMotivationalPhrase(editingId, editingText);
      setEditingId(null);
      showToast('Frase actualizada', 'El cambio ya se ve en los pacientes que la tienen aplicada.');
    } catch (error) {
      showToast('No se pudo editar', error instanceof Error ? error.message : 'Revisá la frase.', 'error');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h2 className="text-2xl font-bold text-text-primary flex items-center gap-2"><Sparkles className="w-6 h-6 text-brand-strong" /> Recomendaciones</h2><p className="text-xs text-text-secondary mt-1">Creá frases motivacionales y elegí qué mensaje verá cada paciente en su inicio.</p></div>
        <Button onClick={() => setCreating(true)} className="gap-2"><Plus className="w-4 h-4" /> Nueva frase</Button>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3" aria-label="Resumen de recomendaciones">
        <Card><Sparkles className="w-4 h-4 text-brand-strong" /><p className="text-[11px] text-text-secondary mt-3">Frases guardadas</p><p className="text-xl font-bold mt-1">{professionalMotivationalPhrases.length}</p></Card>
        <Card><UserRoundCheck className="w-4 h-4 text-brand-strong" /><p className="text-[11px] text-text-secondary mt-3">Pacientes con frase activa</p><p className="text-xl font-bold mt-1">{new Set(professionalRecommendations.filter(rec => rec.phraseId).map(rec => rec.patientId)).size}</p></Card>
        <Card><Users className="w-4 h-4 text-brand-strong" /><p className="text-[11px] text-text-secondary mt-3">Pacientes disponibles</p><p className="text-xl font-bold mt-1">{professionalPatients.length}</p></Card>
      </section>

      <div className="rounded-2xl border border-[#BDE9EA] bg-[#E9F8F7] p-4 text-xs text-text-secondary"><strong className="text-text-primary">Una frase por paciente.</strong> Al aplicar una nueva, NutriSoft reemplaza automáticamente la anterior. Una misma frase puede compartirse con varios pacientes.</div>

      <section className="space-y-3" aria-label="Biblioteca de frases">
        {professionalMotivationalPhrases.map(phrase => {
          const assignedPatients = professionalRecommendations.filter(rec => rec.phraseId === phrase.id).map(rec => professionalPatients.find(patient => patient.id === rec.patientId)).filter(Boolean);
          return <article key={phrase.id} className="rounded-2xl border border-border-subtle bg-surface px-4 py-3 shadow-sm flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1"><span className="w-9 h-9 rounded-xl bg-brand-soft text-brand-strong flex items-center justify-center shrink-0"><Sparkles className="w-4 h-4" /></span><blockquote className="text-sm font-semibold text-text-primary leading-relaxed py-2">“{phrase.text}”</blockquote></div>
            <div className="lg:w-72 lg:border-l lg:border-border-subtle lg:pl-4"><p className="text-[10px] uppercase tracking-wide font-bold text-text-tertiary">Pacientes</p><div className="flex flex-wrap gap-1 mt-1.5">{assignedPatients.length ? assignedPatients.map(patient => <Badge key={patient!.id} variant="info">{patient!.firstName} {patient!.lastName}</Badge>) : <span className="text-[11px] text-text-tertiary">Ningún paciente</span>}</div></div>
            <div className="flex items-center justify-end gap-1 lg:border-l lg:border-border-subtle lg:pl-3 shrink-0"><Button size="sm" className="!min-w-11 !min-h-11 lg:!min-w-9 lg:!min-h-9" variant="ghost" aria-label="Editar frase" title="Editar" onClick={() => openEditor(phrase.id, phrase.text)}><Pencil className="w-4 h-4" /></Button><Button size="sm" className="!min-w-11 !min-h-11 lg:!min-w-9 lg:!min-h-9" variant="ghost" aria-label="Duplicar frase" title="Duplicar" onClick={() => { duplicateMotivationalPhrase(phrase.id); showToast('Frase duplicada', 'Se creó una copia editable e independiente.'); }}><Copy className="w-4 h-4" /></Button><Button size="sm" className="!min-w-11 !min-h-11 lg:!min-w-9 lg:!min-h-9" variant="ghost" aria-label="Eliminar frase" title="Eliminar" onClick={() => setDeletingId(phrase.id)}><Trash2 className="w-4 h-4" /></Button><Button size="sm" variant="secondary" onClick={() => openAssignment(phrase.id)} className="gap-1.5 ml-1 !min-h-11 lg:!min-h-9"><Users className="w-4 h-4" /> Aplicar</Button></div>
          </article>;
        })}
      </section>

      <Dialog isOpen={creating} onClose={() => setCreating(false)} title="Nueva frase" description="Escribí un mensaje breve, positivo y personalizado."><form onSubmit={savePhrase} className="space-y-4"><div><label htmlFor="phrase-text" className="form-label">Frase motivacional *</label><textarea id="phrase-text" className="form-control min-h-28" value={newText} onChange={event => setNewText(event.target.value)} maxLength={280} required placeholder="Ej. Cada pequeño hábito cuenta..." /><p className="text-[10px] text-text-tertiary text-right mt-1">{newText.length}/280</p></div><div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setCreating(false)}>Cancelar</Button><Button type="submit">Guardar frase</Button></div></form></Dialog>

      <Dialog isOpen={Boolean(editingId)} onClose={() => setEditingId(null)} title="Editar frase" description="El cambio se aplicará también en los muros donde esta frase esté activa."><form onSubmit={saveEdit} className="space-y-4"><div><label htmlFor="edit-phrase-text" className="form-label">Frase motivacional *</label><textarea id="edit-phrase-text" className="form-control min-h-28" value={editingText} onChange={event => setEditingText(event.target.value)} maxLength={280} required /><p className="text-[10px] text-text-tertiary text-right mt-1">{editingText.length}/280</p></div><div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setEditingId(null)}>Cancelar</Button><Button type="submit">Guardar cambios</Button></div></form></Dialog>

      <Dialog isOpen={Boolean(applyingId)} onClose={() => setApplyingId(null)} title="Aplicar a pacientes" description="Podés elegir varios. Quitar una selección también retira esta frase de ese paciente."><div className="space-y-2">{professionalPatients.map(patient => <label key={patient.id} className="flex items-center gap-3 rounded-xl border border-border-subtle p-3 cursor-pointer hover:bg-surface-subtle"><input type="checkbox" className="w-4 h-4 accent-[#357984]" checked={selectedPatients.includes(patient.id)} onChange={event => setSelectedPatients(current => event.target.checked ? [...current, patient.id] : current.filter(id => id !== patient.id))} /><span className="text-sm font-semibold text-text-primary">{patient.firstName} {patient.lastName}</span></label>)}</div><div className="flex justify-end gap-2 mt-5"><Button variant="ghost" onClick={() => setApplyingId(null)}>Cancelar</Button><Button onClick={applyPhrase}>Guardar asignación</Button></div></Dialog>

      <Dialog isOpen={Boolean(deletingId)} onClose={() => setDeletingId(null)} title="Eliminar frase" description="Si está aplicada, también dejará de mostrarse en el muro de esos pacientes."><div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setDeletingId(null)}>Cancelar</Button><Button variant="destructive" onClick={() => { if (deletingId) deleteMotivationalPhrase(deletingId); setDeletingId(null); showToast('Frase eliminada', 'Se retiró de la biblioteca y de los muros donde estaba aplicada.'); }}>Eliminar frase</Button></div></Dialog>
    </div>
  );
};
