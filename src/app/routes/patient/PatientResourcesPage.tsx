import { useMemo, useState } from 'react';
import { ArrowLeft, ExternalLink, FileText, Library, Search, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMock } from '../../provider';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';

export function PatientResourcesPage() {
  const { patientResources } = useMock();
  const [search, setSearch] = useState('');
  const resources = useMemo(() => patientResources.filter(resource => `${resource.title} ${resource.category}`.toLowerCase().includes(search.trim().toLowerCase())), [patientResources, search]);
  return <div className="pb-24 p-4 space-y-5 max-w-2xl mx-auto min-h-screen bg-bg-app">
    <header className="pt-2"><Link to="/patient" className="min-h-11 inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary"><ArrowLeft className="w-4 h-4" />Volver al inicio</Link><h2 className="text-2xl font-bold text-text-primary flex items-center gap-2 mt-2"><Library className="w-6 h-6 text-brand-strong" />Todos tus recursos</h2><p className="text-xs text-text-secondary mt-1">Material publicado por tu nutricionista para acompañar tu seguimiento.</p></header>
    <div className="relative"><label htmlFor="patient-resource-search" className="sr-only">Buscar recursos</label><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" /><input id="patient-resource-search" className="form-control pl-11" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por título o categoría..." /></div>
    <div className="flex items-center justify-between"><p className="text-xs font-semibold text-text-primary">Biblioteca disponible</p><Badge variant="neutral">{resources.length}</Badge></div>
    {resources.length === 0 ? <Card className="py-10 text-center"><Library className="w-7 h-7 text-text-tertiary mx-auto" /><p className="text-sm font-semibold mt-2">No encontramos recursos</p><p className="text-xs text-text-secondary mt-1">Probá con otra búsqueda.</p></Card> : <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{resources.map(resource => {
      const Icon = resource.kind === 'video' ? Video : FileText;
      return <Card key={resource.id} className="flex items-start gap-3 p-4"><span className="w-10 h-10 rounded-xl bg-brand-soft text-brand-strong flex items-center justify-center shrink-0"><Icon className="w-4 h-4" /></span><div className="min-w-0 flex-1"><p className="text-xs font-bold text-text-primary leading-snug">{resource.title}</p><p className="text-[10px] text-text-tertiary mt-1">{resource.category} · {resource.kind === 'video' ? 'Video' : 'Documento PDF'}</p><p className="text-[10px] text-text-secondary truncate mt-2" title={resource.source}>{resource.source}</p></div>{resource.kind === 'video' && <a href={resource.source} target="_blank" rel="noreferrer" aria-label={`Abrir ${resource.title}`} className="min-w-11 min-h-11 rounded-xl text-brand-strong inline-flex items-center justify-center hover:bg-surface-subtle"><ExternalLink className="w-4 h-4" /></a>}</Card>;
    })}</div>}
  </div>;
}
