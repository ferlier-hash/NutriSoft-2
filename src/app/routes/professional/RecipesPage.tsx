import React, { useMemo, useState } from 'react';
import { Clock3, CookingPot, Flame, Plus, Search, Sparkles, Users, X } from 'lucide-react';
import { useMock } from '../../provider';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Dialog } from '../../../components/ui/Dialog';
import { useToast } from '../../../components/ui/Toast';
import type { ProfessionalRecipe, RecipeCategory, PublicationStatus } from '../../../types';

const categories: Array<'Todas' | RecipeCategory> = ['Todas', 'Desayunos', 'Almuerzos', 'Cenas', 'Snacks'];

export const RecipesPage: React.FC = () => {
  const { professionalRecipes, professionalPatients, addProfessionalRecipe, setProfessionalRecipeStatus, duplicateProfessionalRecipe } = useMock();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'Todas' | RecipeCategory>('Todas');
  const [statusFilter, setStatusFilter] = useState<'all' | PublicationStatus>('all');
  const [selectedRecipe, setSelectedRecipe] = useState<ProfessionalRecipe | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<RecipeCategory>('Desayunos');
  const [tags, setTags] = useState('');
  const [prepMinutes, setPrepMinutes] = useState('20');
  const [servings, setServings] = useState('2');
  const [calories, setCalories] = useState('400');
  const [protein, setProtein] = useState('20');
  const [carbs, setCarbs] = useState('45');
  const [fat, setFat] = useState('15');
  const [ingredients, setIngredients] = useState('');
  const [steps, setSteps] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const availableTags = useMemo(() => Array.from(new Set(professionalRecipes.flatMap(recipe => recipe.tags))), [professionalRecipes]);
  const [tagFilter, setTagFilter] = useState('Todas');

  const filteredRecipes = useMemo(() => professionalRecipes.filter(recipe => {
    const normalized = search.toLowerCase();
    const matchesSearch = `${recipe.title} ${recipe.category} ${recipe.tags.join(' ')}`.toLowerCase().includes(normalized);
    const matchesCategory = categoryFilter === 'Todas' || recipe.category === categoryFilter;
    const matchesTag = tagFilter === 'Todas' || recipe.tags.includes(tagFilter);
    const matchesStatus = statusFilter === 'all' || recipe.status === statusFilter;
    return matchesSearch && matchesCategory && matchesTag && matchesStatus;
  }), [categoryFilter, professionalRecipes, search, statusFilter, tagFilter]);

  const resetForm = () => {
    setIsCreateOpen(false); setTitle(''); setCategory('Desayunos'); setTags(''); setPrepMinutes('20'); setServings('2');
    setCalories('400'); setProtein('20'); setCarbs('45'); setFat('15'); setIngredients(''); setSteps(''); setImageUrl('');
  };

  const submitRecipe = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
      const status = submitter?.value === 'draft' ? 'draft' : 'published';
      const recipe = addProfessionalRecipe({
        title,
        category,
        tags: tags.split(',').map(item => item.trim()),
        prepMinutes: Number(prepMinutes),
        servings: Number(servings),
        calories: Number(calories),
        proteinGrams: Number(protein),
        carbGrams: Number(carbs),
        fatGrams: Number(fat),
        ingredients: ingredients.split('\n'),
        steps: steps.split('\n'),
        imageUrl,
        status,
      });
      showToast(
        status === 'published' ? 'Receta publicada' : 'Borrador guardado',
        status === 'published'
          ? `${recipe.title} ya está disponible para tus pacientes asignados.`
          : `${recipe.title} permanece privada hasta que decidas publicarla.`
      );
      resetForm();
    } catch (error) {
      showToast('No se pudo publicar', error instanceof Error ? error.message : 'Revisá los datos ingresados.', 'error');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h2 className="text-2xl font-bold text-text-primary flex items-center gap-2"><CookingPot className="w-6 h-6 text-brand-strong" /> Recetario y nutrición</h2><p className="text-xs text-text-secondary mt-1">Creá recetas claras, visuales y listas para compartir con tus pacientes.</p></div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> Nueva receta</Button>
      </div>

      <div className="rounded-2xl border border-[#C6D4F8] bg-[#F4F6FE] p-4 flex flex-col sm:flex-row sm:items-center gap-3 text-[#2D3F99]">
        <span className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center shrink-0"><Sparkles className="w-5 h-5" /></span>
        <div className="flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-bold">Formateo automático con IA</p><Badge variant="info">Próximamente</Badge></div><p className="text-[11px] leading-relaxed mt-1">La IA convertirá un borrador libre en esta estructura: resumen visual, métricas, ingredientes ordenados y preparación paso a paso. El profesional siempre revisará antes de publicar.</p></div>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center gap-3 justify-between">
          <div className="relative w-full xl:w-96">
            <label htmlFor="recipe-search" className="sr-only">Buscar recetas</label>
            <Search className="pointer-events-none w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input id="recipe-search" className="form-control pl-11 pr-11" placeholder="Buscar receta, categoría o etiqueta..." value={search} onChange={event => setSearch(event.target.value)} />
            {search && (
              <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg text-text-tertiary hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong" aria-label="Limpiar búsqueda de recetas" onClick={() => setSearch('')}>
                <X className="w-4 h-4 mx-auto" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1" aria-label="Filtrar por categoría">{categories.map(item => <button key={item} type="button" aria-pressed={categoryFilter === item} onClick={() => setCategoryFilter(item)} className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${categoryFilter === item ? 'bg-brand-soft text-brand-strong border-[#BDE9EA]' : 'bg-white text-text-secondary border-border-subtle hover:border-border-hover'}`}>{item}</button>)}</div>
          <div className="flex flex-col sm:flex-row gap-2"><div><label htmlFor="recipe-tag-filter" className="sr-only">Filtrar por etiqueta nutricional</label><select id="recipe-tag-filter" className="form-control min-w-40" value={tagFilter} onChange={event => setTagFilter(event.target.value)}><option>Todas</option>{availableTags.map(tag => <option key={tag}>{tag}</option>)}</select></div><div><label htmlFor="recipe-status-filter" className="sr-only">Filtrar por estado editorial</label><select id="recipe-status-filter" className="form-control min-w-40" value={statusFilter} onChange={event => setStatusFilter(event.target.value as 'all' | PublicationStatus)}><option value="all">Todos los estados</option><option value="published">Publicadas</option><option value="draft">Borradores</option><option value="retired">Retiradas</option></select></div></div>
        </div>

        {filteredRecipes.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecipes.map(recipe => (
              <article key={recipe.id} className="rounded-2xl border border-border-subtle bg-surface overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                <button type="button" onClick={() => setSelectedRecipe(recipe)} className="w-full text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong rounded-2xl">
                  <div className="h-44 bg-surface-tinted bg-cover bg-center relative" style={{ backgroundImage: `linear-gradient(180deg,transparent 42%,rgba(21,27,34,.62)),url(${recipe.imageUrl})` }}>
                    <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-1">{recipe.tags.slice(0, 2).map(tag => <span key={tag} className="bg-white/90 backdrop-blur-sm text-text-primary border border-white px-2.5 py-1 rounded-full text-[10px] font-bold">{tag}</span>)}<span className="ml-auto bg-white/90 backdrop-blur-sm text-text-primary border border-white px-2.5 py-1 rounded-full text-[10px] font-bold">{recipe.status === 'published' ? 'Publicada' : recipe.status === 'draft' ? 'Borrador' : 'Retirada'}</span></div>
                    <p className="absolute bottom-3 left-4 right-4 text-white text-lg font-bold leading-tight drop-shadow">{recipe.title}</p>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between"><Badge variant="info">{recipe.category}</Badge><span className={`text-[10px] font-semibold ${recipe.status === 'published' ? 'text-semantic-success' : 'text-text-tertiary'}`}>{recipe.status === 'published' ? `Visible para ${professionalPatients.length} pacientes` : 'Sólo visible para vos'}</span></div>
                    <div className="grid grid-cols-3 gap-2 mt-4 text-center"><div><Clock3 className="w-4 h-4 mx-auto text-brand-strong" /><p className="text-xs font-bold mt-1">{recipe.prepMinutes} min</p><p className="text-[10px] text-text-tertiary">Preparación</p></div><div><Flame className="w-4 h-4 mx-auto text-brand-strong" /><p className="text-xs font-bold mt-1">{recipe.calories}</p><p className="text-[10px] text-text-tertiary">kcal</p></div><div><Users className="w-4 h-4 mx-auto text-brand-strong" /><p className="text-xs font-bold mt-1">{recipe.servings}</p><p className="text-[10px] text-text-tertiary">{recipe.servings === 1 ? 'Porción' : 'Porciones'}</p></div></div>
                    <div className="grid grid-cols-3 gap-1 mt-4 rounded-xl bg-surface-subtle p-2 text-center"><p className="text-[10px] text-text-secondary"><strong className="block text-text-primary text-xs">{recipe.proteinGrams} g</strong>Proteínas</p><p className="text-[10px] text-text-secondary"><strong className="block text-text-primary text-xs">{recipe.carbGrams} g</strong>Carbos</p><p className="text-[10px] text-text-secondary"><strong className="block text-text-primary text-xs">{recipe.fatGrams} g</strong>Grasas</p></div>
                  </div>
                </button>
              </article>
            ))}
          </div>
        ) : <div className="rounded-2xl bg-surface-subtle py-12 text-center"><CookingPot className="w-7 h-7 text-text-tertiary mx-auto" /><p className="text-sm font-semibold mt-2">No encontramos recetas</p><p className="text-xs text-text-secondary mt-1">Probá cambiando los filtros o creá una receta nueva.</p></div>}
      </Card>

      <Dialog isOpen={Boolean(selectedRecipe)} onClose={() => setSelectedRecipe(null)} title={selectedRecipe?.title || 'Detalle de receta'} description={selectedRecipe ? `${selectedRecipe.category} · ${selectedRecipe.prepMinutes} minutos · ${selectedRecipe.servings} ${selectedRecipe.servings === 1 ? 'porción' : 'porciones'}` : undefined}>
        {selectedRecipe && <div className="space-y-5"><div className="flex flex-wrap items-center gap-2"><Badge variant={selectedRecipe.status === 'published' ? 'active' : selectedRecipe.status === 'draft' ? 'neutral' : 'suspended'}>{selectedRecipe.status === 'published' ? 'Publicada' : selectedRecipe.status === 'draft' ? 'Borrador' : 'Retirada'}</Badge>{selectedRecipe.sourceTitle && <span className="text-[11px] text-text-tertiary">Copia de “{selectedRecipe.sourceTitle}”</span>}</div><div className="grid grid-cols-4 gap-2 rounded-2xl bg-surface-subtle p-3 text-center"><p className="text-[10px] text-text-secondary"><strong className="block text-base text-text-primary">{selectedRecipe.calories}</strong>kcal</p><p className="text-[10px] text-text-secondary"><strong className="block text-base text-text-primary">{selectedRecipe.proteinGrams} g</strong>Proteínas</p><p className="text-[10px] text-text-secondary"><strong className="block text-base text-text-primary">{selectedRecipe.carbGrams} g</strong>Carbos</p><p className="text-[10px] text-text-secondary"><strong className="block text-base text-text-primary">{selectedRecipe.fatGrams} g</strong>Grasas</p></div><section><h4 className="text-sm font-bold text-text-primary mb-2">Ingredientes</h4><ul className="space-y-2">{selectedRecipe.ingredients.map(item => <li key={item} className="text-xs text-text-secondary flex gap-2"><span className="w-1.5 h-1.5 rounded-full bg-brand-primary mt-1.5 shrink-0" />{item}</li>)}</ul></section><section><h4 className="text-sm font-bold text-text-primary mb-2">Preparación</h4><ol className="space-y-3">{selectedRecipe.steps.map((step, index) => <li key={step} className="text-xs text-text-secondary flex gap-3"><span className="w-6 h-6 rounded-full bg-brand-soft text-brand-strong font-bold flex items-center justify-center shrink-0">{index + 1}</span><span className="pt-1">{step}</span></li>)}</ol></section><div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-border-subtle"><Button type="button" variant="ghost" onClick={() => { const copy = duplicateProfessionalRecipe(selectedRecipe.id); showToast('Copia creada', `${copy.title} se guardó como borrador sin modificar la original.`); setSelectedRecipe(null); }}>Duplicar como borrador</Button><Button type="button" variant="secondary" onClick={() => { const nextStatus: PublicationStatus = selectedRecipe.status === 'published' ? 'retired' : selectedRecipe.status === 'draft' ? 'published' : 'draft'; setProfessionalRecipeStatus(selectedRecipe.id, nextStatus); showToast(nextStatus === 'published' ? 'Receta publicada' : nextStatus === 'retired' ? 'Receta retirada' : 'Borrador restaurado', nextStatus === 'published' ? 'Ya está disponible para tus pacientes.' : 'Dejó de estar visible para pacientes.'); setSelectedRecipe(null); }}>{selectedRecipe.status === 'published' ? 'Retirar receta' : selectedRecipe.status === 'draft' ? 'Publicar receta' : 'Restaurar borrador'}</Button><Button type="button" variant="ghost" onClick={() => setSelectedRecipe(null)}>Cerrar</Button></div></div>}
      </Dialog>

      <Dialog isOpen={isCreateOpen} onClose={resetForm} title="Nueva receta" description="Completá la ficha y decidí si querés guardarla en privado o publicarla para tus pacientes.">
        <form onSubmit={submitRecipe} className="space-y-4">
          <div><label htmlFor="recipe-title" className="form-label">Nombre de la receta *</label><input id="recipe-title" className="form-control" value={title} onChange={event => setTitle(event.target.value)} required /></div>
          <div className="grid grid-cols-2 gap-3"><div><label htmlFor="recipe-category" className="form-label">Categoría</label><select id="recipe-category" className="form-control" value={category} onChange={event => setCategory(event.target.value as RecipeCategory)}>{categories.slice(1).map(item => <option key={item}>{item}</option>)}</select></div><div><label htmlFor="recipe-tags" className="form-label">Etiquetas</label><input id="recipe-tags" className="form-control" value={tags} onChange={event => setTags(event.target.value)} placeholder="Veggie, High Protein" /></div></div>
          <div className="grid grid-cols-3 gap-3"><div><label htmlFor="recipe-time" className="form-label">Minutos</label><input id="recipe-time" type="number" min="1" className="form-control" value={prepMinutes} onChange={event => setPrepMinutes(event.target.value)} /></div><div><label htmlFor="recipe-servings" className="form-label">Porciones</label><input id="recipe-servings" type="number" min="1" className="form-control" value={servings} onChange={event => setServings(event.target.value)} /></div><div><label htmlFor="recipe-calories" className="form-label">Calorías</label><input id="recipe-calories" type="number" min="0" className="form-control" value={calories} onChange={event => setCalories(event.target.value)} /></div></div>
          <div className="grid grid-cols-3 gap-3"><div><label htmlFor="recipe-protein" className="form-label">Proteína (g)</label><input id="recipe-protein" type="number" min="0" className="form-control" value={protein} onChange={event => setProtein(event.target.value)} /></div><div><label htmlFor="recipe-carbs" className="form-label">Carbos (g)</label><input id="recipe-carbs" type="number" min="0" className="form-control" value={carbs} onChange={event => setCarbs(event.target.value)} /></div><div><label htmlFor="recipe-fat" className="form-label">Grasas (g)</label><input id="recipe-fat" type="number" min="0" className="form-control" value={fat} onChange={event => setFat(event.target.value)} /></div></div>
          <div><label htmlFor="recipe-ingredients" className="form-label">Ingredientes * <span className="font-normal text-text-tertiary">(uno por línea)</span></label><textarea id="recipe-ingredients" rows={4} className="form-control resize-none" value={ingredients} onChange={event => setIngredients(event.target.value)} required /></div>
          <div><label htmlFor="recipe-steps" className="form-label">Preparación * <span className="font-normal text-text-tertiary">(un paso por línea)</span></label><textarea id="recipe-steps" rows={4} className="form-control resize-none" value={steps} onChange={event => setSteps(event.target.value)} required /></div>
          <div><label htmlFor="recipe-image" className="form-label">URL de fotografía <span className="font-normal text-text-tertiary">(opcional)</span></label><input id="recipe-image" type="url" className="form-control" value={imageUrl} onChange={event => setImageUrl(event.target.value)} placeholder="https://..." /></div>
          <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-border-subtle"><Button type="button" variant="ghost" onClick={resetForm}>Cancelar</Button><Button type="submit" name="intent" value="draft" variant="secondary">Guardar borrador</Button><Button type="submit" name="intent" value="published">Publicar receta</Button></div>
        </form>
      </Dialog>
    </div>
  );
};
