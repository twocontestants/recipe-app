'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Recipe, MealPlan } from '@/lib/db';
import { showToast } from '@/components/Toast';

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
const ALL_PROTEINS = Object.keys(PROTEIN_COLORS);

function ProteinBadge({ protein }: { protein?: string }) {
  if (!protein) return null;
  const color = PROTEIN_COLORS[protein] || '#888';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '3px',
      fontSize: '0.65rem', fontWeight: 600, textTransform: 'capitalize',
      color: 'white', background: color, borderRadius: '99px',
      padding: '2px 7px', lineHeight: 1.4, letterSpacing: '0.02em', flexShrink: 0,
    }}>
      {PROTEIN_EMOJI[protein]} {protein}
    </span>
  );
}

// ── Date helpers ──────────────────────────────────────────────────────────────

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const DAYS_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

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
  const opt = (d: Date) => d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  return `${opt(monday)} – ${opt(sun)}`;
}
function isThisWeek(monday: Date): boolean {
  return formatDate(monday) === formatDate(getMonday(new Date()));
}
function isNextWeek(monday: Date): boolean {
  const next = getMonday(new Date()); next.setDate(next.getDate() + 7);
  return formatDate(monday) === formatDate(next);
}
function weekLabel(monday: Date): string {
  if (isThisWeek(monday)) return 'This week';
  if (isNextWeek(monday)) return 'Next week';
  return formatWeekRange(monday);
}
function getDayDate(weekStart: Date, dayIndex: number): Date {
  const d = new Date(weekStart); d.setDate(weekStart.getDate() + dayIndex); return d;
}
function todayDayIndex(): number {
  const d = new Date().getDay(); return d === 0 ? 6 : d - 1;
}

// ── Suggestion logic (client-side) ────────────────────────────────────────────

