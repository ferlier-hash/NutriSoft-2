import { ArrowLeft, Clock3, CookingPot, Users } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { useMock } from '../../provider';

interface RecipeDetailPageProps {
  portal: 'professional' | 'patient';
}

export function RecipeDetailPage({ portal }: RecipeDetailPageProps) {
  const { recipeId } = useParams();
  const { professionalRecipes, patientRecipes } = useMock();
  const recipes = portal === 'professional' ? professionalRecipes : patientRecipes;
  const recipe = recipes.find(item => item.id === recipeId);
  const backPath = portal === 'professional' ? '/professional/recipes' : '/patient/recipes';
  const backLabel = 'Volver al recetario';

  if (!recipe) {
    return <div className="p-4 sm:p-6 max-w-3xl mx-auto"><Card className="text-center py-12"><CookingPot className="w-8 h-8 text-text-tertiary mx-auto" /><h1 className="text-xl font-bold text-text-primary mt-3">Receta no disponible</h1><p className="text-sm text-text-secondary mt-2">No existe, dejó de estar publicada o no pertenece a tu acceso actual.</p><Button asChild variant="secondary" className="mt-5"><Link to={backPath}>{backLabel}</Link></Button></Card></div>;
  }

  return (
    <div className={`p-4 sm:p-6 lg:p-8 space-y-5 mx-auto ${portal === 'patient' ? 'max-w-2xl pb-24 pt-20 md:pt-24' : 'max-w-4xl'}`}>
      <Link to={backPath} className="min-h-11 inline-flex items-center gap-1.5 rounded-xl border border-border-subtle bg-surface px-3 text-xs font-semibold text-text-secondary shadow-2xs transition hover:border-border-hover hover:text-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong focus-visible:ring-offset-2"><ArrowLeft className="w-4 h-4" />{backLabel}</Link>
      <header className="rounded-3xl border border-border-subtle bg-surface overflow-hidden shadow-sm">
        {recipe.imageUrl ? <div className="h-52 sm:h-72 bg-surface-tinted bg-cover bg-center" style={{ backgroundImage: `url(${recipe.imageUrl})` }} role="img" aria-label={`Fotografía de ${recipe.title}`} /> : null}
        <div className="p-5 sm:p-7"><div className="flex flex-wrap gap-2">{recipe.tags.map(tag => <Badge key={tag} variant="info">{tag}</Badge>)}</div><h1 className="text-2xl sm:text-3xl font-bold text-text-primary mt-3">{recipe.title}</h1><div className="flex flex-wrap gap-4 mt-4 text-xs text-text-secondary"><span className="inline-flex items-center gap-1.5"><Clock3 className="w-4 h-4 text-brand-strong" />{recipe.prepMinutes} minutos</span><span className="inline-flex items-center gap-1.5"><Users className="w-4 h-4 text-brand-strong" />{recipe.servings} {recipe.servings === 1 ? 'porción' : 'porciones'}</span><Badge variant="neutral">{recipe.category}</Badge></div></div>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
        <Card><h2 className="text-base font-bold text-text-primary">Ingredientes</h2><ul className="space-y-3 mt-4">{recipe.ingredients.map((item, index) => <li key={`${item}-${index}`} className="text-sm text-text-secondary flex gap-3"><span className="w-2 h-2 rounded-full bg-brand-primary mt-1.5 shrink-0" />{item}</li>)}</ul></Card>
        <Card><h2 className="text-base font-bold text-text-primary">Preparación</h2><ol className="space-y-4 mt-4">{recipe.steps.map((step, index) => <li key={`${step}-${index}`} className="text-sm text-text-secondary flex gap-3"><span className="w-7 h-7 rounded-full bg-brand-soft text-brand-strong font-bold flex items-center justify-center shrink-0">{index + 1}</span><span className="pt-1">{step}</span></li>)}</ol></Card>
      </div>
    </div>
  );
}
