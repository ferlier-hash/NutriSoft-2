import { ArrowLeft, Clock3, CookingPot, Search, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useMock } from '../../provider';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';

export function PatientRecipesPage() {
  const { patientRecipes } = useMock();
  const [search, setSearch] = useState('');
  const recipes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return patientRecipes.filter(recipe => `${recipe.title} ${recipe.category} ${recipe.tags.join(' ')}`.toLowerCase().includes(query));
  }, [patientRecipes, search]);

  return <div className="pb-24 p-4 pt-20 md:pt-24 space-y-5 max-w-2xl mx-auto min-h-screen bg-bg-app">
    <header>
      <Link to="/patient" className="min-h-11 inline-flex items-center gap-1.5 rounded-xl border border-border-subtle bg-surface px-3 text-xs font-semibold text-text-secondary shadow-2xs transition hover:border-border-hover hover:text-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong focus-visible:ring-offset-2">
        <ArrowLeft className="w-4 h-4" />Volver al inicio
      </Link>
      <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2 mt-2"><CookingPot className="w-6 h-6 text-brand-strong" />Todas tus recetas</h1>
      <p className="text-xs text-text-secondary mt-1">Recetas publicadas por tu nutricionista para acompañar tu plan.</p>
    </header>

    <div className="relative">
      <label htmlFor="patient-recipe-search" className="sr-only">Buscar recetas</label>
      <Search className="pointer-events-none w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
      <input id="patient-recipe-search" className="form-control pl-11" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por receta, categoría o etiqueta..." />
    </div>

    <div className="flex items-center justify-between"><p className="text-xs font-semibold text-text-primary">Recetario disponible</p><Badge variant="neutral">{recipes.length}</Badge></div>

    {recipes.length === 0 ? <Card className="py-10 text-center"><CookingPot className="w-7 h-7 text-text-tertiary mx-auto" /><p className="text-sm font-semibold mt-2">No encontramos recetas</p><p className="text-xs text-text-secondary mt-1">Probá con otra búsqueda.</p></Card> : <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {recipes.map(recipe => <Link key={recipe.id} to={`/patient/recipes/${recipe.id}`} className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong focus-visible:ring-offset-2">
        <Card className="p-0 h-full overflow-hidden hover:shadow-sm">
          <div className="h-28 bg-surface-tinted bg-cover bg-center" style={{ backgroundImage: `linear-gradient(180deg,transparent 35%,rgba(21,27,34,.45)),url(${recipe.imageUrl})` }} aria-hidden="true" />
          <div className="p-3.5 space-y-2">
            <div className="flex items-start justify-between gap-2"><p className="text-sm font-bold text-text-primary leading-snug">{recipe.title}</p><Badge variant="info">{recipe.category}</Badge></div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-text-secondary"><span className="inline-flex items-center gap-1"><Clock3 className="w-3.5 h-3.5 text-brand-strong" />{recipe.prepMinutes} min</span><span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5 text-brand-strong" />{recipe.servings} porciones</span></div>
          </div>
        </Card>
      </Link>)}
    </div>}
  </div>;
}
