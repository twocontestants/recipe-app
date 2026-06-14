'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Recipe, Ingredient } from '@/lib/db';
import { showToast } from '@/components/Toast';


const PROTEINS = ['chicken', 'beef', 'pork', 'lamb', 'fish', 'seafood', 'tofu', 'eggs', 'legumes', 'dairy'] as const;
type ProteinType = typeof PROTEINS[number];

const PROTEIN_COLORS: Record<string, string> = {
  chicken: '#E8A838',
  beef:    '#C0392B',
  pork:    '#D4697A',
  lamb:    '#8E44AD',
  fish:    '#2980B9',
  seafood: '#16A085',
  tofu:    '#27AE60',
  eggs:    '#D4AC0D',
  legumes: '#A04000',
  dairy:   '#717D7E',
};

const PROTEIN_EMOJI: Record<string, string> = {
  chicken: '🍗',
  beef:    '🥩',
  pork:    '🐷',
  lamb:    '🐑',
  fish:    '🐟',
  seafood: '🦐',
  tofu:    '🫘',
  eggs:    '🥚',
  legumes: '🫘',
  dairy:   '🧀',
};

function ProteinBadge({ protein, size = 'sm' }: { protein?: string; size?: 'sm' | 'xs' }) {
  if (!protein) return null;
  const color = PROTEIN_COLORS[protein] || '#888';
  const emoji = PROTEIN_EMOJI[protein] || '🍽';
  return (
    <span
      className={`protein-badge protein-badge-${size}`}
      style={{ background: color + '22', color, borderColor: color + '44' }}
      title={`Primary protein: ${protein}`}
    >
      {emoji} {protein}
    </span>
  );
}


// ── Planner date helpers ──────────────────────────────────────────────────
function getThisMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff); d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}
function todayDayKey(): string {
  const KEYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  const d = new Date().getDay();
  return KEYS[d === 0 ? 6 : d - 1];
}
function mondayOfWeek(weekStart: string): Date {
  return new Date(weekStart + 'T00:00:00');
}
function formatShortWeek(weekStart: string): string {
  const mon = mondayOfWeek(weekStart);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return `${mon.toLocaleDateString('en-AU',{day:'numeric',month:'short'})} – ${sun.toLocaleDateString('en-AU',{day:'numeric',month:'short'})}`;
}
function isThisWeek(weekStart: string): boolean {
  return weekStart === getThisMonday();
}
function isNextWeek(weekStart: string): boolean {
  const next = new Date(getThisMonday() + 'T00:00:00');
  next.setDate(next.getDate() + 7);
  return weekStart === next.toISOString().split('T')[0];
}

