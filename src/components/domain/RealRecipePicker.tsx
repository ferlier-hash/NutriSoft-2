import { Link } from 'react-router-dom';
import type { LibraryContent } from '../../data/supabase/library.repository';

export function RealRecipePicker({ recipes,value,onChange }: { recipes:LibraryContent[];value?:string;onChange:(value:string|undefined)=>void }) {
  return <div className="sm:col-span-3"><label className="block text-xs text-text-secondary">Receta publicada (opcional)<select className="form-control" value={value??''} onChange={e=>onChange(e.target.value||undefined)}><option value="">Sin receta</option>{value && !recipes.some(r=>r.id===value) && <option value={value}>Receta no disponible · podés quitar el vínculo</option>}{recipes.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}</select></label>{value && recipes.some(r=>r.id===value) && <Link className="inline-flex items-center min-h-11 text-xs text-brand-strong" target="_blank" to={`/professional/recipes/${value}`}>Ver receta ↗</Link>}</div>;
}
