'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Recipe, MealPlan } from '@/lib/db';
import { showToast } from '@/components/Toast';
import GenerateListModal from '@/components/GenerateListModal';

// ── Protein helpers ───────────────────────────────────────────────────────────

const PROTEIN_COLORS: Record<string, string> = {
  chicken: '#E8A838', beef: '#C0392B', pork: '#D4697A', lamb: '#8E44AD',
  fish: '#2980B9', seafood: '#16A085', tofu: '#27AE60', eggs: '#D4AC0D',
  legumes: '#A04000', dairy: '#717D7E',
};
const PROTEIN_EMOJI: Record<string, string> = {
  chicken: '🍗', beef: '🥩', pork: '🐷', lamb: '🐑',
  fish: '🐟', seafood: '🦐', tofu: '🫘', eggs: '🥚', legumes: '🫘', dairy: '🧀',
};

function ProteinBadge({ protein }: { protein?: string }) {
  if (!protein) return null;
  const color = PROTEIN_COLORS[protein] || '#888';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '3px',
      fontSize: '0.62rem', fontWeight: 600, textTransform: 'capitalize',
      color: 'white', background: color, borderRadius: '99px',
      padding: '2px 6px', lineHeight: 1.4, letterSpacing: '0.02em', flexShrink: 0,
    }}>
      {PROTEIN_EMOJI[protein]} {protein}
    </span>
  );
}

// ── Date helpers ──────────────────────────────────────────────────────────────

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  d.setHours(0, 0, 0, 0);
  return d;
}
function formatDate(d: Date): string { return d.toISOString().split('T')[0]; }
function formatWeekRange(monday: Date): string {
  const sun = new Date(monday); sun.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  return `${fmt(monday)} – ${fmt(sun)}`;
}
function isThisWeek(monday: Date) { return formatDate(monday) === formatDate(getMonday(new Date())); }
function isNextWeek(monday: Date) {
  const n = getMonday(new Date()); n.setDate(n.getDate() + 7);
  return formatDate(monday) === formatDate(n);
}
function weekLabel(monday: Date) {
  if (isThisWeek(monday)) return 'This week';
  if (isNextWeek(monday)) return 'Next week';
  return formatWeekRange(monday);
}
function getDayDate(weekStart: Date, i: number): Date {
  const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d;
}
function todayDayIndex() { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; }

// ── Suggestion logic ──────────────────────────────────────────────────────────

function suggestForDay(recipes: Recipe[], usedProteins: (string|null|undefined)[], count = 3): Recipe[] {
  if (!recipes.length) return [];
  const used = new Set(usedProteins.filter(Boolean));
  const fresh = recipes.filter(r => !used.has(r.primary_protein ?? ''));
  const pool = fresh.length >= count ? fresh : [...fresh, ...recipes.filter(r => !fresh.includes(r))];
  return [...pool].sort(() => Math.random() - 0.5).slice(0, count);
}

// ── Magic settings ────────────────────────────────────────────────────────────

