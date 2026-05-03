'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Recipe, MealPlan } from '@/lib/db';
import { showToast } from '@/components/Toast';


const PROTEIN_COLORS: Record<string, string> = {
  chicken: '#E8A838', beef: '#C0392B', pork: '#D4697A', lamb: '#8E44AD',
  fish: '#2980B9', seafood: '#16A085', tofu: '#27AE60', eggs: '#D4AC0D',
  legumes: '#A04000', dairy: '#717D7E',
};
const PROTEIN_EMOJI: Record<string, string> = {
  chicken: '🍗', beef: '🥩', pork: '🐷', lamb: '🐑',
  fish: '🐟', seafood: '🦐', tofu: '🫘', eggs: '🥚', legumes: '🫘', dairy: '🧀',
};
function ProteinPip({ protein }: { protein?: string }) {
  if (!protein) return null;
  const color = PROTEIN_COLORS[protein] || '#888';
  const emoji = PROTEIN_EMOJI[protein] || '';
  return (
    <span
      title={protein}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '2px',
        fontSize: '0.58rem', fontWeight: 600, textTransform: 'capitalize',
        color: 'white', background: color,
        borderRadius: '99px', padding: '1px 5px', lineHeight: 1.4,
        letterSpacing: '0.02em',
      }}
    >
      {emoji} {protein}
    </span>
  );
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MEAL_TYPES = ['dinner'];

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function formatDate(d: Date): string { return d.toISOString().split('T')[0]; }
function formatWeekLabel(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return `${monday.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – ${sunday.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

type DragSource =
  | { type: 'meal'; mealId: string; sourceDay: number; sourceMealType: string }
  | { type: 'recipe'; recipeId: string };

interface MagicSettings {
  variety: 'low' | 'medium' | 'high';
  servings: number;
  preferTags: string;
  excludeTags: string;
  mealTypes: string[];
}

export default function PlannerClient() {
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragSource, setDragSource] = useState<DragSource | null>(null);
  const [dragOver, setDragOver] = useState<{ day: number; mealType: string } | null>(null);
  const [showRecipePicker, setShowRecipePicker] = useState<{ day: number; mealType: string } | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [showMagic, setShowMagic] = useState(false);
  const [magicSettings, setMagicSettings] = useState<MagicSettings>({
    variety: 'medium', servings: 4, preferTags: '', excludeTags: '', mealTypes: ['dinner'],
  });
  const [magicLoading, setMagicLoading] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, recipesRes] = await Promise.all([
        fetch(`/api/planner?weekStart=${formatDate(weekStart)}`),
        fetch('/api/recipes'),
      ]);
      setMealPlans(await plansRes.json());
      setRecipes(await recipesRes.json());
    } catch { showToast('Failed to load planner data', 'error'); }
    finally { setLoading(false); }
  }, [weekStart]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowRecipePicker(null);
    }
    if (showRecipePicker) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showRecipePicker]);

  const prevWeek = () => setWeekStart(d => { const nd = new Date(d); nd.setDate(d.getDate() - 7); return nd; });
  const nextWeek = () => setWeekStart(d => { const nd = new Date(d); nd.setDate(d.getDate() + 7); return nd; });

  const getMealsForSlot = (day: number, mealType: string) =>
    mealPlans.filter(m => m.day_of_week === day && m.meal_type === mealType);

  const getDayDate = (dayIndex: number): Date => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + dayIndex);
    return d;
  };

  const addMeal = async (day: number, mealType: string, recipeId: string, servings?: number) => {
    try {
      const recipe = recipes.find(r => r.id === recipeId);
      const res = await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week_start: formatDate(weekStart), recipe_id: recipeId, day_of_week: day,
          meal_type: mealType, servings: servings || magicSettings.servings || recipe?.servings || 4,
        }),
      });
      if (!res.ok) throw new Error();
      await fetchData();
    } catch { showToast('Failed to add meal', 'error'); }
  };

  const removeMeal = async (id: string) => {
    try {
      await fetch(`/api/planner?id=${id}`, { method: 'DELETE' });
      setMealPlans(prev => prev.filter(m => m.id !== id));
    } catch { showToast('Failed to remove meal', 'error'); }
  };

  const handleSidebarDragStart = (e: React.DragEvent, recipe: Recipe) => {
    setDragSource({ type: 'recipe', recipeId: recipe.id });
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleMealDragStart = (e: React.DragEvent, meal: MealPlan) => {
    setDragSource({ type: 'meal', mealId: meal.id, sourceDay: meal.day_of_week, sourceMealType: meal.meal_type });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, day: number, mealType: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = dragSource?.type === 'recipe' ? 'copy' : 'move';
    setDragOver({ day, mealType });
  };

  const handleDrop = async (e: React.DragEvent, targetDay: number, targetMealType: string) => {
    e.preventDefault();
    setDragOver(null);
    if (!dragSource) return;
    if (dragSource.type === 'recipe') {
      await addMeal(targetDay, targetMealType, dragSource.recipeId);
    } else {
      const meal = mealPlans.find(m => m.id === dragSource.mealId);
      if (!meal) return;
      if (targetDay === dragSource.sourceDay && targetMealType === dragSource.sourceMealType) return;
      try {
        await fetch(`/api/planner?id=${dragSource.mealId}`, { method: 'DELETE' });
        await fetch('/api/planner', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            week_start: formatDate(weekStart), recipe_id: meal.recipe_id,
            day_of_week: targetDay, meal_type: targetMealType, servings: meal.servings,
          }),
        });
        await fetchData();
      } catch { showToast('Failed to move meal', 'error'); }
    }
    setDragSource(null);
  };

  const handleDragEnd = () => { setDragSource(null); setDragOver(null); };

  const handleMagicSuggest = async () => {
    if (recipes.length === 0) { showToast('Add some recipes first!', 'error'); return; }
    setMagicLoading(true);
    try {
      for (const meal of mealPlans) await fetch(`/api/planner?id=${meal.id}`, { method: 'DELETE' });
      const preferTags = magicSettings.preferTags.split(',').map(t => t.trim()).filter(Boolean);
      const excludeTags = magicSettings.excludeTags.split(',').map(t => t.trim()).filter(Boolean);
      let pool = recipes.filter(r => !(excludeTags.length > 0 && r.tags?.some(t => excludeTags.includes(t.toLowerCase()))));
      if (pool.length === 0) pool = recipes;
      const scored = pool.map(r => ({
        recipe: r,
        score: Math.random() + (preferTags.length > 0 && r.tags?.some(t => preferTags.includes(t.toLowerCase())) ? 1 : 0),
      })).sort((a, b) => b.score - a.score);
      const adds: Array<{ day: number; mealType: string; recipeId: string }> = [];
      for (let day = 0; day < 7; day++) {
        for (const mealType of magicSettings.mealTypes) {
          let idx = 0;
          if (magicSettings.variety === 'high') {
            const usedIds = new Set(adds.map(a => a.recipeId));
            const unused = scored.filter(s => !usedIds.has(s.recipe.id));
            const pickFrom = unused.length > 0 ? unused : scored;
            idx = Math.floor(Math.random() * Math.min(pickFrom.length, 3));
            adds.push({ day, mealType, recipeId: pickFrom[idx].recipe.id });
          } else if (magicSettings.variety === 'medium') {
            const recentIds = adds.slice(-4).map(a => a.recipeId);
            const fresh = scored.filter(s => !recentIds.includes(s.recipe.id));
            const pickFrom = fresh.length > 0 ? fresh : scored;
            idx = Math.floor(Math.random() * Math.min(pickFrom.length, 5));
            adds.push({ day, mealType, recipeId: pickFrom[idx].recipe.id });
          } else {
            idx = Math.floor(Math.random() * Math.min(scored.length, 3));
            adds.push({ day, mealType, recipeId: scored[idx].recipe.id });
          }
        }
      }
      for (const add of adds) {
        await fetch('/api/planner', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            week_start: formatDate(weekStart), recipe_id: add.recipeId,
            day_of_week: add.day, meal_type: add.mealType, servings: magicSettings.servings,
          }),
        });
      }
      await fetchData();
      setShowMagic(false);
      showToast(`Planned ${adds.length} meals for the week!`, 'success');
    } catch { showToast('Magic suggest failed', 'error'); }
    finally { setMagicLoading(false); }
  };

  const toggleMagicMealType = (mt: string) => {
    setMagicSettings(prev => ({
      ...prev,
      mealTypes: prev.mealTypes.includes(mt) ? prev.mealTypes.filter(m => m !== mt) : [...prev.mealTypes, mt],
    }));
  };

  const filteredRecipes = recipes.filter(r =>
    !pickerSearch || r.title.toLowerCase().includes(pickerSearch.toLowerCase()) ||
    r.tags?.some(t => t.toLowerCase().includes(pickerSearch.toLowerCase()))
  );

  const sidebarRecipes = recipes.filter(r =>
    !sidebarSearch || r.title.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
    r.tags?.some(t => t.toLowerCase().includes(sidebarSearch.toLowerCase()))
  );

  return (
    <div className="planner-layout">
      {/* ── Recipe sidebar ── */}
      <aside className="recipe-sidebar">
        <div className="sidebar-header">
          <h2 className="sidebar-title">Recipes</h2>
          <span className="sidebar-hint">Drag onto a cell</span>
        </div>
        <div className="sidebar-search-wrap">
          <svg className="sidebar-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input type="text" className="sidebar-search" placeholder="Search…" value={sidebarSearch} onChange={e => setSidebarSearch(e.target.value)} />
          {sidebarSearch && <button className="sidebar-search-clear" onClick={() => setSidebarSearch('')}>×</button>}
        </div>
        {recipes.length === 0 ? (
          <div className="sidebar-empty"><span>No recipes yet.</span><a href="/recipes">Add some →</a></div>
        ) : (
          <div className="sidebar-cards">
            {sidebarRecipes.map(recipe => (
              <div
                key={recipe.id}
                className={`recipe-thumb-card ${dragSource?.type === 'recipe' && (dragSource as any).recipeId === recipe.id ? 'is-dragging' : ''}`}
                draggable
                onDragStart={e => handleSidebarDragStart(e, recipe)}
                onDragEnd={handleDragEnd}
                title={recipe.title}
              >
                <div className="recipe-thumb-img">
                  {recipe.image_url
                    ? <img src={recipe.image_url} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    : <span className="recipe-thumb-emoji">🍽</span>
                  }
                  <div className="recipe-thumb-drag-hint">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="9" cy="5" r="1.2" fill="currentColor"/><circle cx="15" cy="5" r="1.2" fill="currentColor"/>
                      <circle cx="9" cy="12" r="1.2" fill="currentColor"/><circle cx="15" cy="12" r="1.2" fill="currentColor"/>
                      <circle cx="9" cy="19" r="1.2" fill="currentColor"/><circle cx="15" cy="19" r="1.2" fill="currentColor"/>
                    </svg>
                  </div>
                </div>
                <div className="recipe-thumb-info">
                  <span className="recipe-thumb-name">{recipe.title}</span>
                  {recipe.tags && recipe.tags.length > 0 && (
                    <span className="recipe-thumb-tags">{recipe.tags.slice(0, 2).join(', ')}</span>
                  )}
                  {recipe.primary_protein && <ProteinPip protein={recipe.primary_protein} />}
                  {recipe.cook_time && <span className="recipe-thumb-time">{recipe.cook_time}m</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* ── Main planner ── */}
      <div className="planner-root">
        <div className="planner-header">
          <div className="planner-header-left">
            <h1 className="planner-title">Meal <em>Planner</em></h1>
            <div className="week-nav">
              <button className="nav-btn" onClick={prevWeek}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <span className="week-label">{formatWeekLabel(weekStart)}</span>
              <button className="nav-btn" onClick={nextWeek}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </button>
              <button className="nav-btn-text" onClick={() => setWeekStart(getMonday(new Date()))}>Today</button>
            </div>
          </div>
          <div className="planner-header-right">
            <span className="meal-count">{mealPlans.length} meals planned</span>
            <button className="btn-magic" onClick={() => setShowMagic(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
              Auto-plan week
            </button>
            <a href="/shopping-list" className="btn-shop">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 01-8 0"/>
              </svg>
              Shopping list
            </a>
          </div>
        </div>

        {loading ? (
          <div className="planner-loading"><div className="loading-dots"><span/><span/><span/></div></div>
        ) : (
          <div className="planner-grid-wrap">
            <div className="planner-grid">
              <div className="planner-col-header-spacer" />
              {DAYS_SHORT.map((day, i) => {
                const date = getDayDate(i);
                const isToday = formatDate(date) === formatDate(new Date());
                return (
                  <div key={i} className={`planner-col-header ${isToday ? 'today' : ''}`}>
                    <span className="col-day">{day}</span>
                    <span className="col-date">{date.getDate()}</span>
                  </div>
                );
              })}
              {MEAL_TYPES.map(mealType => (
                <>
                  <div key={`label-${mealType}`} className="planner-row-label"><span>{mealType}</span></div>
                  {DAYS_SHORT.map((_, dayIndex) => {
                    const meals = getMealsForSlot(dayIndex, mealType);
                    const isDragTarget = dragOver?.day === dayIndex && dragOver?.mealType === mealType;
                    const isNewDrop = dragSource?.type === 'recipe';
                    return (
                      <div
                        key={`${mealType}-${dayIndex}`}
                        className={`planner-cell ${isDragTarget ? 'drag-over' : ''} ${isDragTarget && isNewDrop ? 'drag-over-new' : ''} ${meals.length > 0 ? 'has-meal' : ''}`}
                        onDragOver={e => handleDragOver(e, dayIndex, mealType)}
                        onDrop={e => handleDrop(e, dayIndex, mealType)}
                        onDragLeave={() => setDragOver(null)}
                        onClick={() => { if (meals.length === 0) { setShowRecipePicker({ day: dayIndex, mealType }); setPickerSearch(''); } }}
                      >
                        {meals.length === 0 ? (
                          <div className="cell-empty">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                          </div>
                        ) : (
                          meals.map(meal => (
                            <div
                              key={meal.id}
                              className={`meal-chip ${dragSource?.type === 'meal' && (dragSource as any).mealId === meal.id ? 'dragging' : ''}`}
                              draggable
                              onDragStart={e => handleMealDragStart(e, meal)}
                              onDragEnd={handleDragEnd}
                            >
                              {(meal.recipe as any)?.image_url && (
                                <div className="meal-chip-thumb">
                                  <img src={(meal.recipe as any).image_url} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                </div>
                              )}
                              <div className="meal-chip-body">
                                {meal.recipe?.primary_protein && <ProteinPip protein={meal.recipe.primary_protein} />}
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '4px' }}>
                                <span className="meal-chip-name">{meal.recipe?.title}</span>
                                <button className="meal-chip-remove" onClick={e => { e.stopPropagation(); removeMeal(meal.id); }}>×</button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                        {meals.length > 0 && (
                          <button className="cell-add-more" onClick={e => { e.stopPropagation(); setShowRecipePicker({ day: dayIndex, mealType }); setPickerSearch(''); }}>+</button>
                        )}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
        )}

        {/* Recipe picker popover */}
        {showRecipePicker && (
          <div className="picker-overlay" onClick={() => setShowRecipePicker(null)}>
            <div className="recipe-picker-popover" ref={pickerRef} onClick={e => e.stopPropagation()}>
              <div className="picker-header">
                <div className="picker-title">{DAYS[showRecipePicker.day]} · {showRecipePicker.mealType}</div>
                <button className="picker-close" onClick={() => setShowRecipePicker(null)}>×</button>
              </div>
              <input autoFocus type="text" className="picker-search" placeholder="Search recipes…" value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} />
              <div className="picker-list">
                {filteredRecipes.length === 0 ? (
                  <div className="picker-empty">
                    {recipes.length === 0 ? <><span>No recipes yet.</span> <a href="/recipes">Add some →</a></> : <span>No matches</span>}
                  </div>
                ) : filteredRecipes.map(r => (
                  <button key={r.id} className="picker-recipe-row" onClick={() => { addMeal(showRecipePicker.day, showRecipePicker.mealType, r.id); setShowRecipePicker(null); }}>
                    <div className="picker-recipe-thumb">
                      {r.image_url ? <img src={r.image_url} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : <span>🍽</span>}
                    </div>
                    <div className="picker-recipe-info">
                      <span className="picker-recipe-name">{r.title}</span>
                      {r.primary_protein && <ProteinPip protein={r.primary_protein} />}
                      <span className="picker-recipe-meta">{[r.cook_time && `${r.cook_time}m`, r.servings && `${r.servings} servings`, ...(r.tags?.slice(0, 2) || [])].filter(Boolean).join(' · ')}</span>
                    </div>
                    <svg className="picker-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Magic modal */}
        {showMagic && (
          <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowMagic(false); }}>
            <div className="magic-modal">
              <div className="magic-modal-header">
                <div>
                  <h2 className="magic-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: '8px' }}><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
                    Auto-plan my week
                  </h2>
                  <p className="magic-subtitle">We&rsquo;ll fill the week from your recipe library</p>
                </div>
                <button className="modal-close" onClick={() => setShowMagic(false)}>×</button>
              </div>
              <div className="magic-grid">
                <div className="magic-field">
                  <label>Meal types to plan</label>
                  <div className="toggle-group">
                    {MEAL_TYPES.map(mt => (
                      <button key={mt} className={`toggle-btn ${magicSettings.mealTypes.includes(mt) ? 'active' : ''}`} onClick={() => toggleMagicMealType(mt)}>{mt}</button>
                    ))}
                  </div>
                </div>
                <div className="magic-field">
                  <label>Variety</label>
                  <div className="toggle-group">
                    {(['low', 'medium', 'high'] as const).map(v => (
                      <button key={v} className={`toggle-btn ${magicSettings.variety === v ? 'active' : ''}`} onClick={() => setMagicSettings(p => ({ ...p, variety: v }))}>
                        {v === 'low' ? 'Repeat favourites' : v === 'medium' ? 'Some variety' : 'Max variety'}
                      </button>
                    ))}
                  </div>
                  <p className="magic-hint">
                    {magicSettings.variety === 'low' && 'Will reuse popular recipes throughout the week'}
                    {magicSettings.variety === 'medium' && 'Avoids repeating the same recipe back-to-back'}
                    {magicSettings.variety === 'high' && 'Uses each recipe at most once where possible'}
                  </p>
                </div>
                <div className="magic-field">
                  <label>Servings per meal</label>
                  <div className="servings-control">
                    <button className="servings-btn" onClick={() => setMagicSettings(p => ({ ...p, servings: Math.max(1, p.servings - 1) }))}>−</button>
                    <span className="servings-value">{magicSettings.servings}</span>
                    <button className="servings-btn" onClick={() => setMagicSettings(p => ({ ...p, servings: Math.min(20, p.servings + 1) }))}>+</button>
                    <span className="servings-label">people</span>
                  </div>
                </div>
                <div className="magic-field">
                  <label>Prefer recipes tagged with</label>
                  <input type="text" className="magic-input" placeholder="e.g. italian, quick, vegetarian" value={magicSettings.preferTags} onChange={e => setMagicSettings(p => ({ ...p, preferTags: e.target.value }))} />
                </div>
                <div className="magic-field">
                  <label>Avoid recipes tagged with</label>
                  <input type="text" className="magic-input" placeholder="e.g. spicy, heavy" value={magicSettings.excludeTags} onChange={e => setMagicSettings(p => ({ ...p, excludeTags: e.target.value }))} />
                </div>
              </div>
              <div className="magic-footer">
                <p className="magic-warning">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  This will replace all current meals for this week
                </p>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn-cancel" onClick={() => setShowMagic(false)}>Cancel</button>
                  <button className="btn-magic-go" onClick={handleMagicSuggest} disabled={magicLoading || magicSettings.mealTypes.length === 0}>
                    {magicLoading ? <span className="loading-dots"><span/><span/><span/></span> : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>Plan my week</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .planner-layout { display: flex; gap: 1.5rem; align-items: flex-start; }

        /* ── Sidebar ── */
        .recipe-sidebar {
          width: 190px; flex-shrink: 0; position: sticky; top: 1.5rem;
          max-height: calc(100vh - 3rem); display: flex; flex-direction: column; overflow: hidden;
        }
        .sidebar-header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 0.6rem; }
        .sidebar-title { font-family: var(--font-display); font-size: 1.1rem; font-weight: 300; color: var(--ink); }
        .sidebar-hint { font-size: 0.63rem; color: var(--ink-muted); font-style: italic; }
        .sidebar-search-wrap { position: relative; margin-bottom: 0.75rem; }
        .sidebar-search-icon { position: absolute; left: 8px; top: 50%; transform: translateY(-50%); color: var(--ink-muted); pointer-events: none; }
        .sidebar-search {
          width: 100%; padding: 0.42rem 1.75rem; border: 1px solid var(--border);
          border-radius: 6px; font-size: 0.78rem; font-family: var(--font-body);
          color: var(--ink); outline: none; transition: border-color 0.15s; box-sizing: border-box; background: white;
        }
        .sidebar-search:focus { border-color: var(--rust); }
        .sidebar-search-clear { position: absolute; right: 7px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--ink-muted); cursor: pointer; font-size: 14px; padding: 0; line-height: 1; }
        .sidebar-empty { padding: 1.5rem 0; text-align: center; font-size: 0.8rem; color: var(--ink-muted); display: flex; flex-direction: column; gap: 0.4rem; }
        .sidebar-empty a { color: var(--rust); }
        .sidebar-cards { overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 0.45rem; padding-right: 2px; padding-bottom: 1rem; }
        .sidebar-cards::-webkit-scrollbar { width: 3px; }
        .sidebar-cards::-webkit-scrollbar-track { background: transparent; }
        .sidebar-cards::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

        .recipe-thumb-card {
          background: white; border: 1px solid var(--border); border-radius: 8px;
          overflow: hidden; cursor: grab; transition: all 0.15s; user-select: none; flex-shrink: 0;
        }
        .recipe-thumb-card:hover { border-color: var(--rust); box-shadow: 0 2px 10px rgba(181,69,27,0.14); transform: translateY(-1px); }
        .recipe-thumb-card:active { cursor: grabbing; }
        .recipe-thumb-card.is-dragging { opacity: 0.4; }

        .recipe-thumb-img { width: 100%; height: 85px; background: var(--parchment); overflow: hidden; display: flex; align-items: center; justify-content: center; position: relative; }
        .recipe-thumb-img img { width: 100%; height: 100%; object-fit: cover; pointer-events: none; }
        .recipe-thumb-emoji { font-size: 26px; }
        .recipe-thumb-drag-hint {
          position: absolute; top: 5px; right: 5px; background: rgba(255,255,255,0.88);
          border-radius: 4px; padding: 3px 4px; color: var(--ink-muted); opacity: 0; transition: opacity 0.15s; display: flex; align-items: center;
        }
        .recipe-thumb-card:hover .recipe-thumb-drag-hint { opacity: 1; }
        .recipe-thumb-info { padding: 0.4rem 0.5rem 0.45rem; display: flex; flex-direction: column; gap: 2px; }
        .recipe-thumb-name { font-size: 0.75rem; color: var(--ink); font-weight: 400; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .recipe-thumb-tags { font-size: 0.63rem; color: var(--ink-muted); text-transform: capitalize; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .recipe-thumb-time { font-size: 0.63rem; color: var(--rust); }

        /* ── Planner root ── */
        .planner-root { flex: 1; min-width: 0; padding: 0; }
        .planner-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
        .planner-title { font-family: var(--font-display); font-size: 2.8rem; font-weight: 300; line-height: 1; color: var(--ink); margin-bottom: 0.75rem; }
        .planner-title em { font-style: italic; color: var(--rust); }
        .week-nav { display: flex; align-items: center; gap: 0.5rem; }
        .nav-btn { background: white; border: 1px solid var(--border); border-radius: 4px; padding: 0.35rem 0.5rem; cursor: pointer; color: var(--ink-muted); display: flex; align-items: center; transition: all 0.15s; }
        .nav-btn:hover { border-color: var(--ink-muted); color: var(--ink); }
        .nav-btn-text { background: none; border: none; font-size: 0.78rem; color: var(--ink-muted); cursor: pointer; padding: 0.35rem 0.5rem; border-radius: 4px; font-family: var(--font-body); transition: all 0.15s; }
        .nav-btn-text:hover { color: var(--ink); background: var(--parchment); }
        .week-label { font-size: 0.88rem; color: var(--ink-soft); min-width: 200px; text-align: center; }
        .planner-header-right { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
        .meal-count { font-size: 0.78rem; color: var(--ink-muted); }
        .btn-magic { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.55rem 1rem; background: var(--ink); color: var(--cream); border: none; border-radius: 4px; font-size: 0.82rem; font-family: var(--font-body); cursor: pointer; transition: all 0.15s; }
        .btn-magic:hover { background: var(--ink-soft); }
        .btn-shop { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.55rem 1rem; background: var(--rust); color: white; border: none; border-radius: 4px; font-size: 0.82rem; font-family: var(--font-body); cursor: pointer; text-decoration: none; transition: all 0.15s; }
        .btn-shop:hover { background: var(--rust-light); }

        .planner-grid-wrap { overflow-x: auto; }
        .planner-grid { display: grid; grid-template-columns: 72px repeat(7, 1fr); gap: 4px; min-width: 560px; }
        .planner-col-header { text-align: center; padding: 0.5rem 0.25rem 0.75rem; }
        .planner-col-header.today .col-day { color: var(--rust); }
        .planner-col-header.today .col-date { background: var(--rust); color: white; border-radius: 50%; }
        .col-day { display: block; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--ink-muted); margin-bottom: 3px; }
        .col-date { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; font-family: var(--font-display); font-size: 1rem; font-weight: 300; color: var(--ink); }
        .planner-row-label { display: flex; align-items: flex-start; justify-content: flex-end; padding: 0.6rem 0.75rem 0 0; }
        .planner-row-label span { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--ink-muted); }

        .planner-cell { background: white; border: 1px solid var(--border); border-radius: 6px; min-height: 80px; padding: 0.35rem; cursor: pointer; transition: all 0.15s; position: relative; display: flex; flex-direction: column; gap: 3px; }
        .planner-cell:hover { border-color: var(--ink-muted); }
        .planner-cell.drag-over { border-color: var(--rust); background: rgba(181,69,27,0.04); box-shadow: 0 0 0 2px rgba(181,69,27,0.15); }
        .planner-cell.drag-over-new { border-style: dashed; }
        .cell-empty { flex: 1; display: flex; align-items: center; justify-content: center; color: var(--border); transition: color 0.15s; }
        .planner-cell:hover .cell-empty { color: var(--ink-muted); }

        .meal-chip { background: var(--sage-light); border: 1px solid #D4DBC9; border-radius: 5px; display: flex; flex-direction: column; cursor: grab; transition: all 0.15s; user-select: none; overflow: hidden; }
        .meal-chip:hover { background: #E0EBCF; }
        .meal-chip.dragging { opacity: 0.4; cursor: grabbing; }
        .meal-chip:active { cursor: grabbing; }
        .meal-chip-thumb { width: 100%; height: 42px; overflow: hidden; flex-shrink: 0; background: #D8E8CC; }
        .meal-chip-thumb img { width: 100%; height: 100%; object-fit: cover; pointer-events: none; display: block; }
        .meal-chip-body { display: flex; flex-direction: column; gap: 3px; padding: 0.3rem 0.3rem 0.25rem; }
        .meal-chip-name { font-size: 0.68rem; color: #3A5030; line-height: 1.3; flex: 1; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
        .meal-chip-remove { background: none; border: none; color: #7A9068; cursor: pointer; padding: 0; line-height: 1; font-size: 14px; flex-shrink: 0; opacity: 0.6; transition: opacity 0.15s; }
        .meal-chip-remove:hover { opacity: 1; }
        .cell-add-more { align-self: flex-start; background: none; border: 1px dashed var(--border); border-radius: 3px; color: var(--ink-muted); font-size: 11px; padding: 1px 5px; cursor: pointer; margin-top: 2px; transition: all 0.15s; font-family: var(--font-body); }
        .cell-add-more:hover { border-color: var(--rust); color: var(--rust); }

        .picker-overlay { position: fixed; inset: 0; z-index: 500; }
        .recipe-picker-popover { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border: 1px solid var(--border); border-radius: 10px; box-shadow: 0 8px 40px rgba(26,22,18,0.15); width: 380px; max-height: 520px; display: flex; flex-direction: column; overflow: hidden; z-index: 501; }
        .picker-header { padding: 1rem 1.25rem 0.75rem; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--parchment); }
        .picker-title { font-family: var(--font-display); font-size: 1.1rem; font-weight: 400; color: var(--ink); text-transform: capitalize; }
        .picker-close { background: none; border: none; font-size: 20px; color: var(--ink-muted); cursor: pointer; padding: 0; line-height: 1; transition: color 0.15s; }
        .picker-close:hover { color: var(--ink); }
        .picker-search { margin: 0.75rem 1rem; padding: 0.55rem 0.85rem; border: 1px solid var(--border); border-radius: 6px; font-size: 0.88rem; font-family: var(--font-body); color: var(--ink); outline: none; transition: border-color 0.15s; }
        .picker-search:focus { border-color: var(--rust); }
        .picker-list { overflow-y: auto; flex: 1; padding: 0 0.5rem 0.75rem; }
        .picker-empty { padding: 2rem; text-align: center; font-size: 0.85rem; color: var(--ink-muted); }
        .picker-empty a { color: var(--rust); }
        .picker-recipe-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0.75rem; border-radius: 6px; border: none; background: none; cursor: pointer; width: 100%; text-align: left; transition: background 0.12s; font-family: var(--font-body); }
        .picker-recipe-row:hover { background: var(--parchment); }
        .picker-recipe-thumb { width: 40px; height: 40px; border-radius: 5px; overflow: hidden; background: var(--parchment); flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 18px; }
        .picker-recipe-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .picker-recipe-info { flex: 1; min-width: 0; }
        .picker-recipe-name { display: block; font-size: 0.88rem; font-weight: 400; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .picker-recipe-meta { display: block; font-size: 0.72rem; color: var(--ink-muted); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .picker-arrow { color: var(--border); flex-shrink: 0; }

        .magic-modal { background: white; border-radius: 10px; padding: 2rem; width: 520px; max-width: 95vw; max-height: 90vh; overflow-y: auto; box-shadow: 0 8px 40px rgba(26,22,18,0.15); }
        .magic-modal-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1.75rem; }
        .magic-title { font-family: var(--font-display); font-size: 1.6rem; font-weight: 300; color: var(--ink); display: flex; align-items: center; margin-bottom: 0.25rem; }
        .magic-subtitle { font-size: 0.82rem; color: var(--ink-muted); }
        .modal-close { background: none; border: none; font-size: 22px; color: var(--ink-muted); cursor: pointer; padding: 0; line-height: 1; }
        .modal-close:hover { color: var(--ink); }
        .magic-grid { display: flex; flex-direction: column; gap: 1.25rem; }
        .magic-field label { display: block; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--ink-muted); margin-bottom: 0.5rem; }
        .toggle-group { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .toggle-btn { padding: 0.45rem 0.9rem; border: 1px solid var(--border); border-radius: 20px; background: white; color: var(--ink-soft); font-size: 0.8rem; cursor: pointer; font-family: var(--font-body); transition: all 0.15s; text-transform: capitalize; }
        .toggle-btn:hover { border-color: var(--rust); color: var(--rust); }
        .toggle-btn.active { background: var(--rust); border-color: var(--rust); color: white; }
        .magic-hint { font-size: 0.75rem; color: var(--ink-muted); font-style: italic; margin-top: 0.4rem; }
        .servings-control { display: flex; align-items: center; gap: 0.75rem; }
        .servings-btn { width: 32px; height: 32px; border: 1px solid var(--border); border-radius: 50%; background: white; color: var(--ink-soft); font-size: 1.1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; font-family: var(--font-body); line-height: 1; }
        .servings-btn:hover { border-color: var(--rust); color: var(--rust); }
        .servings-value { font-family: var(--font-display); font-size: 1.6rem; font-weight: 300; color: var(--rust); min-width: 30px; text-align: center; }
        .servings-label { font-size: 0.82rem; color: var(--ink-muted); }
        .magic-input { width: 100%; padding: 0.6rem 0.85rem; border: 1px solid var(--border); border-radius: 6px; font-family: var(--font-body); font-size: 0.88rem; color: var(--ink); outline: none; transition: border-color 0.15s; }
        .magic-input:focus { border-color: var(--rust); }
        .magic-footer { margin-top: 1.75rem; padding-top: 1.25rem; border-top: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
        .magic-warning { display: flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; color: var(--ink-muted); }
        .btn-cancel { padding: 0.55rem 1rem; background: white; border: 1px solid var(--border); border-radius: 4px; font-size: 0.82rem; font-family: var(--font-body); color: var(--ink-soft); cursor: pointer; transition: all 0.15s; }
        .btn-cancel:hover { border-color: var(--ink-muted); }
        .btn-magic-go { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.55rem 1.25rem; background: var(--ink); color: var(--cream); border: none; border-radius: 4px; font-size: 0.82rem; font-family: var(--font-body); cursor: pointer; transition: all 0.15s; }
        .btn-magic-go:hover:not(:disabled) { background: var(--rust); }
        .btn-magic-go:disabled { opacity: 0.5; cursor: not-allowed; }
        .planner-loading { display: flex; align-items: center; justify-content: center; padding: 4rem; }

        @media (max-width: 900px) {
          .planner-layout { flex-direction: column; }
          .recipe-sidebar { width: 100%; position: static; max-height: none; }
          .sidebar-cards { flex-direction: row; flex-wrap: nowrap; overflow-x: auto; overflow-y: visible; gap: 0.5rem; padding-bottom: 0.5rem; }
          .recipe-thumb-card { min-width: 130px; }
        }
      `}</style>
    </div>
  );
}