const EMPTY_RECIPE = {
  title: '',
  description: '',
  source_url: '',
  image_url: '',
  servings: 4,
  prep_time: undefined as number | undefined,
  cook_time: undefined as number | undefined,
  ingredients: [{ amount: '', unit: '', name: '' }] as Ingredient[],
  steps: [''] as string[],
  tags: [] as string[],
  primary_protein: '' as string,
};

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [form, setForm] = useState({ ...EMPTY_RECIPE });
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [scraping, setScraping] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [viewRecipe, setViewRecipe] = useState<Recipe | null>(null);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [plannerModal, setPlannerModal] = useState<{ recipe: Recipe } | null>(null);
  const [plannerWeek, setPlannerWeek] = useState(() => getThisMonday());
  const [plannerDay, setPlannerDay] = useState(() => todayDayKey());
  const [plannerMeal, setPlannerMeal] = useState('dinner');
  const [addingToPlan, setAddingToPlan] = useState(false);
  const [weekPlan, setWeekPlan] = useState<Record<string, string[]>>({});

  const fetchRecipes = useCallback(async () => {
    try {
      const res = await fetch('/api/recipes');
      if (!res.ok) throw new Error('Failed to load');
      setRecipes(await res.json());
    } catch {
      showToast('Failed to load recipes', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecipes(); }, [fetchRecipes]);

  // Auto-open recipe from ?open=<id> query param (linked from planner)
  const searchParams = useSearchParams();
  useEffect(() => {
    const openId = searchParams.get('open');
    if (openId && recipes.length > 0) {
      const recipe = recipes.find(r => r.id === openId);
      if (recipe) setViewRecipe(recipe);
    }
  }, [searchParams, recipes]);

  const openAddModal = () => {
    setEditingRecipe(null);
    setForm({ ...EMPTY_RECIPE, ingredients: [{ amount: '', unit: '', name: '' }], steps: [''] });
    setScrapeUrl('');
    setShowModal(true);
  };

  const openEditModal = (r: Recipe) => {
    setEditingRecipe(r);
    setForm({
      title: r.title,
      description: r.description || '',
      source_url: r.source_url || '',
      image_url: r.image_url || '',
      servings: r.servings,
      prep_time: r.prep_time,
      cook_time: r.cook_time,
      ingredients: r.ingredients.length > 0 ? r.ingredients : [{ amount: '', unit: '', name: '' }],
      steps: r.steps.length > 0 ? r.steps : [''],
      tags: r.tags,
      primary_protein: r.primary_protein || '',
    });
    setShowModal(true);
    setViewRecipe(null);
  };

  const handlePasteImport = async () => {
    if (!pasteText.trim()) return;
    setParsing(true);
    try {
      const res = await fetch('/api/parse-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pasteText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForm(prev => ({
        ...prev,
        title: data.title || '',
        description: data.description || '',
        servings: data.servings || 4,
        prep_time: data.prep_time ?? undefined,
        cook_time: data.cook_time ?? undefined,
        ingredients: data.ingredients?.length > 0 ? data.ingredients : [{ amount: '', unit: '', name: '' }],
        steps: data.steps?.length > 0 ? data.steps : [''],
        tags: data.tags || [],
        primary_protein: data.primary_protein || '',
      }));
      setShowPasteModal(false);
      setPasteText('');
      setShowModal(true);
      showToast('Recipe parsed! Review and save.', 'success');
    } catch (e) {
      showToast(`Parse failed: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
    } finally {
      setParsing(false);
    }
  };

  const fetchWeekPlan = async (week: string) => {
    try {
      const res = await fetch(`/api/planner?weekStart=${week}`);
      const plans = await res.json();
      // Build map: dayKey → [meal_type, ...]
      const map: Record<string, string[]> = {};
      for (const p of plans) {
        if (!map[p.day_of_week]) map[p.day_of_week] = [];
        map[p.day_of_week].push(p.meal_type);
      }
      setWeekPlan(map);
    } catch { /* silent */ }
  };

  const handleAddToPlanner = async () => {
    if (!plannerModal) return;
    setAddingToPlan(true);
    try {
      const res = await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week_start: plannerWeek,
          day_of_week: plannerDay,
          meal_type: plannerMeal,
          recipe_id: plannerModal.recipe.id,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const dayLabel = plannerDay.charAt(0).toUpperCase() + plannerDay.slice(1);
      const mealLabel = plannerMeal.charAt(0).toUpperCase() + plannerMeal.slice(1);
      showToast(`${mealLabel} added for ${dayLabel}! 🗓`, 'success');
      setPlannerModal(null);
    } catch (e) {
      showToast(`Failed: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
    } finally {
      setAddingToPlan(false);
    }
  };

  useEffect(() => {
    if (plannerModal) fetchWeekPlan(plannerWeek);
  }, [plannerModal, plannerWeek]);

  const handleScrape = async () => {
    if (!scrapeUrl.trim()) return;
    setScraping(true);
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scrapeUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForm(prev => ({
        ...prev,
        title: data.title || '',
        description: data.description || '',
        source_url: scrapeUrl,
        image_url: data.image_url || '',
        servings: data.servings || 4,
        prep_time: data.prep_time,
        cook_time: data.cook_time,
        ingredients: data.ingredients?.length > 0 ? data.ingredients : [{ amount: '', unit: '', name: '' }],
        steps: data.steps?.length > 0 ? data.steps : [''],
        tags: data.tags || [],
        primary_protein: data.primary_protein || '',
      }));
      showToast(data.primary_protein ? `Recipe scraped! Auto-tagged as ${data.primary_protein}. Review and save.` : 'Recipe scraped! Review and save.', 'success');
    } catch (e) {
      showToast(`Scrape failed: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
    } finally {
      setScraping(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) { showToast('Title is required', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        ingredients: form.ingredients.filter(i => i.name.trim()),
        steps: form.steps.filter(s => s.trim()),
      };
      const url = editingRecipe ? `/api/recipes/${editingRecipe.id}` : '/api/recipes';
      const method = editingRecipe ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      await fetchRecipes();
      setShowModal(false);
      showToast(editingRecipe ? 'Recipe updated!' : 'Recipe saved!', 'success');
    } catch (e) {
      showToast(`Failed to save: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this recipe?')) return;
    try {
      const res = await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      await fetchRecipes();
      setViewRecipe(null);
      showToast('Recipe deleted', 'info');
    } catch {
      showToast('Failed to delete recipe', 'error');
    }
  };

  const updateIngredient = (i: number, field: keyof Ingredient, val: string) => {
    setForm(prev => {
      const ingredients = [...prev.ingredients];
      ingredients[i] = { ...ingredients[i], [field]: val };
      return { ...prev, ingredients };
    });
  };

  const addIngredient = () => setForm(prev => ({
    ...prev,
    ingredients: [...prev.ingredients, { amount: '', unit: '', name: '' }],
  }));

  const removeIngredient = (i: number) => setForm(prev => ({
    ...prev,
    ingredients: prev.ingredients.filter((_, idx) => idx !== i),
  }));

  const updateStep = (i: number, val: string) => setForm(prev => {
    const steps = [...prev.steps];
    steps[i] = val;
    return { ...prev, steps };
  });

  const addStep = () => setForm(prev => ({ ...prev, steps: [...prev.steps, ''] }));
  const removeStep = (i: number) => setForm(prev => ({ ...prev, steps: prev.steps.filter((_, idx) => idx !== i) }));

  const filtered = recipes.filter(r =>
    !search || r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  // Planner modal is shared between grid and detail views
  const plannerModalJsx = plannerModal && (() => {
    const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    const DAY_SHORT: Record<string,string> = { monday:'Mon', tuesday:'Tue', wednesday:'Wed', thursday:'Thu', friday:'Fri', saturday:'Sat', sunday:'Sun' };
    const DAY_DATE: Record<string,number> = (() => {
      const mon = mondayOfWeek(plannerWeek);
      const map: Record<string,number> = {};
      DAYS.forEach((k, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); map[k] = d.getDate(); });
      return map;
    })();
    const today = todayDayKey();
    const shiftWeek = (n: number) => {
      const d = new Date(plannerWeek + 'T00:00:00'); d.setDate(d.getDate() + n * 7);
      const newWeek = d.toISOString().split('T')[0];
      setPlannerWeek(newWeek);
    };
    const weekLabel = isThisWeek(plannerWeek) ? 'This week' : isNextWeek(plannerWeek) ? 'Next week' : formatShortWeek(plannerWeek);

    return (
      <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setPlannerModal(null); }}>
        <div className="modal planner-quick-modal">
          {/* Header */}
          <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
            <div>
              <h2 className="modal-title" style={{ fontSize: '1.1rem' }}>Add to Planner</h2>
              <p className="pqm-recipe-name">{plannerModal?.recipe.title}</p>
            </div>
            <button className="modal-close" onClick={() => setPlannerModal(null)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Week selector */}
          <div className="pqm-week-row">
            <button className="pqm-week-arrow" onClick={() => shiftWeek(-1)} title="Previous week">‹</button>
            <span className="pqm-week-label">{weekLabel}</span>
            <button className="pqm-week-arrow" onClick={() => shiftWeek(1)} title="Next week">›</button>
          </div>

          {/* Day grid — shows date + occupancy dots */}
          <div className="pqm-day-grid">
            {DAYS.map(d => {
              const isToday = d === today && isThisWeek(plannerWeek);
              const isSelected = d === plannerDay;
              const occupied = weekPlan[d] || [];
              return (
                <button
                  key={d}
                  className={`pqm-day-btn ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                  onClick={() => setPlannerDay(d)}
                >
                  <span className="pqm-day-name">{DAY_SHORT[d]}</span>
                  <span className="pqm-day-date">{DAY_DATE[d]}</span>
                  <span className="pqm-day-dots">
                    {occupied.length > 0
                      ? occupied.slice(0, 3).map((_, i) => <span key={i} className="pqm-dot" />)
                      : <span className="pqm-dot-empty" />}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Action */}
          <button
            className="pqm-add-btn"
            onClick={handleAddToPlanner}
            disabled={addingToPlan}
          >
            {addingToPlan
              ? <span className="loading-dots"><span/><span/><span/></span>
              : <>Add to {DAY_SHORT[plannerDay]}</>}
          </button>
        </div>
      </div>
    );
  })();

  if (viewRecipe) {
    return <>
      <RecipeDetail recipe={viewRecipe} onEdit={() => openEditModal(viewRecipe)} onDelete={() => handleDelete(viewRecipe.id)} onBack={() => setViewRecipe(null)} onAddToPlanner={() => setPlannerModal({ recipe: viewRecipe })} />
      {plannerModalJsx}
    </>;
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">My <em>Recipes</em></h1>
          <p className="page-subtitle">{recipes.length} saved recipes</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search recipes…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '200px', marginBottom: 0 }}
          />
          <button className="btn btn-secondary" onClick={() => { setEditingRecipe(null); setForm({ ...EMPTY_RECIPE, ingredients: [{ amount: '', unit: '', name: '' }], steps: [''] }); setShowPasteModal(true); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            Paste Recipe
          </button>
          <button className="btn btn-primary" onClick={openAddModal}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Add Recipe
          </button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="loading-dots"><span/><span/><span/></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🍽️</div>
          <h3>{search ? 'No recipes found' : 'Your cookbook is empty'}</h3>
          <p>{search ? 'Try a different search term' : 'Add your first recipe to get started'}</p>
        </div>
      ) : (
        <div className="recipe-grid">
          {filtered.map(recipe => (
            <div key={recipe.id} className="card" onClick={() => setViewRecipe(recipe)} style={{ cursor: 'pointer' }}>
              <div className="recipe-card-img-wrap" onClick={e => e.stopPropagation()}>
                {recipe.image_url ? (
                  <img src={recipe.image_url} alt={recipe.title} className="recipe-card-img" onClick={() => setViewRecipe(recipe)} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div className="recipe-card-img-placeholder" onClick={() => setViewRecipe(recipe)}>🍳</div>
                )}
                <button
                  className="card-plan-btn"
                  onClick={() => setPlannerModal({ recipe })}
                  title="Add to meal planner"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"/></svg>
                  Plan
                </button>
              </div>
              <div className="recipe-card-body">
                <h3 className="recipe-card-title">{recipe.title}</h3>
                <div className="recipe-card-meta">
                  {recipe.prep_time && <span>⏱ {recipe.prep_time}m prep</span>}
                  {recipe.cook_time && <span>🔥 {recipe.cook_time}m cook</span>}
                  <span>👤 {recipe.servings} servings</span>
                </div>
                {recipe.description && <p className="recipe-card-desc">{recipe.description}</p>}
                {recipe.tags?.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                    {recipe.tags.slice(0, 3).map(t => <span key={t} className="tag">{t}</span>)}
                  </div>
                )}
              </div>
              <div className="recipe-card-actions" onClick={e => e.stopPropagation()}>
                <button className="btn btn-primary btn-sm" onClick={() => setPlannerModal({ recipe })}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"/></svg>
                  Plan
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(recipe)}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(recipe.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal" style={{ maxWidth: '780px' }}>
            <div className="modal-header">
              <h2 className="modal-title">{editingRecipe ? 'Edit Recipe' : 'Add Recipe'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {!editingRecipe && (
              <div className="form-group">
                <label>Import from URL</label>
                <div className="url-input-group">
                  <input type="url" placeholder="https://example.com/recipe…" value={scrapeUrl} onChange={e => setScrapeUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleScrape()} />
                  <button className="btn btn-secondary" onClick={handleScrape} disabled={scraping || !scrapeUrl.trim()}>
                    {scraping ? <span className="loading-dots"><span/><span/><span/></span> : 'Import'}
                  </button>
                </div>
                <p className="scrape-hint">Works with AllRecipes, BBC Good Food, Serious Eats, NYT Cooking, and most recipe sites · <button className="link-btn" onClick={() => { setShowModal(false); setShowPasteModal(true); }}>Paste text instead →</button></p>
              </div>
            )}

            {!editingRecipe && <div className="divider" style={{ margin: '1rem 0' }} />}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Title *</label>
                <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Recipe name" />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description…" rows={2} />
              </div>
              <div className="form-group">
                <label>Servings</label>
                <input type="number" value={form.servings} min={1} onChange={e => setForm(p => ({ ...p, servings: +e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Image URL</label>
                <input type="url" value={form.image_url} onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))} placeholder="https://…" />
              </div>
              <div className="form-group">
                <label>Prep time (minutes)</label>
                <input type="number" value={form.prep_time || ''} min={0} onChange={e => setForm(p => ({ ...p, prep_time: e.target.value ? +e.target.value : undefined }))} />
              </div>
              <div className="form-group">
                <label>Cook time (minutes)</label>
                <input type="number" value={form.cook_time || ''} min={0} onChange={e => setForm(p => ({ ...p, cook_time: e.target.value ? +e.target.value : undefined }))} />
              </div>
              <div className="form-group">
                <label>Source URL</label>
                <input type="url" value={form.source_url} onChange={e => setForm(p => ({ ...p, source_url: e.target.value }))} placeholder="https://…" />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Primary Protein</label>
                <div className="protein-picker">
                  <button
                    type="button"
                    className={`protein-btn ${!form.primary_protein ? 'active none' : ''}`}
                    onClick={() => setForm(p => ({ ...p, primary_protein: '' }))}
                  >
                    None / Veg
                  </button>
                  {PROTEINS.map(p => (
                    <button
                      key={p}
                      type="button"
                      className={`protein-btn ${form.primary_protein === p ? 'active' : ''}`}
                      style={form.primary_protein === p ? { background: PROTEIN_COLORS[p], borderColor: PROTEIN_COLORS[p], color: 'white' } : {}}
                      onClick={() => setForm(prev => ({ ...prev, primary_protein: prev.primary_protein === p ? '' : p }))}
                    >
                      {PROTEIN_EMOJI[p]} {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Tags (comma separated)</label>
                <input type="text" value={form.tags.join(', ')} onChange={e => setForm(p => ({ ...p, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))} placeholder="italian, pasta, quick" />
              </div>
            </div>

            <div className="form-group">
              <label>Ingredients</label>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 100px 1fr auto', gap: '0.35rem', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--ink-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Amount</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--ink-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Unit</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--ink-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Ingredient</span>
                <span />
              </div>
              {form.ingredients.map((ing, i) => (
                <div key={i} className="ingredient-row">
                  <input type="text" value={ing.amount} onChange={e => updateIngredient(i, 'amount', e.target.value)} placeholder="2" />
                  <input type="text" value={ing.unit} onChange={e => updateIngredient(i, 'unit', e.target.value)} placeholder="cups" />
                  <input type="text" value={ing.name} onChange={e => updateIngredient(i, 'name', e.target.value)} placeholder="flour" />
                  <button className="btn btn-ghost" style={{ padding: '0.4rem', color: 'var(--ink-muted)' }} onClick={() => removeIngredient(i)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              ))}
              <button className="add-row-btn" onClick={addIngredient}>+ Add ingredient</button>
            </div>

            <div className="form-group">
              <label>Steps</label>
              {form.steps.map((step, i) => (
                <div key={i} className="step-row">
                  <div className="step-number">{i + 1}</div>
                  <textarea value={step} onChange={e => updateStep(i, e.target.value)} placeholder={`Step ${i + 1}…`} rows={2} />
                  <button className="btn btn-ghost" style={{ padding: '0.4rem', color: 'var(--ink-muted)', marginTop: '0.65rem' }} onClick={() => removeStep(i)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              ))}
              <button className="add-row-btn" onClick={addStep}>+ Add step</button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <span className="loading-dots"><span/><span/><span/></span> : (editingRecipe ? 'Save Changes' : 'Save Recipe')}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* ── Planner quick-add modal ── */
        .planner-quick-modal { max-width: 400px; padding: 1.5rem; }
        .pqm-recipe-name {
          font-family: var(--font-display); font-style: italic;
          color: var(--ink-soft); font-size: 0.95rem; margin: 0.1rem 0 0;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          max-width: 280px;
        }
        .pqm-week-row {
          display: flex; align-items: center; gap: 0.5rem;
          margin: 1rem 0 0.75rem; background: var(--parchment);
          border-radius: 8px; padding: 0.4rem 0.5rem;
        }
        .pqm-week-label {
          flex: 1; text-align: center; font-size: 0.82rem;
          color: var(--ink-soft); font-weight: 500;
        }
        .pqm-week-arrow {
          background: none; border: none; font-size: 1.2rem; cursor: pointer;
          color: var(--ink-muted); padding: 0 0.35rem; line-height: 1;
          border-radius: 4px; transition: color 0.15s;
        }
        .pqm-week-arrow:hover { color: var(--rust); }

        /* Day grid */
        .pqm-day-grid {
          display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.3rem;
          margin-bottom: 1rem;
        }
        .pqm-day-btn {
          display: flex; flex-direction: column; align-items: center;
          gap: 2px; padding: 0.5rem 0.2rem; border: 1.5px solid var(--border);
          border-radius: 8px; background: white; cursor: pointer;
          transition: all 0.15s; position: relative;
        }
        .pqm-day-btn:hover { border-color: var(--rust); }
        .pqm-day-btn.today { border-color: var(--sage); }
        .pqm-day-btn.today .pqm-day-name { color: var(--sage); }
        .pqm-day-btn.selected {
          border-color: var(--rust); background: var(--rust);
        }
        .pqm-day-btn.selected .pqm-day-name,
        .pqm-day-btn.selected .pqm-day-date { color: white; }
        .pqm-day-name {
          font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.06em;
          color: var(--ink-muted); font-weight: 500; line-height: 1;
        }
        .pqm-day-date {
          font-size: 0.95rem; font-family: var(--font-display);
          color: var(--ink); line-height: 1; font-weight: 300;
        }
        .pqm-day-dots { display: flex; gap: 2px; height: 5px; align-items: center; }
        .pqm-dot {
          width: 4px; height: 4px; border-radius: 50%; background: var(--sage); opacity: 0.7;
        }
        .pqm-day-btn.selected .pqm-dot { background: rgba(255,255,255,0.7); }
        .pqm-dot-empty {
          width: 4px; height: 4px; border-radius: 50%;
          border: 1px solid var(--border); opacity: 0.4;
        }


        /* Add button */
        .pqm-add-btn {
          width: 100%; padding: 0.8rem; background: var(--rust); color: white;
          border: none; border-radius: 8px; font-size: 0.9rem;
          font-family: var(--font-body); cursor: pointer; transition: opacity 0.15s;
          font-weight: 500; letter-spacing: 0.02em;
          display: flex; align-items: center; justify-content: center; gap: 0.4rem;
        }
        .pqm-add-btn:hover:not(:disabled) { opacity: 0.88; }
        .pqm-add-btn:disabled { opacity: 0.5; cursor: not-allowed; }


        /* Card plan button — thumbnail overlay */
        .recipe-card-img-wrap { position: relative; overflow: hidden; }
        .recipe-card-img-wrap .recipe-card-img,
        .recipe-card-img-wrap .recipe-card-img-placeholder { display: block; width: 100%; cursor: pointer; }
        .card-plan-btn {
          position: absolute; bottom: 8px; right: 8px;
          display: inline-flex; align-items: center; gap: 5px;
          padding: 0.38rem 0.7rem;
          background: var(--rust); color: white; border: none;
          border-radius: 99px; font-size: 0.72rem; font-family: var(--font-body);
          font-weight: 500; cursor: pointer; letter-spacing: 0.02em;
          opacity: 0; transform: translateY(4px);
          transition: opacity 0.18s ease, transform 0.18s ease;
          box-shadow: 0 2px 10px rgba(0,0,0,0.28); white-space: nowrap;
        }
        .recipe-card-img-wrap:hover .card-plan-btn { opacity: 1; transform: translateY(0); }
        @media (hover: none) { .card-plan-btn { opacity: 1; transform: none; } }

        .link-btn {
          background: none; border: none; padding: 0; cursor: pointer;
          color: var(--rust); font-size: inherit; font-family: inherit;
          text-decoration: underline; text-underline-offset: 2px;
        }
        .link-btn:hover { opacity: 0.75; }
        .plan-picker-grid {
          display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.3rem;
        }
        .plan-picker-btn {
          padding: 0.35rem 0.2rem; border: 1px solid var(--border); border-radius: 6px;
          background: white; color: var(--ink-soft); font-size: 0.72rem; cursor: pointer;
          font-family: var(--font-body); transition: all 0.15s; text-align: center;
        }
        .plan-picker-btn:hover { border-color: var(--rust); color: var(--rust); }
        .plan-picker-btn.active { background: var(--rust); border-color: var(--rust); color: white; }
      `}</style>


      {plannerModalJsx}


      {showPasteModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowPasteModal(false); }}>
          <div className="modal" style={{ maxWidth: '620px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Paste Recipe Text</h2>
              <button className="modal-close" onClick={() => setShowPasteModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
              Copy and paste the full recipe — ingredients, steps, and any other details. Claude will parse it into structured fields for you to review before saving.
            </p>

            <div className="form-group">
              <label>Recipe text</label>
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                placeholder={"Paste the full recipe here…\n\nIngredients:\n2 cups flour\n1 tsp salt\n...\n\nSteps:\n1. Mix dry ingredients...\n2. Add wet ingredients..."}
                rows={14}
                style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', resize: 'vertical' }}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowPasteModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handlePasteImport} disabled={parsing || !pasteText.trim()}>
                {parsing ? (
                  <><span className="loading-dots"><span/><span/><span/></span>&nbsp;Parsing…</>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                    Parse with AI
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function RecipeDetail({ recipe, onEdit, onDelete, onBack, onAddToPlanner }: {
  recipe: Recipe;
  onEdit: () => void;
  onDelete: () => void;
  onBack: () => void;
  onAddToPlanner: () => void;
}) {
  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-ghost" onClick={onBack}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back
          </button>
          <div>
            <h1 className="page-title" style={{ fontSize: '2rem' }}>{recipe.title}</h1>
            {recipe.tags?.length > 0 && (
              <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.35rem' }}>
                {recipe.tags.map(t => <span key={t} className="tag">{t}</span>)}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {recipe.source_url && (
            <a href={recipe.source_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
              View Source ↗
            </a>
          )}
          <button className="btn btn-primary btn-sm" onClick={onAddToPlanner}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '4px' }}><path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"/></svg>
            Add to Planner
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onEdit}>Edit</button>
          <button className="btn btn-danger btn-sm" onClick={onDelete}>Delete</button>
        </div>
      </div>

      {recipe.image_url ? (
        <img src={recipe.image_url} alt={recipe.title} className="recipe-detail-hero" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      ) : (
        <div className="recipe-detail-hero-placeholder">🍽️</div>
      )}

      {recipe.description && (
        <p style={{ fontSize: '1.05rem', color: 'var(--ink-soft)', marginBottom: '1.5rem', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.6 }}>
          {recipe.description}
        </p>
      )}

      {recipe.primary_protein && (
        <div style={{ marginBottom: '1rem' }}><ProteinBadge protein={recipe.primary_protein} /></div>
      )}
      <div className="recipe-meta-bar">
        {recipe.prep_time && (
          <div className="recipe-meta-item">
            <div className="recipe-meta-value">{recipe.prep_time}</div>
            <div className="recipe-meta-label">Prep (min)</div>
          </div>
        )}
        {recipe.cook_time && (
          <div className="recipe-meta-item">
            <div className="recipe-meta-value">{recipe.cook_time}</div>
            <div className="recipe-meta-label">Cook (min)</div>
          </div>
        )}
        {recipe.prep_time && recipe.cook_time && (
          <div className="recipe-meta-item">
            <div className="recipe-meta-value">{recipe.prep_time + recipe.cook_time}</div>
            <div className="recipe-meta-label">Total (min)</div>
          </div>
        )}
        <div className="recipe-meta-item">
          <div className="recipe-meta-value">{recipe.servings}</div>
          <div className="recipe-meta-label">Servings</div>
        </div>
        <div className="recipe-meta-item">
          <div className="recipe-meta-value">{recipe.ingredients.length}</div>
          <div className="recipe-meta-label">Ingredients</div>
        </div>
      </div>

      <div className="two-col">
        <div>
          <h2 className="section-title">Ingredients</h2>
          {recipe.ingredients.length === 0 ? (
            <p style={{ color: 'var(--ink-muted)', fontSize: '0.85rem' }}>No ingredients listed</p>
          ) : (
            <ul className="ingredient-list">
              {recipe.ingredients.map((ing, i) => (
                <li key={i}>
                  <span className="ingredient-amount">{[ing.amount, ing.unit].filter(Boolean).join(' ')}</span>
                  <span>{ing.name}</span>
                  {ing.notes && <span style={{ color: 'var(--ink-muted)', fontSize: '0.8rem' }}> ({ing.notes})</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h2 className="section-title">Method</h2>
          {recipe.steps.length === 0 ? (
            <p style={{ color: 'var(--ink-muted)', fontSize: '0.85rem' }}>No steps listed</p>
          ) : (
            <ol className="step-list">
              {recipe.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </>
  );
}