interface MagicSettings { variety: 'low'|'medium'|'high'; servings: number; preferTags: string; excludeTags: string; }

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function PlannerClient() {
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [showGenerateList, setShowGenerateList] = useState(false);

  // Picker
  const [picker, setPicker] = useState<{ dayIndex: number; replacingId?: string } | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');

  // Magic
  const [showMagic, setShowMagic] = useState(false);
  const [magicSettings, setMagicSettings] = useState<MagicSettings>({ variety: 'medium', servings: 4, preferTags: '', excludeTags: '' });
  const [magicLoading, setMagicLoading] = useState(false);

  // Drag state
  const [suggestions, setSuggestions] = useState<Record<number, Recipe[]>>({});
  const [dragging, setDragging] = useState<{ mealId: string; fromDay: number } | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);
  const [dragOverTrash, setDragOverTrash] = useState(false);

  // Note save debounce timers
  const noteTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const todayRef = useRef<HTMLDivElement>(null);

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const wk = formatDate(weekStart);
      const [plansRes, recipesRes, notesRes] = await Promise.all([
        fetch(`/api/planner?weekStart=${wk}`),
        fetch('/api/recipes'),
        fetch(`/api/planner-notes?weekStart=${wk}`),
      ]);
  const [plans, recs, nts] = await Promise.all([plansRes.json(), recipesRes.json(), notesRes.json()]);
      setMealPlans(plans);
      setRecipes(recs);
      setNotes(nts);
      // Compute suggestions once — stable until next full fetch
      const newSuggestions: Record<number, Recipe[]> = {};
      for (let d = 0; d < 7; d++) {
        const dayMeals = plans.filter((m: any) => m.day_of_week === d && m.meal_type === 'dinner');
        if (!dayMeals.length) {
          const otherProteins = plans.filter((m: any) => m.day_of_week !== d).map((m: any) => m.recipe?.primary_protein);
          newSuggestions[d] = suggestForDay(recs, otherProteins, 3);
        }
      }
      setSuggestions(newSuggestions);
    } catch { showToast('Failed to load planner', 'error'); }
    finally { setLoading(false); }
  }, [weekStart]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!loading && todayRef.current && isThisWeek(weekStart)) {
      setTimeout(() => todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }
  }, [loading]);

  // ── Meal operations ─────────────────────────────────────────────────────────

  const getMealsForDay = (dayIndex: number) =>
    mealPlans.filter(m => m.day_of_week === dayIndex && m.meal_type === 'dinner');

  // ── Optimistic meal operations ─────────────────────────────────────────────
  // All three mutate local state immediately so the UI responds instantly,
  // then fire the DB write in the background. On failure they roll back and
  // show a toast.

  const addMeal = async (dayIndex: number, recipeId: string) => {
    const recipe = recipes.find(r => r.id === recipeId);
    // Optimistic: insert a temporary meal with a fake id
    const tempId = `tmp-${Date.now()}`;
    const optimistic: MealPlan = {
      id: tempId, recipe_id: recipeId, day_of_week: dayIndex,
      meal_type: 'dinner', servings: recipe?.servings || 4,
      week_start: formatDate(weekStart), recipe: recipe as any,
    };
    setMealPlans(prev => [...prev, optimistic]);
    try {
      const res = await fetch('/api/planner', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_start: formatDate(weekStart), recipe_id: recipeId, day_of_week: dayIndex, meal_type: 'dinner', servings: recipe?.servings || 4 }),
      });
      if (!res.ok) throw new Error();
      // Replace temp entry with real one from server
      const real = await res.json();
      setMealPlans(prev => prev.map(m => m.id === tempId ? { ...real, recipe } : m));
    } catch {
      setMealPlans(prev => prev.filter(m => m.id !== tempId));
      showToast('Failed to add meal', 'error');
    }
  };

  const removeMeal = async (id: string) => {
    const snapshot = mealPlans.find(m => m.id === id);
    // Optimistic: remove immediately
    setMealPlans(prev => prev.filter(m => m.id !== id));
    try {
      const res = await fetch(`/api/planner?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
    } catch {
      if (snapshot) setMealPlans(prev => [...prev, snapshot]);
      showToast('Failed to remove meal', 'error');
    }
  };

  const moveMeal = async (mealId: string, fromDay: number, toDay: number) => {
    if (fromDay === toDay) return;
    const meal = mealPlans.find(m => m.id === mealId);
    if (!meal) return;
    // Optimistic: update day_of_week in place
    setMealPlans(prev => prev.map(m => m.id === mealId ? { ...m, day_of_week: toDay } : m));
    try {
      await fetch(`/api/planner?id=${mealId}`, { method: 'DELETE' });
      const res = await fetch('/api/planner', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_start: formatDate(weekStart), recipe_id: meal.recipe_id, day_of_week: toDay, meal_type: 'dinner', servings: meal.servings }),
      });
      if (!res.ok) throw new Error();
      const real = await res.json();
      setMealPlans(prev => prev.map(m => m.id === mealId
        ? { ...real, recipe: meal.recipe }
        : m
      ));
    } catch {
      // Roll back
      setMealPlans(prev => prev.map(m => m.id === mealId ? { ...m, day_of_week: fromDay } : m));
      showToast('Failed to move meal', 'error');
    }
  };

  // ── Notes ───────────────────────────────────────────────────────────────────

  const handleNoteChange = (dayIndex: number, value: string) => {
    setNotes(prev => ({ ...prev, [dayIndex]: value }));
    if (noteTimers.current[dayIndex]) clearTimeout(noteTimers.current[dayIndex]);
    noteTimers.current[dayIndex] = setTimeout(async () => {
      try {
        await fetch(`/api/planner-notes?weekStart=${formatDate(weekStart)}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dayOfWeek: dayIndex, note: value }),
        });
      } catch { /* silent */ }
    }, 800);
  };

  // ── Drag handlers ───────────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, mealId: string, fromDay: number) => {
    setDragging({ mealId, fromDay });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDragging(null);
    setDragOverDay(null);
    setDragOverTrash(false);
  };

  const handleDayDragOver = (e: React.DragEvent, dayIndex: number) => {
    if (!dragging) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDay(dayIndex);
    setDragOverTrash(false);
  };

  const handleDayDrop = async (e: React.DragEvent, dayIndex: number) => {
    e.preventDefault();
    if (!dragging) return;
    await moveMeal(dragging.mealId, dragging.fromDay, dayIndex);
    setDragging(null);
    setDragOverDay(null);
  };

  const handleTrashDragOver = (e: React.DragEvent) => {
    if (!dragging) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTrash(true);
    setDragOverDay(null);
  };

  const handleTrashDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragging) return;
    await removeMeal(dragging.mealId);
    setDragging(null);
    setDragOverTrash(false);
  };

  // ── Magic ───────────────────────────────────────────────────────────────────

  const handleMagicSuggest = async () => {
    if (!recipes.length) { showToast('Add some recipes first!', 'error'); return; }
    setMagicLoading(true);
    try {
      for (const m of mealPlans) await fetch(`/api/planner?id=${m.id}`, { method: 'DELETE' });
      const prefer = magicSettings.preferTags.split(',').map(t => t.trim()).filter(Boolean);
      const exclude = magicSettings.excludeTags.split(',').map(t => t.trim()).filter(Boolean);
      let pool = recipes.filter(r => !exclude.some(t => r.tags?.includes(t)));
      if (!pool.length) pool = recipes;
      const scored = pool.map(r => ({ recipe: r, score: Math.random() + (prefer.some(t => r.tags?.includes(t)) ? 1 : 0) })).sort((a, b) => b.score - a.score);
      const picks: string[] = [];
      for (let day = 0; day < 7; day++) {
        let idx = 0;
        if (magicSettings.variety === 'high') {
          const used = new Set(picks);
          const from = scored.filter(s => !used.has(s.recipe.id));
          const p = from.length ? from : scored;
          idx = Math.floor(Math.random() * Math.min(p.length, 3));
          picks.push(p[idx].recipe.id);
        } else if (magicSettings.variety === 'medium') {
          const recent = picks.slice(-3);
          const p = scored.filter(s => !recent.includes(s.recipe.id));
          const from = p.length ? p : scored;
          idx = Math.floor(Math.random() * Math.min(from.length, 5));
          picks.push(from[idx].recipe.id);
        } else {
          idx = Math.floor(Math.random() * Math.min(scored.length, 3));
          picks.push(scored[idx].recipe.id);
        }
      }
      for (let day = 0; day < 7; day++) {
        await fetch('/api/planner', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ week_start: formatDate(weekStart), recipe_id: picks[day], day_of_week: day, meal_type: 'dinner', servings: magicSettings.servings }),
        });
      }
      await fetchData();
      setShowMagic(false);
      showToast('Week planned! ✨', 'success');
    } catch { showToast('Magic plan failed', 'error'); }
    finally { setMagicLoading(false); }
  };

  // ── Derived ─────────────────────────────────────────────────────────────────

  const filteredRecipes = recipes.filter(r =>
    !pickerSearch || r.title.toLowerCase().includes(pickerSearch.toLowerCase()) || r.tags?.some(t => t.toLowerCase().includes(pickerSearch.toLowerCase()))
  );

  const totalMeals = mealPlans.length;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="pl-root">

      {/* Top bar */}
      <div className="pl-topbar">
        <div className="pl-topbar-left">
          <h1 className="pl-title">Meal <em>Planner</em></h1>
          <div className="pl-week-nav">
            <button className="pl-nav-btn" onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(d.getDate() - 7); return n; })}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span className="pl-week-label">{weekLabel(weekStart)}</span>
            <button className="pl-nav-btn" onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(d.getDate() + 7); return n; })}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </button>
            {!isThisWeek(weekStart) && (
              <button className="pl-today-btn" onClick={() => setWeekStart(getMonday(new Date()))}>Today</button>
            )}
          </div>
        </div>
        <div className="pl-topbar-right">
          <span className="pl-count">{totalMeals} of 7 planned</span>
          <button className="pl-btn-magic" onClick={() => setShowMagic(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
            Auto-plan
          </button>
          <button className="pl-btn-gen" onClick={() => setShowGenerateList(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            Shopping list
          </button>
        </div>
      </div>

      {loading ? (
        <div className="pl-loading"><div className="loading-dots"><span/><span/><span/></div></div>
      ) : (
        <div className="pl-days">
          {DAYS.map((dayName, dayIndex) => {
            const date = getDayDate(weekStart, dayIndex);
            const todayIdx = todayDayIndex();
            const isToday = isThisWeek(weekStart) && dayIndex === todayIdx;
            const isPast = isThisWeek(weekStart) && dayIndex < todayIdx;
            const dayMeals = getMealsForDay(dayIndex);
            const isDragTarget = dragOverDay === dayIndex && dragging?.fromDay !== dayIndex;
            const daySuggestions = suggestions[dayIndex] ?? [];

            return (
              <div
                key={dayIndex}
                ref={isToday ? todayRef : undefined}
                className={`pl-day ${isToday ? 'is-today' : ''} ${isPast ? 'is-past' : ''} ${isDragTarget ? 'drag-target' : ''}`}
                onDragOver={e => handleDayDragOver(e, dayIndex)}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverDay(null); }}
                onDrop={e => handleDayDrop(e, dayIndex)}
              >
                {/* Day header */}
                <div className="pl-day-header">
                  <div className="pl-day-label">
                    {isToday && <span className="pl-today-pip">Today</span>}
                    <span className="pl-day-name">{dayName}</span>
                    <span className="pl-day-date">{date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  <button
                    className="pl-add-inline-btn"
                    onClick={() => { setPicker({ dayIndex }); setPickerSearch(''); }}
                    title="Add another recipe"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                    Add
                  </button>
                </div>

                {/* Recipe cards stacked */}
                {dayMeals.length > 0 && (
                  <div className="pl-meal-stack">
                    {dayMeals.map(meal => {
                      const recipe = meal.recipe;
                      const isDraggingThis = dragging?.mealId === meal.id;
                      return (
                        <div
                          key={meal.id}
                          className={`pl-recipe-card ${isDraggingThis ? 'is-dragging' : ''}`}
                          onClick={() => { if (meal.recipe_id) window.location.href = `/recipes?open=${meal.recipe_id}`; }}
                          title="View recipe"
                        >
                          {(recipe as any)?.image_url && (
                            <div className="pl-recipe-img">
                              <img src={(recipe as any).image_url} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            </div>
                          )}
                          <div className="pl-recipe-info">
                            <div className="pl-recipe-top">
                              <span className="pl-recipe-name">{recipe?.title}</span>
                              {recipe?.primary_protein && <ProteinBadge protein={recipe.primary_protein} />}
                            </div>
                            <div className="pl-recipe-meta">
                              {(recipe as any)?.cook_time && <span>🔥 {(recipe as any).cook_time}m</span>}
                              {(recipe as any)?.tags?.slice(0, 2).map((t: string) => (
                                <span key={t} className="pl-recipe-tag">{t}</span>
                              ))}
                            </div>
                          </div>
                          <div className="pl-card-actions" onClick={e => e.stopPropagation()}>
                            <button
                              className="pl-card-btn"
                              title="Replace recipe"
                              onClick={() => { setPicker({ dayIndex, replacingId: meal.id }); setPickerSearch(''); }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="1 4 1 10 7 10"/>
                                <path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
                              </svg>
                            </button>
                            <div
                              className="pl-card-btn pl-drag-handle"
                              title="Drag to move to another day"
                              draggable
                              onDragStart={e => { e.stopPropagation(); handleDragStart(e, meal.id, dayIndex); }}
                              onDragEnd={handleDragEnd}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="5 9 2 12 5 15"/>
                                <polyline points="19 9 22 12 19 15"/>
                                <polyline points="9 5 12 2 15 5"/>
                                <polyline points="9 19 12 22 15 19"/>
                                <line x1="2" y1="12" x2="22" y2="12"/>
                                <line x1="12" y1="2" x2="12" y2="22"/>
                              </svg>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Empty state with suggestions */}
                {!dayMeals.length && (
                  <div className="pl-empty-slot">
                    <button
                      className="pl-add-dinner-pill"
                      onClick={() => { setPicker({ dayIndex }); setPickerSearch(''); }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                      Add dinner
                    </button>
                    {daySuggestions.length > 0 && (
                      <div className="pl-suggestions">
                        <span className="pl-suggestions-label">This week's suggestions</span>
                        <div className="pl-suggestion-pills">
                          {daySuggestions.map(r => (
                            <button key={r.id} className="pl-suggestion-pill" onClick={() => addMeal(dayIndex, r.id)} title={r.title}>
                              {r.primary_protein && <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: PROTEIN_COLORS[r.primary_protein] || '#ccc', display: 'inline-block' }} />}
                              {r.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Day note */}
                <textarea
                  className="pl-day-note"
                  placeholder="Add a note… (e.g. out for dinner, use leftovers)"
                  value={notes[dayIndex] ?? ''}
                  onChange={e => handleNoteChange(dayIndex, e.target.value)}
                  rows={1}
                  onInput={e => {
                    const el = e.currentTarget;
                    el.style.height = 'auto';
                    el.style.height = el.scrollHeight + 'px';
                  }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Trash drop zone — only visible while dragging */}
      {dragging && (
        <div
          className={`pl-trash-bar ${dragOverTrash ? 'active' : ''}`}
          onDragOver={handleTrashDragOver}
          onDragLeave={() => setDragOverTrash(false)}
          onDrop={handleTrashDrop}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          {dragOverTrash ? 'Release to remove' : 'Drop here to remove'}
        </div>
      )}

      {/* Recipe picker modal */}
      {picker && (
        <div className="modal-overlay" onClick={() => setPicker(null)}>
          <div className="pl-picker" onClick={e => e.stopPropagation()}>
            <div className="pl-picker-header">
              <div>
                <h2 className="pl-picker-title">{picker.replacingId ? 'Replace recipe' : 'Add dinner'}</h2>
                <p className="pl-picker-day">{DAYS[picker.dayIndex]}</p>
              </div>
              <button className="modal-close" onClick={() => setPicker(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="pl-picker-search-wrap">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-muted)', pointerEvents: 'none' }}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input autoFocus type="text" className="pl-picker-search" placeholder="Search recipes…" value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} />
            </div>
            <div className="pl-picker-list">
              {filteredRecipes.length === 0 ? (
                <div className="pl-picker-empty">
                  {!recipes.length ? <><span>No recipes yet.</span> <a href="/recipes">Add some →</a></> : <span>No matches</span>}
                </div>
              ) : filteredRecipes.map(r => (
                <button key={r.id} className="pl-picker-row" onClick={async () => {
                  if (picker.replacingId) {
                    await removeMeal(picker.replacingId);
                    await addMeal(picker.dayIndex, r.id);
                  } else {
                    await addMeal(picker.dayIndex, r.id);
                  }
                  setPicker(null);
                }}>
                  <div className="pl-picker-thumb">
                    {(r as any).image_url ? <img src={(r as any).image_url} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : <span>🍽</span>}
                  </div>
                  <div className="pl-picker-info">
                    <span className="pl-picker-name">{r.title}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginTop: 3 }}>
                      {r.primary_protein && <ProteinBadge protein={r.primary_protein} />}
                      <span className="pl-picker-meta">{[(r as any).cook_time && `${(r as any).cook_time}m`, ...(r.tags?.slice(0, 2) || [])].filter(Boolean).join(' · ')}</span>
                    </div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--border)', flexShrink: 0 }}><path d="M9 18l6-6-6-6"/></svg>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Magic modal */}
      {showGenerateList && (
        <GenerateListModal
          onClose={() => setShowGenerateList(false)}
          onCreated={(id) => { setShowGenerateList(false); window.location.href = '/shopping-list'; }}
          defaultWeekStart={formatDate(weekStart)}
        />
      )}

      {showMagic && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowMagic(false); }}>
          <div className="magic-modal">
            <div className="magic-header">
              <div>
                <h2 className="magic-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: 8 }}><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
                  Auto-plan my week
                </h2>
                <p className="magic-sub">Fills the whole week from your recipe library</p>
              </div>
              <button className="modal-close" onClick={() => setShowMagic(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="magic-fields">
              <div className="magic-field">
                <label>Variety</label>
                <div className="toggle-group">
                  {(['low','medium','high'] as const).map(v => (
                    <button key={v} className={`toggle-btn ${magicSettings.variety === v ? 'active' : ''}`} onClick={() => setMagicSettings(p => ({ ...p, variety: v }))}>
                      {v === 'low' ? 'Favourites' : v === 'medium' ? 'Some variety' : 'Max variety'}
                    </button>
                  ))}
                </div>
                <p className="magic-hint">
                  {magicSettings.variety === 'low' && 'Repeats your top recipes freely'}
                  {magicSettings.variety === 'medium' && 'Avoids back-to-back repeats'}
                  {magicSettings.variety === 'high' && 'Each recipe used at most once'}
                </p>
              </div>
              <div className="magic-field">
                <label>Servings per meal</label>
                <div className="servings-row">
                  <button className="servings-btn" onClick={() => setMagicSettings(p => ({ ...p, servings: Math.max(1, p.servings - 1) }))}>−</button>
                  <span className="servings-val">{magicSettings.servings}</span>
                  <button className="servings-btn" onClick={() => setMagicSettings(p => ({ ...p, servings: Math.min(20, p.servings + 1) }))}>+</button>
                  <span className="servings-lbl">people</span>
                </div>
              </div>
              <div className="magic-field">
                <label>Prefer tags</label>
                <input className="magic-input" placeholder="e.g. italian, quick, vegetarian" value={magicSettings.preferTags} onChange={e => setMagicSettings(p => ({ ...p, preferTags: e.target.value }))} />
              </div>
              <div className="magic-field">
                <label>Avoid tags</label>
                <input className="magic-input" placeholder="e.g. spicy, heavy" value={magicSettings.excludeTags} onChange={e => setMagicSettings(p => ({ ...p, excludeTags: e.target.value }))} />
              </div>
            </div>
            <div className="magic-footer">
              <p className="magic-warn">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Replaces all current meals for this week
              </p>
              <div className="magic-footer-actions">
                <button className="btn-cancel" onClick={() => setShowMagic(false)}>Cancel</button>
                <button className="btn-magic-go" onClick={handleMagicSuggest} disabled={magicLoading}>
                  {magicLoading ? <span className="loading-dots"><span/><span/><span/></span> : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>Plan my week</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .pl-root { max-width: 680px; }

        /* Top bar */
        .pl-topbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 2.5rem; flex-wrap: wrap; }
        .pl-title { font-family: var(--font-display); font-size: 2.8rem; font-weight: 300; line-height: 1; color: var(--ink); margin-bottom: 0.75rem; }
        .pl-title em { font-style: italic; color: var(--rust); }
        .pl-week-nav { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
        .pl-nav-btn { background: white; border: 1px solid var(--border); border-radius: 6px; padding: 0.35rem 0.5rem; cursor: pointer; color: var(--ink-muted); display: flex; align-items: center; transition: all 0.15s; }
        .pl-nav-btn:hover { border-color: var(--ink-muted); color: var(--ink); }
        .pl-week-label { font-size: 0.88rem; color: var(--ink-soft); padding: 0 0.25rem; }
        .pl-today-btn { background: none; border: none; font-size: 0.78rem; color: var(--rust); cursor: pointer; padding: 0.35rem 0.5rem; border-radius: 4px; font-family: var(--font-body); transition: all 0.15s; }
        .pl-today-btn:hover { background: var(--parchment); }
        .pl-topbar-right { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
        .pl-count { font-size: 0.78rem; color: var(--ink-muted); }
        .pl-btn-magic { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.5rem 0.9rem; background: var(--ink); color: var(--cream); border: none; border-radius: 6px; font-size: 0.8rem; font-family: var(--font-body); cursor: pointer; transition: opacity 0.15s; }
        .pl-btn-magic:hover { opacity: 0.85; }
        .pl-btn-gen { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.5rem 0.9rem; background: var(--sage, #5a7a52); color: white; border: none; border-radius: 6px; font-size: 0.8rem; font-family: var(--font-body); cursor: pointer; transition: opacity 0.15s; }
        .pl-btn-gen:hover { opacity: 0.85; }

        /* Day list */
        .pl-days { display: flex; flex-direction: column; }
        .pl-day { padding: 1.25rem 0; border-bottom: 1px solid var(--border); transition: background 0.15s; }
        .pl-day:first-child { border-top: 1px solid var(--border); }
        .pl-day.is-past { opacity: 0.42; }
        .pl-day.drag-target { background: rgba(181,69,27,0.04); border-radius: 8px; outline: 2px dashed var(--rust); outline-offset: -4px; }

        /* Day header */
        .pl-day-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.85rem; }
        .pl-day-label { display: flex; align-items: center; gap: 0.6rem; }
        .pl-today-pip { font-size: 0.62rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: white; background: var(--rust); border-radius: 99px; padding: 2px 7px; line-height: 1.4; }
        .pl-day-name { font-family: var(--font-display); font-size: 1.35rem; font-weight: 300; color: var(--ink); line-height: 1; }
        .pl-day.is-today .pl-day-name { color: var(--rust); }
        .pl-day-date { font-size: 0.8rem; color: var(--ink-muted); }
        .pl-add-inline-btn { display: inline-flex; align-items: center; gap: 4px; padding: 0.28rem 0.65rem; background: none; border: 1px solid var(--border); border-radius: 99px; font-size: 0.72rem; color: var(--ink-muted); font-family: var(--font-body); cursor: pointer; transition: all 0.15s; }
        .pl-add-inline-btn:hover { border-color: var(--rust); color: var(--rust); }

        /* Recipe stack */
        .pl-meal-stack { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.75rem; }

        /* Recipe card */
        .pl-recipe-card { display: flex; align-items: stretch; gap: 0; background: white; border: 1px solid var(--border); border-radius: 10px; overflow: hidden; transition: all 0.15s; cursor: pointer; }
        .pl-recipe-card:hover { border-color: var(--rust); box-shadow: 0 2px 10px rgba(181,69,27,0.08); }
        .pl-recipe-card.is-dragging { opacity: 0.35; }
        .pl-recipe-img { width: 80px; height: 66px; flex-shrink: 0; background: var(--parchment); overflow: hidden; }
        .pl-recipe-img img { width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none; }
        .pl-recipe-info { flex: 1; min-width: 0; padding: 0.65rem 0.75rem; display: flex; flex-direction: column; justify-content: center; }
        .pl-recipe-top { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem; flex-wrap: wrap; }
        .pl-recipe-name { font-size: 0.9rem; color: var(--ink); font-weight: 400; line-height: 1.3; }
        .pl-recipe-meta { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; font-size: 0.72rem; color: var(--ink-muted); }
        .pl-recipe-tag { background: var(--parchment); border: 1px solid var(--border); border-radius: 99px; padding: 1px 6px; font-size: 0.66rem; color: var(--ink-soft); }
        .pl-card-actions { display: flex; align-items: center; gap: 6px; padding: 0 12px; flex-shrink: 0; align-self: center; }
        .pl-card-btn { background: white; border: 1px solid var(--border); border-radius: 50%; width: 32px; height: 32px; min-width: 32px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; cursor: pointer; color: var(--ink-muted); transition: all 0.18s; padding: 0; }
        .pl-card-btn:hover { border-color: var(--rust); color: var(--rust); }
        .pl-drag-handle { cursor: grab; }
        .pl-drag-handle:active { cursor: grabbing; }

        /* Empty slot */
        .pl-empty-slot { margin-bottom: 0.75rem; }
        .pl-add-dinner-pill {
          display: flex; align-items: center; justify-content: center; gap: 0.45rem;
          width: 100%; padding: 0.7rem 1rem;
          background: none; border: 1.5px dashed var(--border);
          border-radius: 10px; font-size: 0.82rem; color: var(--ink-muted);
          font-family: var(--font-body); cursor: pointer; transition: all 0.15s;
        }
        .pl-add-dinner-pill:hover { border-color: var(--rust); color: var(--rust); background: rgba(181,69,27,0.03); }
        .pl-suggestions { margin-top: 0.6rem; }
        .pl-suggestions-label { font-size: 0.65rem; color: var(--ink-muted); text-transform: uppercase; letter-spacing: 0.08em; display: block; margin-bottom: 0.4rem; }
        .pl-suggestion-pills { display: flex; flex-wrap: wrap; gap: 0.35rem; }
        .pl-suggestion-pill { display: inline-flex; align-items: center; gap: 5px; padding: 0.28rem 0.65rem; background: white; border: 1px solid var(--border); border-radius: 99px; font-size: 0.73rem; color: var(--ink-soft); font-family: var(--font-body); cursor: pointer; transition: all 0.15s; max-width: 190px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .pl-suggestion-pill:hover { border-color: var(--rust); color: var(--rust); background: rgba(181,69,27,0.03); }

        /* Day note textarea */
        .pl-day-note {
          width: 100%; box-sizing: border-box;
          border: none;
          background: transparent; resize: none; overflow: hidden;
          font-size: 0.82rem; font-family: var(--font-body); color: var(--ink-soft);
          line-height: 1.5; padding: 0; margin-top: 4px;
          outline: none; transition: color 0.15s;
          min-height: 30px;
        }
        .pl-day-note::placeholder { color: var(--ink-muted); font-style: italic; }
        .pl-day-note:focus { color: var(--ink); }
        .pl-day-note:focus::placeholder { color: var(--ink-soft); }

        /* Trash bar */
        .pl-trash-bar {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 1000;
          display: flex; align-items: center; justify-content: center; gap: 0.6rem;
          padding: 1rem; background: white; border-top: 1.5px solid var(--border);
          font-size: 0.85rem; color: var(--ink-muted);
          box-shadow: 0 -4px 20px rgba(26,22,18,0.08);
          transition: background 0.15s, color 0.15s, border-color 0.15s;
          animation: slideUp 0.2s ease;
        }
        .pl-trash-bar.active { background: #FEF2F2; border-color: #C0392B; color: #C0392B; }
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: none; opacity: 1; } }

        /* Picker */
        .pl-picker { background: white; border-radius: 12px; width: 440px; max-width: 95vw; max-height: 85vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 8px 40px rgba(26,22,18,0.15); }
        .pl-picker-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 1.25rem 1.25rem 0.75rem; border-bottom: 1px solid var(--parchment); }
        .pl-picker-title { font-family: var(--font-display); font-size: 1.2rem; font-weight: 300; color: var(--ink); }
        .pl-picker-day { font-size: 0.8rem; color: var(--ink-muted); margin-top: 2px; }
        .pl-picker-search-wrap { position: relative; padding: 0.75rem 1rem; border-bottom: 1px solid var(--parchment); }
        .pl-picker-search { width: 100%; padding: 0.55rem 0.85rem 0.55rem 2.4rem; border: 1px solid var(--border); border-radius: 8px; font-size: 0.88rem; font-family: var(--font-body); color: var(--ink); outline: none; transition: border-color 0.15s; box-sizing: border-box; }
        .pl-picker-search:focus { border-color: var(--rust); }
        .pl-picker-list { overflow-y: auto; flex: 1; padding: 0.5rem; }
        .pl-picker-empty { padding: 2rem; text-align: center; font-size: 0.85rem; color: var(--ink-muted); }
        .pl-picker-empty a { color: var(--rust); }
        .pl-picker-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.65rem 0.75rem; border-radius: 8px; border: none; background: none; cursor: pointer; width: 100%; text-align: left; transition: background 0.12s; font-family: var(--font-body); }
        .pl-picker-row:hover { background: var(--parchment); }
        .pl-picker-thumb { width: 44px; height: 44px; border-radius: 6px; overflow: hidden; background: var(--parchment); flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 20px; }
        .pl-picker-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .pl-picker-info { flex: 1; min-width: 0; }
        .pl-picker-name { display: block; font-size: 0.9rem; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pl-picker-meta { font-size: 0.72rem; color: var(--ink-muted); }

        /* Magic modal */
        .magic-modal { background: white; border-radius: 12px; padding: 2rem; width: 480px; max-width: 95vw; max-height: 90vh; overflow-y: auto; box-shadow: 0 8px 40px rgba(26,22,18,0.15); }
        .magic-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1.75rem; }
        .magic-title { font-family: var(--font-display); font-size: 1.5rem; font-weight: 300; color: var(--ink); display: flex; align-items: center; }
        .magic-sub { font-size: 0.8rem; color: var(--ink-muted); margin-top: 4px; }
        .magic-fields { display: flex; flex-direction: column; gap: 1.25rem; }
        .magic-field label { display: block; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--ink-muted); margin-bottom: 0.5rem; }
        .toggle-group { display: flex; gap: 0.4rem; flex-wrap: wrap; }
        .toggle-btn { padding: 0.42rem 0.85rem; border: 1px solid var(--border); border-radius: 99px; background: white; color: var(--ink-soft); font-size: 0.78rem; cursor: pointer; font-family: var(--font-body); transition: all 0.15s; }
        .toggle-btn:hover { border-color: var(--rust); color: var(--rust); }
        .toggle-btn.active { background: var(--rust); border-color: var(--rust); color: white; }
        .magic-hint { font-size: 0.73rem; color: var(--ink-muted); font-style: italic; margin-top: 0.4rem; }
        .servings-row { display: flex; align-items: center; gap: 0.65rem; }
        .servings-btn { width: 30px; height: 30px; border: 1px solid var(--border); border-radius: 50%; background: white; color: var(--ink-soft); font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; font-family: var(--font-body); line-height: 1; }
        .servings-btn:hover { border-color: var(--rust); color: var(--rust); }
        .servings-val { font-family: var(--font-display); font-size: 1.5rem; font-weight: 300; color: var(--rust); min-width: 28px; text-align: center; }
        .servings-lbl { font-size: 0.8rem; color: var(--ink-muted); }
        .magic-input { width: 100%; padding: 0.55rem 0.85rem; border: 1px solid var(--border); border-radius: 8px; font-family: var(--font-body); font-size: 0.88rem; color: var(--ink); outline: none; transition: border-color 0.15s; box-sizing: border-box; }
        .magic-input:focus { border-color: var(--rust); }
        .magic-footer { margin-top: 1.75rem; padding-top: 1.25rem; border-top: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
        .magic-footer-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; }
        .magic-warn { display: flex; align-items: center; gap: 0.4rem; font-size: 0.73rem; color: var(--ink-muted); }
        .btn-cancel { padding: 0.5rem 0.9rem; background: white; border: 1px solid var(--border); border-radius: 6px; font-size: 0.8rem; font-family: var(--font-body); color: var(--ink-soft); cursor: pointer; transition: all 0.15s; }
        .btn-cancel:hover { border-color: var(--ink-muted); }
        .btn-magic-go { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.5rem 1.1rem; background: var(--ink); color: var(--cream); border: none; border-radius: 6px; font-size: 0.8rem; font-family: var(--font-body); cursor: pointer; transition: all 0.15s; }
        .btn-magic-go:hover:not(:disabled) { background: var(--rust); }
        .btn-magic-go:disabled { opacity: 0.5; cursor: not-allowed; }

        .pl-loading { display: flex; align-items: center; justify-content: center; padding: 4rem; }

        /* Mobile */
        @media (max-width: 600px) {
          .pl-title { font-size: 2rem; }
          .pl-topbar { gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
          .pl-btn-magic, .pl-btn-gen { font-size: 0.75rem; padding: 0.42rem 0.7rem; }
          .pl-day { padding: 1rem 0; }
          .pl-day-name { font-size: 1.1rem; }
          .pl-recipe-img { width: 64px; height: 56px; }
          .pl-recipe-name { font-size: 0.85rem; }
          .pl-picker { max-height: 92dvh; border-radius: 16px 16px 0 0; width: 100%; max-width: 100%; }
          .modal-overlay { align-items: flex-end; }
          .pl-trash-bar { padding: 1.25rem 1rem 2rem; }
          .magic-modal { width: 100%; max-width: 100%; border-radius: 16px 16px 0 0; padding: 1.25rem 1.1rem calc(1.25rem + env(safe-area-inset-bottom, 0)); }
          .magic-input { font-size: 16px; }
          .magic-footer-actions { width: 100%; }
          .magic-footer-actions .btn-cancel,
          .magic-footer-actions .btn-magic-go { flex: 1 1 auto; justify-content: center; }
        }
      `}</style>
    </div>
  );
}
