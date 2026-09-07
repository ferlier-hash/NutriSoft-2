import React, { useMemo, useState } from 'react';
import { ExternalLink, FileText, Library, Link2, Pencil, Plus, Search, ShieldCheck, Upload, Video, Users } from 'lucide-react';
import { useMock } from '../../provider';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Dialog } from '../../../components/ui/Dialog';
import { useToast } from '../../../components/ui/Toast';
import { formatShortDate } from '../../../lib/dateUtils';
import type { ProfessionalResourceKind, PublicationStatus } from '../../../types';

export const ResourcesPage: React.FC = () => {
  const { professionalResources, professionalPatients, addProfessionalResource, updateProfessionalResource, setProfessionalResourceStatus, currentDemoNutritionist } = useMock();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | ProfessionalResourceKind>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | PublicationStatus>('all');
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [kind, setKind] = useState<ProfessionalResourceKind>('document');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Guías');
  const [source, setSource] = useState('');

  const filteredResources = useMemo(() => professionalResources.filter(resource => {
    const matchesSearch = `${resource.title} ${resource.category}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch &&
      (kindFilter === 'all' || resource.kind === kindFilter) &&
      (statusFilter === 'all' || resource.status === statusFilter);
  }), [kindFilter, professionalResources, search, statusFilter]);

  const closeDialog = () => {
    setIsOpen(false);
    setEditingId(null);
    setKind('document');
    setTitle('');
    setCategory('Guías');
    setSource('');
  };

  const openCreateDialog = () => {
    setEditingId(null);
    setKind('document');
    setTitle('');
    setCategory('Guías');
    setSource('');
    setIsOpen(true);
  };

  const openEditDialog = (id: string) => {
    const resource = professionalResources.find(item => item.id === id);
    if (!resource) return;
    setEditingId(resource.id);
    setKind(resource.kind);
    setTitle(resource.title);
    setCategory(resource.category);
    setSource(resource.source);
    setIsOpen(true);
  };

  const submitResource = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
      const current = editingId ? professionalResources.find(item => item.id === editingId) : undefined;
      const status = editingId ? current?.status ?? 'draft' : submitter?.value === 'draft' ? 'draft' : 'published';
      const resource = editingId
        ? updateProfessionalResource(editingId, { title, kind, category, source, status })
        : addProfessionalResource({ title, kind, category, source, status });
      showToast(
        editingId ? 'Recurso actualizado' : status === 'published' ? 'Recurso publicado' : 'Borrador guardado',
        editingId
          ? `Guardamos los cambios de ${resource.title}.`
          : status === 'published'
          ? `${resource.title} ya está disponible para tus pacientes asignados.`
          : `${resource.title} permanece privado hasta que decidas publicarlo.`
      );
      closeDialog();
    } catch (error) {
      showToast('No se pudo publicar', error instanceof Error ? error.message : 'Revisá los datos ingresados.', 'error');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2"><Library className="w-6 h-6 text-brand-strong" /> Recursos</h2>
          <p className="text-xs text-text-secondary mt-1">Tu biblioteca educativa privada, compartida únicamente con tus pacientes.</p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2"><Plus className="w-4 h-4" /> Agregar recurso</Button>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3" aria-label="Resumen de recursos">
        <div className="bg-surface border border-border-subtle rounded-2xl p-4 shadow-sm"><Library className="w-4 h-4 text-brand-strong" /><p className="text-[11px] text-text-secondary mt-3">Recursos publicados</p><p className="text-xl font-bold mt-1">{professionalResources.filter(item => item.status === 'published').length}</p></div>
        <div className="bg-surface border border-border-subtle rounded-2xl p-4 shadow-sm"><FileText className="w-4 h-4 text-brand-strong" /><p className="text-[11px] text-text-secondary mt-3">Documentos</p><p className="text-xl font-bold mt-1">{professionalResources.filter(item => item.kind === 'document').length}</p></div>
        <div className="bg-surface border border-border-subtle rounded-2xl p-4 shadow-sm"><Users className="w-4 h-4 text-brand-strong" /><p className="text-[11px] text-text-secondary mt-3">Pacientes con acceso</p><p className="text-xl font-bold mt-1">{professionalPatients.length}</p></div>
      </section>

      <div className="rounded-2xl border border-[#C6D4F8] bg-[#F4F6FE] p-4 flex gap-3 text-[#2D3F99]">
        <ShieldCheck className="w-5 h-5 shrink-0" />
        <div><p className="text-xs font-bold">Biblioteca aislada por profesional</p><p className="text-[11px] leading-relaxed mt-1">Cada publicación se vincula a {currentDemoNutritionist?.name || 'tu usuario'} y se comparte automáticamente sólo con sus pacientes asignados. Otros profesionales del consultorio no pueden verla.</p></div>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="relative w-full sm:w-80">
            <label htmlFor="resource-search" className="sr-only">Buscar recursos</label>
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input id="resource-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por título o categoría..." className="form-control pl-11" />
          </div>
          <div className="flex gap-1 rounded-xl bg-surface-subtle p-1" aria-label="Filtrar recursos">
            {([['all', 'Todos'], ['document', 'Documentos'], ['video', 'Videos']] as const).map(([value, label]) => (
              <button key={value} type="button" aria-pressed={kindFilter === value} onClick={() => setKindFilter(value)} className={`min-h-11 sm:min-h-9 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${kindFilter === value ? 'bg-white text-brand-strong shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>{label}</button>
            ))}
          </div>
          <div>
            <label htmlFor="resource-status-filter" className="sr-only">Filtrar por estado editorial</label>
            <select id="resource-status-filter" className="form-control min-w-40" value={statusFilter} onChange={event => setStatusFilter(event.target.value as 'all' | PublicationStatus)}>
              <option value="all">Todos los estados</option>
              <option value="published">Publicados</option>
              <option value="draft">Borradores</option>
              <option value="retired">Retirados</option>
            </select>
          </div>
        </div>

        {filteredResources.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
            {filteredResources.map(resource => {
              const Icon = resource.kind === 'document' ? FileText : Video;
              return (
                <article key={resource.id} className="rounded-2xl border border-border-subtle bg-surface-subtle p-3 flex flex-col gap-3 min-h-52">
                  <div className="flex items-start justify-between gap-2"><span className="w-9 h-9 rounded-xl bg-white text-brand-strong flex items-center justify-center shrink-0"><Icon className="w-4 h-4" /></span><div className="flex flex-wrap justify-end gap-1"><Badge variant={resource.kind === 'document' ? 'info' : 'pending'}>{resource.kind === 'document' ? 'PDF' : 'Video'}</Badge><Badge variant={resource.status === 'published' ? 'active' : resource.status === 'draft' ? 'neutral' : 'suspended'}>{resource.status === 'published' ? 'Publicado' : resource.status === 'draft' ? 'Borrador' : 'Retirado'}</Badge></div></div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-bold text-text-primary leading-snug line-clamp-2" title={resource.title}>{resource.title}</p><p className="text-[10px] text-text-secondary mt-1.5">{resource.category} · {formatShortDate(resource.updatedAt)}</p><p className="text-[10px] text-text-tertiary truncate mt-1" title={resource.source}>{resource.source}</p></div>
                  <div className="border-t border-border-subtle pt-2.5"><p className={`text-[10px] font-semibold ${resource.status === 'published' ? 'text-semantic-success' : 'text-text-tertiary'}`}>{resource.status === 'published' ? `Visible para ${professionalPatients.length} pacientes` : 'Sólo visible para vos'}</p><div className="flex items-center justify-end gap-1 mt-2">{resource.kind === 'video' && <a href={resource.source} target="_blank" rel="noreferrer" aria-label={`Abrir ${resource.title}`} className="min-w-11 min-h-11 sm:min-w-9 sm:min-h-9 rounded-lg text-brand-strong inline-flex items-center justify-center hover:bg-white"><ExternalLink className="w-4 h-4" /></a>}<button type="button" onClick={() => openEditDialog(resource.id)} aria-label={`Editar ${resource.title}`} title="Editar recurso" className="min-w-11 min-h-11 sm:min-w-9 sm:min-h-9 rounded-lg text-text-secondary inline-flex items-center justify-center hover:bg-white hover:text-brand-strong"><Pencil className="w-4 h-4" /></button><Button type="button" variant="ghost" size="sm" className="min-h-11 sm:min-h-9" onClick={() => { const nextStatus: PublicationStatus = resource.status === 'published' ? 'retired' : resource.status === 'draft' ? 'published' : 'draft'; setProfessionalResourceStatus(resource.id, nextStatus); showToast(nextStatus === 'published' ? 'Recurso publicado' : nextStatus === 'retired' ? 'Recurso retirado' : 'Borrador restaurado', nextStatus === 'published' ? 'Ya está disponible para tus pacientes.' : 'Dejó de estar visible para pacientes.'); }}>{resource.status === 'published' ? 'Retirar' : resource.status === 'draft' ? 'Publicar' : 'Restaurar'}</Button></div></div>
                </article>
              );
            })}
          </div>
        ) : <div className="rounded-2xl bg-surface-subtle py-10 text-center"><Library className="w-7 h-7 text-text-tertiary mx-auto" /><p className="text-sm font-semibold mt-2">No encontramos recursos</p><p className="text-xs text-text-secondary mt-1">Probá con otro filtro o agregá un nuevo contenido.</p></div>}
      </Card>

      <Dialog isOpen={isOpen} onClose={closeDialog} title={editingId ? 'Editar recurso' : 'Agregar recurso'} description={editingId ? 'Corregí el título, la categoría o el contenido asociado.' : 'Publicá un PDF o un enlace educativo para tus pacientes asignados.'}>
        <form onSubmit={submitResource} className="space-y-4">
          <div><label htmlFor="resource-kind" className="form-label">Tipo de recurso</label><select id="resource-kind" className="form-control" value={kind} onChange={event => { setKind(event.target.value as ProfessionalResourceKind); setSource(''); }}><option value="document">Documento PDF</option><option value="video">Enlace de video</option></select></div>
          <div><label htmlFor="resource-title" className="form-label">Título *</label><input id="resource-title" className="form-control" value={title} onChange={event => setTitle(event.target.value)} placeholder="Ej. Guía de colaciones saludables" required /></div>
          <div><label htmlFor="resource-category" className="form-label">Categoría *</label><input id="resource-category" className="form-control" value={category} onChange={event => setCategory(event.target.value)} placeholder="Guías, Plantillas, Educación..." required /></div>
          {kind === 'document' ? <div><label htmlFor="resource-file" className="form-label">Archivo PDF *</label><label htmlFor="resource-file" className="min-h-24 rounded-2xl border border-dashed border-border-hover bg-surface-subtle flex flex-col items-center justify-center cursor-pointer text-text-secondary hover:border-brand-strong"><Upload className="w-5 h-5" /><span className="text-xs font-semibold mt-2">{source || 'Seleccionar archivo PDF'}</span></label><input id="resource-file" type="file" accept="application/pdf" className="sr-only" onChange={event => setSource(event.target.files?.[0]?.name || '')} required={!source} /></div> : <div><label htmlFor="resource-link" className="form-label">Enlace del video *</label><div className="relative"><Link2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" /><input id="resource-link" type="url" className="form-control pl-11" value={source} onChange={event => setSource(event.target.value)} placeholder="https://youtube.com/..." required /></div></div>}
          <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-border-subtle"><Button type="button" variant="ghost" onClick={closeDialog}>Cancelar</Button>{editingId ? <Button type="submit">Guardar cambios</Button> : <><Button type="submit" name="intent" value="draft" variant="secondary">Guardar borrador</Button><Button type="submit" name="intent" value="published">Publicar recurso</Button></>}</div>
        </form>
      </Dialog>
    </div>
  );
};