function suggestForDay(
  recipes: Recipe[],
  plannedProteins: (string | null | undefined)[], // proteins of already-planned days
  count = 3
): Recipe[] {
  if (recipes.length === 0) return [];
  const usedProteins = new Set(plannedProteins.filter(Boolean));
  // Prefer recipes whose protein isn't already used this week
  const fresh = recipes.filter(r => !usedProteins.has(r.primary_protein ?? ''));
  const pool = fresh.length >= count ? fresh : [...fresh, ...recipes.filter(r => !fresh.includes(r))];
  // Shuffle
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ── Magic settings ────────────────────────────────────────────────────────────

interface MagicSettings {
  variety: 'low' | 'medium' | 'high';
  servings: number;
  preferTags: string;
  excludeTags: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function PlannerClient() {
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  // Picker modal state
  const [picker, setPicker] = useState<{ dayIndex: number; replacing?: string } | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');

  // Magic modal
  const [showMagic, setShowMagic] = useState(false);
  const [magicSettings, setMagicSettings] = useState<MagicSettings>({
    variety: 'medium', servings: 4, preferTags: '', excludeTags: '',
  });
  const [magicLoading, setMagicLoading] = useState(false);

  // Day action menu (replace/remove)
  const [actionMenu, setActionMenu] = useState<{ mealId: string; dayIndex: number } | null>(null);

  const todayRef = useRef<HTMLDivElement>(null);

  // ── Data fetching ───────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, recipesRes] = await Promise.all([
        fetch(`/api/planner?weekStart=${formatDate(weekStart)}`),
        fetch('/api/recipes'),
      ]);
      setMealPlans(await plansRes.json());
      setRecipes(await recipesRes.json());
    } catch { showToast('Failed to load planner', 'error'); }
    finally { setLoading(false); }
  }, [weekStart]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Scroll to today on first load
  useEffect(() => {
    if (!loading && todayRef.current && isThisWeek(weekStart)) {
      todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [loading]);

  // Close action menu on outside click
  useEffect(() => {
    if (!actionMenu) return;
    const handler = () => setActionMenu(null);
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [actionMenu]);

  // ── Meal operations ─────────────────────────────────────────────────────────

  const getMealForDay = (dayIndex: number) =>
    mealPlans.find(m => m.day_of_week === dayIndex && m.meal_type === 'dinner') ?? null;

  const addMeal = async (dayIndex: number, recipeId: string) => {
    try {
      const recipe = recipes.find(r => r.id === recipeId);
      const res = await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week_start: formatDate(weekStart), recipe_id: recipeId,
          day_of_week: dayIndex, meal_type: 'dinner',
          servings: recipe?.servings || 4,
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

  const replaceMeal = async (dayIndex: number, existingId: string, newRecipeId: string) => {
    await removeMeal(existingId);
    await addMeal(dayIndex, newRecipeId);
  };

  // ── Magic plan ──────────────────────────────────────────────────────────────

  const handleMagicSuggest = async () => {
    if (recipes.length === 0) { showToast('Add some recipes first!', 'error'); return; }
    setMagicLoading(true);
    try {
      for (const meal of mealPlans) await fetch(`/api/planner?id=${meal.id}`, { method: 'DELETE' });
      const preferTags = magicSettings.preferTags.split(',').map(t => t.trim()).filter(Boolean);
      const excludeTags = magicSettings.excludeTags.split(',').map(t => t.trim()).filter(Boolean);
      let pool = recipes.filter(r => !excludeTags.some(t => r.tags?.includes(t)));
      if (pool.length === 0) pool = recipes;
      const scored = pool.map(r => ({
        recipe: r,
        score: Math.random() + (preferTags.some(t => r.tags?.includes(t)) ? 1 : 0),
      })).sort((a, b) => b.score - a.score);

      const picks: string[] = [];
      for (let day = 0; day < 7; day++) {
        let idx = 0;
        if (magicSettings.variety === 'high') {
          const used = new Set(picks);
          const unused = scored.filter(s => !used.has(s.recipe.id));
          const from = unused.length > 0 ? unused : scored;
          idx = Math.floor(Math.random() * Math.min(from.length, 3));
          picks.push(from[idx].recipe.id);
        } else if (magicSettings.variety === 'medium') {
          const recent = picks.slice(-3);
          const from = scored.filter(s => !recent.includes(s.recipe.id));
          const pool2 = from.length > 0 ? from : scored;
          idx = Math.floor(Math.random() * Math.min(pool2.length, 5));
          picks.push(pool2[idx].recipe.id);
        } else {
          idx = Math.floor(Math.random() * Math.min(scored.length, 3));
          picks.push(scored[idx].recipe.id);
        }
      }

      for (let day = 0; day < 7; day++) {
        await fetch('/api/planner', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            week_start: formatDate(weekStart), recipe_id: picks[day],
            day_of_week: day, meal_type: 'dinner',
            servings: magicSettings.servings,
          }),
        });
      }
      await fetchData();
      setShowMagic(false);
      showToast('Week planned! ✨', 'success');
    } catch { showToast('Magic plan failed', 'error'); }
    finally { setMagicLoading(false); }
  };

  // ── Picker filter ───────────────────────────────────────────────────────────

  const filteredRecipes = recipes.filter(r =>
    !pickerSearch ||
    r.title.toLowerCase().includes(pickerSearch.toLowerCase()) ||
    r.tags?.some(t => t.toLowerCase().includes(pickerSearch.toLowerCase()))
  );

  // Planned proteins for suggestion logic
  const plannedProteins = DAYS.map((_, i) => getMealForDay(i)?.recipe?.primary_protein);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="pl-root">

      {/* ── Top bar ── */}
      <div className="pl-topbar">
        <div className="pl-topbar-left">
          <h1 className="pl-title">Meal <em>Planner</em></h1>
          <div className="pl-week-nav">
            <button className="pl-nav-btn" onClick={() => setWeekStart(d => { const nd = new Date(d); nd.setDate(d.getDate() - 7); return nd; })}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span className="pl-week-label">{weekLabel(weekStart)}</span>
            <button className="pl-nav-btn" onClick={() => setWeekStart(d => { const nd = new Date(d); nd.setDate(d.getDate() + 7); return nd; })}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </button>
            {!isThisWeek(weekStart) && (
              <button className="pl-today-btn" onClick={() => setWeekStart(getMonday(new Date()))}>Today</button>
            )}
          </div>
        </div>
        <div className="pl-topbar-right">
          <span className="pl-count">{mealPlans.length} of 7 planned</span>
          <button className="pl-btn-magic" onClick={() => setShowMagic(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
            Auto-plan
          </button>
          <a href="/shopping-list" className="pl-btn-shop">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            Shopping list
          </a>
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
            const meal = getMealForDay(dayIndex);
            const recipe = meal?.recipe ?? null;
            const suggestions = !recipe ? suggestForDay(
              recipes,
              plannedProteins.filter((_, i) => i !== dayIndex),
              3
            ) : [];

            return (
              <div
                key={dayIndex}
                ref={isToday ? todayRef : undefined}
                className={`pl-day ${isToday ? 'is-today' : ''} ${isPast ? 'is-past' : ''}`}
              >
                {/* Day header */}
                <div className="pl-day-header">
                  <div className="pl-day-label">
                    {isToday && <span className="pl-today-pip">Today</span>}
                    <span className="pl-day-name">{dayName}</span>
                    <span className="pl-day-date">
                      {date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  {recipe && (
                    <div className="pl-day-actions" onMouseDown={e => e.stopPropagation()}>
                      <button
                        className="pl-action-btn"
                        title="Replace or remove"
                        onClick={() => setActionMenu(prev =>
                          prev?.mealId === meal!.id ? null : { mealId: meal!.id, dayIndex }
                        )}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
                          <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                          <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
                        </svg>
                      </button>
                      {actionMenu?.mealId === meal!.id && (
                        <div className="pl-action-menu" onMouseDown={e => e.stopPropagation()}>
                          <button onClick={() => { setActionMenu(null); setPicker({ dayIndex, replacing: meal!.id }); setPickerSearch(''); }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            Replace recipe
                          </button>
                          <button className="danger" onClick={() => { setActionMenu(null); removeMeal(meal!.id); }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Recipe card or empty state */}
                {recipe ? (
                  <div
                    className="pl-recipe-card"
                    onClick={() => window.open(`/recipes`, '_self')}
                    title="View recipe"
                  >
                    {(recipe as any).image_url && (
                      <div className="pl-recipe-img">
                        <img src={(recipe as any).image_url} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                    )}
                    <div className="pl-recipe-info">
                      <div className="pl-recipe-top">
                        <span className="pl-recipe-name">{recipe.title}</span>
                        {recipe.primary_protein && <ProteinBadge protein={recipe.primary_protein} />}
                      </div>
                      <div className="pl-recipe-meta">
                        {(recipe as any).cook_time && <span>🔥 {(recipe as any).cook_time}m</span>}
                        {(recipe as any).servings && <span>👤 {(recipe as any).servings} servings</span>}
                        {(recipe as any).tags?.slice(0, 2).map((t: string) => (
                          <span key={t} className="pl-recipe-tag">{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="pl-empty-slot">
                    <button
                      className="pl-add-btn"
                      onClick={() => { setPicker({ dayIndex }); setPickerSearch(''); }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                      Add dinner
                    </button>

                    {suggestions.length > 0 && (
                      <div className="pl-suggestions">
                        <span className="pl-suggestions-label">Suggestions to vary your week</span>
                        <div className="pl-suggestion-pills">
                          {suggestions.map(r => (
                            <button
                              key={r.id}
                              className="pl-suggestion-pill"
                              onClick={() => addMeal(dayIndex, r.id)}
                              title={r.title}
                            >
                              {r.primary_protein && (
                                <span style={{
                                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                                  background: PROTEIN_COLORS[r.primary_protein] || '#ccc',
                                  display: 'inline-block',
                                }} />
                              )}
                              {r.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Recipe picker modal ── */}
      {picker && (
        <div className="modal-overlay" onClick={() => setPicker(null)}>
          <div className="pl-picker" onClick={e => e.stopPropagation()}>
            <div className="pl-picker-header">
              <div>
                <h2 className="pl-picker-title">
                  {picker.replacing ? 'Replace recipe' : 'Add dinner'}
                </h2>
                <p className="pl-picker-day">{DAYS[picker.dayIndex]}</p>
              </div>
              <button className="modal-close" onClick={() => setPicker(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="pl-picker-search-wrap">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-muted)', pointerEvents: 'none' }}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input
                autoFocus
                type="text"
                className="pl-picker-search"
                placeholder="Search recipes…"
                value={pickerSearch}
                onChange={e => setPickerSearch(e.target.value)}
              />
            </div>
            <div className="pl-picker-list">
              {filteredRecipes.length === 0 ? (
                <div className="pl-picker-empty">
                  {recipes.length === 0
                    ? <><span>No recipes yet.</span> <a href="/recipes">Add some →</a></>
                    : <span>No matches for "{pickerSearch}"</span>}
                </div>
              ) : filteredRecipes.map(r => (
                <button
                  key={r.id}
                  className="pl-picker-row"
                  onClick={async () => {
                    if (picker.replacing) {
                      await replaceMeal(picker.dayIndex, picker.replacing, r.id);
                    } else {
                      await addMeal(picker.dayIndex, r.id);
                    }
                    setPicker(null);
                  }}
                >
                  <div className="pl-picker-thumb">
                    {(r as any).image_url
                      ? <img src={(r as any).image_url} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      : <span>🍽</span>}
                  </div>
                  <div className="pl-picker-info">
                    <span className="pl-picker-name">{r.title}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {r.primary_protein && <ProteinBadge protein={r.primary_protein} />}
                      <span className="pl-picker-meta">
                        {[(r as any).cook_time && `${(r as any).cook_time}m`, ...(r.tags?.slice(0, 2) || [])].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--border)', flexShrink: 0 }}><path d="M9 18l6-6-6-6"/></svg>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Magic modal ── */}
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
                    <button key={v} className={`toggle-btn ${magicSettings.variety === v ? 'active' : ''}`}
                      onClick={() => setMagicSettings(p => ({ ...p, variety: v }))}>
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
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn-cancel" onClick={() => setShowMagic(false)}>Cancel</button>
                <button className="btn-magic-go" onClick={handleMagicSuggest} disabled={magicLoading}>
                  {magicLoading
                    ? <span className="loading-dots"><span/><span/><span/></span>
                    : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>Plan my week</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* ── Layout ── */
        .pl-root { max-width: 680px; }

        /* ── Top bar ── */
        .pl-topbar {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 1rem; margin-bottom: 2.5rem; flex-wrap: wrap;
        }
        .pl-title {
          font-family: var(--font-display); font-size: 2.8rem; font-weight: 300;
          line-height: 1; color: var(--ink); margin-bottom: 0.75rem;
        }
        .pl-title em { font-style: italic; color: var(--rust); }
        .pl-week-nav { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
        .pl-nav-btn {
          background: white; border: 1px solid var(--border); border-radius: 6px;
          padding: 0.35rem 0.5rem; cursor: pointer; color: var(--ink-muted);
          display: flex; align-items: center; transition: all 0.15s;
        }
        .pl-nav-btn:hover { border-color: var(--ink-muted); color: var(--ink); }
        .pl-week-label { font-size: 0.88rem; color: var(--ink-soft); padding: 0 0.25rem; }
        .pl-today-btn {
          background: none; border: none; font-size: 0.78rem; color: var(--rust);
          cursor: pointer; padding: 0.35rem 0.5rem; border-radius: 4px;
          font-family: var(--font-body); transition: all 0.15s;
        }
        .pl-today-btn:hover { background: var(--parchment); }
        .pl-topbar-right { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
        .pl-count { font-size: 0.78rem; color: var(--ink-muted); }
        .pl-btn-magic {
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.5rem 0.9rem; background: var(--ink); color: var(--cream);
          border: none; border-radius: 6px; font-size: 0.8rem;
          font-family: var(--font-body); cursor: pointer; transition: opacity 0.15s;
        }
        .pl-btn-magic:hover { opacity: 0.85; }
        .pl-btn-shop {
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.5rem 0.9rem; background: var(--rust); color: white;
          border: none; border-radius: 6px; font-size: 0.8rem;
          font-family: var(--font-body); cursor: pointer; text-decoration: none;
          transition: opacity 0.15s;
        }
        .pl-btn-shop:hover { opacity: 0.88; }

        /* ── Day list ── */
        .pl-days { display: flex; flex-direction: column; gap: 0; }

        .pl-day {
          padding: 1.25rem 0;
          border-bottom: 1px solid var(--border);
          transition: opacity 0.2s;
        }
        .pl-day:first-child { border-top: 1px solid var(--border); }
        .pl-day.is-past { opacity: 0.45; }
        .pl-day.is-today { opacity: 1; }

        /* Day header */
        .pl-day-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 0.75rem;
        }
        .pl-day-label { display: flex; align-items: baseline; gap: 0.6rem; }
        .pl-today-pip {
          font-size: 0.62rem; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.1em; color: white; background: var(--rust);
          border-radius: 99px; padding: 2px 7px; line-height: 1.4;
        }
        .pl-day-name {
          font-family: var(--font-display); font-size: 1.35rem; font-weight: 300;
          color: var(--ink); line-height: 1;
        }
        .pl-day.is-today .pl-day-name { color: var(--rust); }
        .pl-day-date { font-size: 0.8rem; color: var(--ink-muted); }

        /* Day action menu */
        .pl-day-actions { position: relative; }
        .pl-action-btn {
          background: none; border: 1px solid var(--border); border-radius: 6px;
          padding: 0.3rem 0.45rem; color: var(--ink-muted); cursor: pointer;
          display: flex; align-items: center; transition: all 0.15s;
        }
        .pl-action-btn:hover { border-color: var(--ink-muted); color: var(--ink); }
        .pl-action-menu {
          position: absolute; right: 0; top: calc(100% + 6px); z-index: 200;
          background: white; border: 1px solid var(--border); border-radius: 8px;
          box-shadow: 0 4px 20px rgba(26,22,18,0.12); overflow: hidden; min-width: 160px;
        }
        .pl-action-menu button {
          display: flex; align-items: center; gap: 0.5rem; width: 100%;
          padding: 0.65rem 1rem; background: none; border: none; font-size: 0.83rem;
          font-family: var(--font-body); color: var(--ink-soft); cursor: pointer;
          text-align: left; transition: background 0.12s;
        }
        .pl-action-menu button:hover { background: var(--parchment); }
        .pl-action-menu button.danger { color: #c0392b; }
        .pl-action-menu button.danger:hover { background: #fef2f2; }

        /* Recipe card */
        .pl-recipe-card {
          display: flex; gap: 1rem; align-items: center;
          background: white; border: 1px solid var(--border); border-radius: 10px;
          overflow: hidden; cursor: pointer; transition: all 0.15s;
        }
        .pl-recipe-card:hover { border-color: var(--rust); box-shadow: 0 2px 12px rgba(181,69,27,0.1); }
        .pl-recipe-img {
          width: 90px; height: 72px; flex-shrink: 0;
          background: var(--parchment); overflow: hidden;
        }
        .pl-recipe-img img { width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none; }
        .pl-recipe-info { flex: 1; min-width: 0; padding: 0.75rem 1rem 0.75rem 0; }
        .pl-recipe-top { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem; flex-wrap: wrap; }
        .pl-recipe-name { font-size: 0.95rem; color: var(--ink); font-weight: 400; line-height: 1.3; }
        .pl-recipe-meta { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; font-size: 0.75rem; color: var(--ink-muted); }
        .pl-recipe-tag {
          background: var(--parchment); border: 1px solid var(--border);
          border-radius: 99px; padding: 1px 7px; font-size: 0.68rem; color: var(--ink-soft);
        }

        /* Empty slot */
        .pl-empty-slot { display: flex; flex-direction: column; gap: 0.75rem; }
        .pl-add-btn {
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.55rem 1rem; background: none; border: 1.5px dashed var(--border);
          border-radius: 8px; font-size: 0.82rem; color: var(--ink-muted);
          font-family: var(--font-body); cursor: pointer; transition: all 0.15s;
          align-self: flex-start;
        }
        .pl-add-btn:hover { border-color: var(--rust); color: var(--rust); }

        /* Suggestions */
        .pl-suggestions { }
        .pl-suggestions-label {
          font-size: 0.68rem; color: var(--ink-muted); text-transform: uppercase;
          letter-spacing: 0.08em; display: block; margin-bottom: 0.4rem;
        }
        .pl-suggestion-pills { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .pl-suggestion-pill {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 0.3rem 0.7rem; background: white; border: 1px solid var(--border);
          border-radius: 99px; font-size: 0.75rem; color: var(--ink-soft);
          font-family: var(--font-body); cursor: pointer; transition: all 0.15s;
          max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .pl-suggestion-pill:hover { border-color: var(--rust); color: var(--rust); background: rgba(181,69,27,0.04); }

        /* ── Picker modal ── */
        .pl-picker {
          background: white; border-radius: 12px; width: 440px; max-width: 95vw;
          max-height: 85vh; display: flex; flex-direction: column; overflow: hidden;
          box-shadow: 0 8px 40px rgba(26,22,18,0.15);
        }
        .pl-picker-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          padding: 1.25rem 1.25rem 0.75rem; border-bottom: 1px solid var(--parchment);
        }
        .pl-picker-title { font-family: var(--font-display); font-size: 1.2rem; font-weight: 300; color: var(--ink); }
        .pl-picker-day { font-size: 0.8rem; color: var(--ink-muted); margin-top: 2px; }
        .pl-picker-search-wrap { position: relative; padding: 0.75rem 1rem; border-bottom: 1px solid var(--parchment); }
        .pl-picker-search {
          width: 100%; padding: 0.55rem 0.85rem 0.55rem 2.2rem;
          border: 1px solid var(--border); border-radius: 8px;
          font-size: 0.88rem; font-family: var(--font-body); color: var(--ink);
          outline: none; transition: border-color 0.15s; box-sizing: border-box;
        }
        .pl-picker-search:focus { border-color: var(--rust); }
        .pl-picker-list { overflow-y: auto; flex: 1; padding: 0.5rem; }
        .pl-picker-empty { padding: 2rem; text-align: center; font-size: 0.85rem; color: var(--ink-muted); }
        .pl-picker-empty a { color: var(--rust); }
        .pl-picker-row {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.65rem 0.75rem; border-radius: 8px; border: none;
          background: none; cursor: pointer; width: 100%; text-align: left;
          transition: background 0.12s; font-family: var(--font-body);
        }
        .pl-picker-row:hover { background: var(--parchment); }
        .pl-picker-thumb {
          width: 44px; height: 44px; border-radius: 6px; overflow: hidden;
          background: var(--parchment); flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; font-size: 20px;
        }
        .pl-picker-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .pl-picker-info { flex: 1; min-width: 0; }
        .pl-picker-name { display: block; font-size: 0.9rem; color: var(--ink); margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pl-picker-meta { font-size: 0.72rem; color: var(--ink-muted); }

        /* ── Magic modal ── */
        .magic-modal {
          background: white; border-radius: 12px; padding: 2rem;
          width: 480px; max-width: 95vw; max-height: 90vh; overflow-y: auto;
          box-shadow: 0 8px 40px rgba(26,22,18,0.15);
        }
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
        .magic-warn { display: flex; align-items: center; gap: 0.4rem; font-size: 0.73rem; color: var(--ink-muted); }
        .btn-cancel { padding: 0.5rem 0.9rem; background: white; border: 1px solid var(--border); border-radius: 6px; font-size: 0.8rem; font-family: var(--font-body); color: var(--ink-soft); cursor: pointer; transition: all 0.15s; }
        .btn-cancel:hover { border-color: var(--ink-muted); }
        .btn-magic-go { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.5rem 1.1rem; background: var(--ink); color: var(--cream); border: none; border-radius: 6px; font-size: 0.8rem; font-family: var(--font-body); cursor: pointer; transition: all 0.15s; }
        .btn-magic-go:hover:not(:disabled) { background: var(--rust); }
        .btn-magic-go:disabled { opacity: 0.5; cursor: not-allowed; }

        .pl-loading { display: flex; align-items: center; justify-content: center; padding: 4rem; }

        /* ── Mobile ── */
        @media (max-width: 600px) {
          .pl-title { font-size: 2rem; }
          .pl-topbar { gap: 0.75rem; margin-bottom: 1.5rem; }
          .pl-topbar-right { gap: 0.4rem; }
          .pl-btn-magic, .pl-btn-shop { font-size: 0.75rem; padding: 0.42rem 0.7rem; }
          .pl-day { padding: 1rem 0; }
          .pl-day-name { font-size: 1.1rem; }
          .pl-recipe-img { width: 70px; height: 58px; }
          .pl-recipe-name { font-size: 0.88rem; }
          .pl-picker { max-height: 92dvh; border-radius: 16px 16px 0 0; }
          .modal-overlay { align-items: flex-end; }
        }
      `}</style>
    </div>
  );
}
