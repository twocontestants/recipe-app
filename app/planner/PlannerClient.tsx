'use client';

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import type { Recipe, MealPlan } from '@/lib/db';
import { showToast } from '@/components/Toast';
import GenerateListModal from '@/components/GenerateListModal';
import PickerSearchField from '@/components/PickerSearchField';
import PickerRecipeRow from '@/components/PickerRecipeRow';
import PlannerCardMenu from '@/components/PlannerCardMenu';
import PlannerDaySheet, { type PlannedMeal } from '@/components/PlannerDaySheet';
import HiddenDatePicker, { openNativeDatePicker } from '@/components/HiddenDatePicker';
import { usePlannerLive } from '@/components/usePlannerLive';
import { useAuth } from '@/components/AuthProvider';
import { recipeEditPath, recipeViewPath } from '@/lib/recipeLinks';
import { computePickerSheetBox } from '@/lib/pickerViewport';
import { fetchMealsForMonths, mergePlannerMeals } from '@/lib/loadPlannerMonth';
import { countPlannedDays, displayWeekDateRange, notesByDisplayIndex, recipeCardMeta, sameDisplayWeek, weekChipClass } from '@/lib/plannerLoad';
import {
  adjacentMonthKeys,
  missingMonths,
  monthKeyOf,
  monthRange,
  monthsForDisplayWeek,
} from '@/lib/plannerMonth';
import {
  dayDateOf,
  displayDayIndex,
  displayDays,
  formatWeekLabel,
  localDateIso,
  parseLocalIso,
  parseWeekStartDay,
  shiftWeek,
  startOfDisplayWeek,
  storageCoords,
  type DayKey,
} from '@/lib/plannerDays';
import { mealOnDate, plannedOnOf } from '@/lib/plannerDate';
import {
  isRailOrigin,
  sheetAnchorForDate,
  sheetAnchorForRailPick,
  weekPlanFromMeals,
} from '@/lib/plannerDaySheet';
import {
  HOLD_MS,
  bottomNavReserve,
  dayOccupied,
  edgeScrollDelta,
  railDayCount,
  resolveDragTarget,
  sameDragTarget,
  shouldAllowDrag,
  shouldArmFromMovement,
  surroundingRailDays,
  titlesOnDay,
  type DragTarget,
  type RailHit,
  type WeekHit,
} from '@/lib/plannerDrag';

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

function formatDate(d: Date): string { return localDateIso(d); }
function getDayDate(weekStart: Date, i: number): Date {
  const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d;
}

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
  const { user } = useAuth();
  const [weekStartsOn, setWeekStartsOn] = useState<DayKey>('monday');
  const [weekStart, setWeekStart] = useState<Date>(() => startOfDisplayWeek(new Date(), 'monday'));
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => displayDayIndex(new Date(), 'monday'));
  const jumpDateRef = useRef<HTMLInputElement>(null);
  const dayKeys = displayDays(weekStartsOn);
  const DAYS = dayKeys.map(k => k.charAt(0).toUpperCase() + k.slice(1));
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [showGenerateList, setShowGenerateList] = useState(false);

  // Picker
  const [picker, setPicker] = useState<{ dayIndex: number; replacingId?: string } | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerOwnOnly, setPickerOwnOnly] = useState(false);
  const pickerOverlayRef = useRef<HTMLDivElement>(null);
  const pickerSearchRef = useRef<HTMLInputElement>(null);

  // Magic
  const [showMagic, setShowMagic] = useState(false);
  const [magicSettings, setMagicSettings] = useState<MagicSettings>({ variety: 'medium', servings: 4, preferTags: '', excludeTags: '' });
  const [magicLoading, setMagicLoading] = useState(false);

  const [suggestions, setSuggestions] = useState<Record<number, Recipe[]>>({});

  // Card action menu (view / edit / replace / move / delete)
  const [cardMenu, setCardMenu] = useState<{
    mealId: string;
    recipeId: string;
    dayIndex: number;
    right: number;
    y: number;
    up: boolean;
    view: 'root' | 'move';
  } | null>(null);
  const cardMenuRef = useRef<HTMLDivElement>(null);

  // Note save debounce timers
  const noteTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const todayRef = useRef<HTMLDivElement | null>(null);
  const dayEls = useRef<(HTMLDivElement | null)[]>([]);
  const railEls = useRef<(HTMLDivElement | null)[]>([]);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdEl = useRef<HTMLElement | null>(null);
  const railFetchGen = useRef(0);
  const suppressCardClick = useRef(false);
  const dragRef = useRef<{
    mealId: string;
    originIso: string;
    pointerId: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
    armed: boolean;
    target: DragTarget;
  } | null>(null);
  const [drag, setDrag] = useState<typeof dragRef.current>(null);
  const [railDays, setRailDays] = useState<string[]>([]);
  const [railBottom, setRailBottom] = useState(0);
  const [railMeals, setRailMeals] = useState<MealPlan[]>([]);
  const railPickEls = useRef<{ earlier: HTMLDivElement | null; later: HTMLDivElement | null }>({
    earlier: null,
    later: null,
  });
  const [moveSheet, setMoveSheet] = useState<{
    mealId: string;
    recipeTitle: string;
    weekStart: string;
    selectedDay: number;
  } | null>(null);
  const [moveSheetPlan, setMoveSheetPlan] = useState<Record<number, PlannedMeal[]>>({});
  const [moveSheetSaving, setMoveSheetSaving] = useState(false);
  const mealStoreRef = useRef(new Map<string, MealPlan>());
  const loadedMonthsRef = useRef(new Set<string>());
  const weekStartRef = useRef(weekStart);
  weekStartRef.current = weekStart;
  const weekStartsOnRef = useRef(weekStartsOn);
  weekStartsOnRef.current = weekStartsOn;

  const snapshotMealPlans = () => [...mealStoreRef.current.values()];

  const mergeMealPlans = (plans: MealPlan[]) => {
    for (const plan of plans) mealStoreRef.current.set(plan.id, plan);
  };

  const ensureMonths = async (keys: string[]): Promise<MealPlan[]> => {
    const needed = missingMonths(keys, loadedMonthsRef.current);
    if (needed.length) {
      const meals = await fetchMealsForMonths(needed);
      if (!meals.length) return snapshotMealPlans();
      for (const key of needed) {
        const { from, to } = monthRange(key);
        for (const [id, meal] of mealStoreRef.current) {
          const on = plannedOnOf(meal);
          if (on >= from && on <= to) mealStoreRef.current.delete(id);
        }
      }
      mergeMealPlans(meals);
      for (const key of needed) loadedMonthsRef.current.add(key);
    }
    return snapshotMealPlans();
  };

  const reloadFromServer = async () => {
    const displayIso = formatDate(weekStartRef.current);
    const keys = monthsForDisplayWeek(displayIso);
    try {
      const monthMeals = await fetchMealsForMonths(keys);
      const meals = mergePlannerMeals(monthMeals);
      if (!meals.length && mealStoreRef.current.size > 0) return;
      mealStoreRef.current = new Map(meals.map(meal => [meal.id, meal]));
      if (meals.length) loadedMonthsRef.current = new Set(keys);
      setMealPlans(snapshotMealPlans());
    } catch { /* keep the copy already on screen */ }
  };

  const { broadcastPlannerChanged } = usePlannerLive(() => { void reloadFromServer(); }, user?.id);

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const viewingThisWeek = formatDate(weekStart) === formatDate(startOfDisplayWeek(new Date(), weekStartsOn));
  const todayDisplayIdx = displayDayIndex(new Date(), weekStartsOn);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/preferences');
        if (!res.ok) return;
        const d = await res.json();
        const day = parseWeekStartDay(d.weekStartDay);
        const nextStart = startOfDisplayWeek(new Date(), day);
        const nextIso = formatDate(nextStart);
        setWeekStartsOn(prev => (prev === day ? prev : day));
        setWeekStart(prev => (sameDisplayWeek(formatDate(prev), nextIso) ? prev : nextStart));
      } catch { /* keep Monday default */ }
    })();
  }, []);

  const mealOnDisplayDay = (m: MealPlan, displayIndex: number) => {
    const date = getDayDate(weekStart, displayIndex);
    return mealOnDate(m, formatDate(date)) && m.meal_type === 'dinner';
  };

  const weekStartIso = formatDate(weekStart);

  const fetchData = useCallback(async () => {
    const displayIso = weekStartIso;
    const monthKeys = monthsForDisplayWeek(displayIso);
    const firstPaint = mealStoreRef.current.size === 0;
    if (firstPaint) setLoading(true);
    try {
      const { from, to } = displayWeekDateRange(displayIso);
      const notesPromise = fetch(
        `/api/planner-notes?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      );
      const [, notesRes] = await Promise.all([
        ensureMonths(monthKeys),
        notesPromise,
      ]);
      const plans = snapshotMealPlans();
      let notesByIso: Record<string, string> = {};
      if (notesRes.ok) {
        const raw = await notesRes.json();
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) notesByIso = raw as Record<string, string>;
      }
      setMealPlans(plans);
      setNotes(notesByDisplayIndex(notesByIso, displayIso));
      const neighbours = monthKeys.flatMap(key => adjacentMonthKeys(key));
      void ensureMonths(neighbours).then(all => setMealPlans(all)).catch(() => { /* optional prefetch */ });
    } catch { showToast('Failed to load planner', 'error'); }
    finally { setLoading(false); }
  }, [weekStartIso]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!picker && !showMagic) return;
    if (recipes.length) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/recipes?includePublic=1');
        if (!res.ok) throw new Error('Failed to load');
        const recs = await res.json();
        if (!cancelled) setRecipes(Array.isArray(recs) ? recs : []);
      } catch {
        showToast('Failed to load recipes', 'error');
      }
    })();
    return () => { cancelled = true; };
  }, [picker, showMagic, recipes.length]);

  useEffect(() => {
    if (!recipes.length) {
      setSuggestions({});
      return;
    }
    const next: Record<number, Recipe[]> = {};
    for (let d = 0; d < 7; d++) {
      const dayIso = formatDate(getDayDate(weekStart, d));
      const dayMeals = mealPlans.filter((m: MealPlan) =>
        mealOnDate(m, dayIso) && m.meal_type === 'dinner',
      );
      if (!dayMeals.length) {
        const otherProteins = mealPlans.filter((m: MealPlan) => !mealOnDate(m, dayIso)).map(m => m.recipe?.primary_protein);
        next[d] = suggestForDay(recipes, otherProteins, 3);
      }
    }
    setSuggestions(next);
  }, [recipes, mealPlans, weekStart]);

  // Keep the recipe picker inside the visual viewport so the mobile keyboard
  // shrinks the sheet instead of pushing it off-screen.
  useLayoutEffect(() => {
    if (!picker) return;
    const overlay = pickerOverlayRef.current;
    if (!overlay) return;

    const vv = window.visualViewport;
    const html = document.documentElement;
    const body = document.body;
    const baselineVisualHeight = vv?.height ?? window.innerHeight;
    const baselineInnerHeight = window.innerHeight;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      scrollY: window.scrollY,
    };

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${prev.scrollY}px`;
    body.style.width = '100%';

    const sync = () => {
      const visual = {
        offsetTop: vv?.offsetTop ?? 0,
        offsetLeft: vv?.offsetLeft ?? 0,
        width: vv?.width ?? window.innerWidth,
        height: vv?.height ?? window.innerHeight,
      };
      const box = computePickerSheetBox(
        visual,
        { innerWidth: window.innerWidth, innerHeight: window.innerHeight },
        baselineVisualHeight,
        baselineInnerHeight,
      );
      overlay.style.inset = 'auto';
      overlay.style.top = `${box.top}px`;
      overlay.style.left = `${box.left}px`;
      overlay.style.right = 'auto';
      overlay.style.bottom = 'auto';
      overlay.style.width = `${box.width}px`;
      overlay.style.height = `${box.height}px`;
      overlay.classList.toggle('is-keyboard', box.keyboardOpen);
      overlay.classList.toggle(
        'is-sheet',
        window.innerWidth <= 600 || box.keyboardOpen || window.matchMedia('(pointer: coarse)').matches,
      );
    };

    sync();
    vv?.addEventListener('resize', sync);
    vv?.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);

    if (!window.matchMedia('(pointer: coarse)').matches) {
      pickerSearchRef.current?.focus();
    }

    return () => {
      vv?.removeEventListener('resize', sync);
      vv?.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.width = prev.bodyWidth;
      window.scrollTo(0, prev.scrollY);
      overlay.style.inset = '';
      overlay.style.top = '';
      overlay.style.left = '';
      overlay.style.right = '';
      overlay.style.bottom = '';
      overlay.style.width = '';
      overlay.style.height = '';
      overlay.classList.remove('is-keyboard');
      overlay.classList.remove('is-sheet');
    };
  }, [picker]);

  useEffect(() => {
    if (!loading && todayRef.current && viewingThisWeek) {
      setTimeout(() => todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }
  }, [loading]);

  // ── Meal operations ─────────────────────────────────────────────────────────

  const getMealsForDay = (dayIndex: number) =>
    mealPlans.filter(m => mealOnDisplayDay(m, dayIndex));

  // ── Optimistic meal operations ─────────────────────────────────────────────
  // All three mutate local state immediately so the UI responds instantly,
  // then fire the DB write in the background. On failure they roll back and
  // show a toast.

  const addMeal = async (dayIndex: number, recipeId: string, targetWeekStart: Date = weekStart) => {
    const recipe = recipes.find(r => r.id === recipeId);
    const date = getDayDate(targetWeekStart, dayIndex);
    const coords = storageCoords(date);
    const sameWeek = formatDate(startOfDisplayWeek(date, weekStartsOn)) === formatDate(weekStart);
    const servings = recipe?.servings || 4;

    if (!sameWeek) {
      try {
        const res = await fetch('/api/planner', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planned_on: formatDate(date), week_start: coords.weekStart, recipe_id: recipeId, day_of_week: coords.dayOfWeek, meal_type: 'dinner', servings }),
        });
        if (!res.ok) throw new Error();
        broadcastPlannerChanged();
        const when = date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
        showToast(`Added to ${when}`, 'success');
      } catch {
        showToast('Failed to add meal', 'error');
      }
      return;
    }

    const tempId = `tmp-${Date.now()}`;
    const optimistic: MealPlan = {
      id: tempId, recipe_id: recipeId, day_of_week: coords.dayOfWeek,
      meal_type: 'dinner', servings, planned_on: formatDate(date), week_start: coords.weekStart, recipe: recipe as any,
    };
    setMealPlans(prev => [...prev, optimistic]);
    mealStoreRef.current.set(tempId, optimistic);
    try {
      const res = await fetch('/api/planner', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planned_on: formatDate(date), week_start: coords.weekStart, recipe_id: recipeId, day_of_week: coords.dayOfWeek, meal_type: 'dinner', servings }),
      });
      if (!res.ok) throw new Error();
      const real = { ...await res.json(), recipe } as MealPlan;
      mealStoreRef.current.delete(tempId);
      mealStoreRef.current.set(real.id, real);
      setMealPlans(prev => prev.map(m => m.id === tempId ? real : m));
      broadcastPlannerChanged();
    } catch {
      mealStoreRef.current.delete(tempId);
      setMealPlans(prev => prev.filter(m => m.id !== tempId));
      showToast('Failed to add meal', 'error');
    }
  };

  const removeMeal = async (id: string) => {
    const snapshot = mealPlans.find(m => m.id === id);
    // Optimistic: remove immediately
    setMealPlans(prev => prev.filter(m => m.id !== id));
    mealStoreRef.current.delete(id);
    try {
      const res = await fetch(`/api/planner?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      broadcastPlannerChanged();
    } catch {
      if (snapshot) {
        mealStoreRef.current.set(snapshot.id, snapshot);
        setMealPlans(prev => [...prev, snapshot]);
      }
      showToast('Failed to remove meal', 'error');
    }
  };

  const pickRecipeForDay = async (dayIndex: number, recipeId: string, targetWeekStart: Date = weekStart) => {
    const sameWeek = formatDate(targetWeekStart) === formatDate(weekStart);
    if (picker?.replacingId && sameWeek && dayIndex === picker.dayIndex) {
      await removeMeal(picker.replacingId);
    }
    await addMeal(dayIndex, recipeId, targetWeekStart);
    setPicker(null);
  };

  const pickRecipeForDate = async (iso: string, recipeId: string) => {
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return;
    await pickRecipeForDay(displayDayIndex(d, weekStartsOn), recipeId, startOfDisplayWeek(d, weekStartsOn));
  };

  const moveMealToDate = async (mealId: string, date: Date) => {
    const meal = mealPlans.find(m => m.id === mealId);
    if (!meal) return;
    const toCoords = storageCoords(date);
    if (mealOnDate(meal, formatDate(date))) return;

    const destWeek = startOfDisplayWeek(date, weekStartsOn);
    const sameDisplayWeek = formatDate(destWeek) === formatDate(weekStart);

    if (sameDisplayWeek) {
      setMealPlans(prev => prev.map(m => m.id === mealId ? { ...m, planned_on: formatDate(date), day_of_week: toCoords.dayOfWeek, week_start: toCoords.weekStart } : m));
    } else {
      setMealPlans(prev => prev.filter(m => m.id !== mealId));
    }

    try {
      await fetch(`/api/planner?id=${mealId}`, { method: 'DELETE' });
      const res = await fetch('/api/planner', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planned_on: formatDate(date), week_start: toCoords.weekStart, recipe_id: meal.recipe_id, day_of_week: toCoords.dayOfWeek, meal_type: 'dinner', servings: meal.servings }),
      });
      if (!res.ok) throw new Error();
      const real = { ...await res.json(), recipe: meal.recipe } as MealPlan;
      mealStoreRef.current.delete(mealId);
      mealStoreRef.current.set(real.id, real);
      broadcastPlannerChanged();
      if (sameDisplayWeek) {
        setMealPlans(prev => prev.map(m => m.id === mealId ? real : m));
      } else {
        setMealPlans(snapshotMealPlans());
        setWeekStart(destWeek);
        const when = date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
        showToast(`Moved to ${when}`, 'success');
      }
    } catch {
      setMealPlans(prev => {
        if (prev.some(m => m.id === mealId)) {
          return prev.map(m => m.id === mealId ? meal : m);
        }
        return [...prev, meal];
      });
      showToast('Failed to move meal', 'error');
    }
  };

  const moveMeal = async (mealId: string, fromDay: number, toDay: number) => {
    if (fromDay === toDay) return;
    await moveMealToDate(mealId, getDayDate(weekStart, toDay));
  };

  const confirmMoveSheet = async () => {
    if (!moveSheet) return;
    setMoveSheetSaving(true);
    try {
      await moveMealToDate(moveSheet.mealId, dayDateOf(moveSheet.weekStart, moveSheet.selectedDay));
      setMoveSheet(null);
    } finally {
      setMoveSheetSaving(false);
    }
  };

  useEffect(() => {
    if (!moveSheet) return;
    let cancelled = false;
    (async () => {
      try {
        const plans = await ensureMonths(monthsForDisplayWeek(moveSheet.weekStart));
        if (!cancelled) setMoveSheetPlan(weekPlanFromMeals(plans, moveSheet.weekStart, weekStartsOn));
      } catch {
        if (!cancelled) setMoveSheetPlan({});
      }
    })();
    return () => { cancelled = true; };
  }, [moveSheet, weekStartsOn]);

  const occupancyMeals = (() => {
    const map = new Map<string, MealPlan>();
    for (const meal of mealPlans) map.set(meal.id, meal);
    for (const meal of railMeals) if (!map.has(meal.id)) map.set(meal.id, meal);
    return [...map.values()];
  })();

  const weekHits = (): WeekHit[] =>
    dayEls.current.flatMap((el, index) => {
      if (!el) return [];
      const r = el.getBoundingClientRect();
      return [{
        index,
        iso: formatDate(getDayDate(weekStart, index)),
        left: r.left,
        right: r.right,
        top: r.top,
        bottom: r.bottom,
      }];
    });

  const railHits = (): RailHit[] => {
    const hits: RailHit[] = [];
    const earlier = railPickEls.current.earlier;
    if (earlier) {
      const r = earlier.getBoundingClientRect();
      hits.push({ pick: 'earlier', left: r.left, right: r.right, top: r.top, bottom: r.bottom });
    }
    for (const [index, iso] of railDays.entries()) {
      if (dragRef.current && isRailOrigin(iso, dragRef.current.originIso)) continue;
      const el = railEls.current[index];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      hits.push({ iso, left: r.left, right: r.right, top: r.top, bottom: r.bottom });
    }
    const later = railPickEls.current.later;
    if (later) {
      const r = later.getBoundingClientRect();
      hits.push({ pick: 'later', left: r.left, right: r.right, top: r.top, bottom: r.bottom });
    }
    return hits;
  };

  const openMoveDaySheet = (mealId: string, anchor: { weekStart: string; selectedDay: number }) => {
    const meal = mealPlans.find(m => m.id === mealId);
    setMoveSheetPlan({});
    setMoveSheet({
      mealId,
      recipeTitle: meal?.recipe?.title?.trim() || 'Dinner',
      weekStart: anchor.weekStart,
      selectedDay: anchor.selectedDay,
    });
  };

  const openRailDaySheet = (mealId: string, direction: 'earlier' | 'later', originIso: string) => {
    openMoveDaySheet(mealId, sheetAnchorForRailPick(direction, originIso, weekStartsOn));
  };

  const updateDrag = (next: typeof dragRef.current) => {
    dragRef.current = next;
    setDrag(next);
  };

  const clearHoldTimer = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  const hideRail = () => {
    railFetchGen.current += 1;
    setRailDays([]);
    setRailMeals([]);
    railEls.current = [];
  };

  const loadRailMeals = async (days: string[]) => {
    const gen = ++railFetchGen.current;
    try {
      const keys = [...new Set(days.map(monthKeyOf))];
      const meals = await ensureMonths(keys);
      if (gen !== railFetchGen.current) return;
      setRailMeals(meals);
    } catch { /* occupancy falls back to the week already on screen */ }
  };

  const reservedBottomForDrag = () => {
    const nav = document.querySelector('.sidebar');
    return bottomNavReserve(
      window.innerWidth,
      nav instanceof HTMLElement ? nav.getBoundingClientRect().height : 0,
    );
  };

  const armDrag = (session: NonNullable<typeof dragRef.current>) => {
    if (session.armed) return;
    const viewport = window.visualViewport?.height ?? window.innerHeight;
    const reserved = reservedBottomForDrag();
    setRailBottom(reserved);
    const days = surroundingRailDays(session.originIso, railDayCount(viewport, reserved));
    setRailDays(days);
    void loadRailMeals(days);
    const target = resolveDragTarget(session.x, session.y, weekHits(), railHits());
    updateDrag({ ...session, armed: true, target });
  };

  const onDragHandlePointerDown = (e: React.PointerEvent, mealId: string, fromDay: number) => {
    if (e.button !== 0) return;
    if (!shouldAllowDrag(mealId)) return;
    e.preventDefault();
    e.stopPropagation();
    clearHoldTimer();
    const handle = e.currentTarget as HTMLElement;
    holdEl.current = handle;
    try { handle.setPointerCapture(e.pointerId); } catch { /* capture is best-effort */ }
    const originIso = formatDate(getDayDate(weekStart, fromDay));
    updateDrag({
      mealId,
      originIso,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      armed: false,
      target: null,
    });
    holdTimer.current = setTimeout(() => {
      const session = dragRef.current;
      if (!session || session.mealId !== mealId || session.pointerId !== e.pointerId) return;
      armDrag(session);
    }, HOLD_MS);
  };

  const applyPointerMove = (e: PointerEvent) => {
    const session = dragRef.current;
    if (!session || e.pointerId !== session.pointerId) return;
    const dx = e.clientX - session.startX;
    const dy = e.clientY - session.startY;
    if (!session.armed) {
      if (shouldArmFromMovement(session.armed, dx, dy)) {
        clearHoldTimer();
        const next = { ...session, x: e.clientX, y: e.clientY };
        dragRef.current = next;
        armDrag(next);
      }
      return;
    }
    e.preventDefault();
    const target = resolveDragTarget(e.clientX, e.clientY, weekHits(), railHits());
    updateDrag({ ...session, x: e.clientX, y: e.clientY, target });
  };

  const finishHoldDrag = (e: PointerEvent, cancelled: boolean) => {
    const session = dragRef.current;
    if (!session || e.pointerId !== session.pointerId) return;
    clearHoldTimer();
    holdEl.current = null;
    hideRail();
    updateDrag(null);
    if (!session.armed) return;
    suppressCardClick.current = true;
    e.preventDefault();
    if (cancelled || !session.target) return;
    if (session.target.type === 'week-day') {
      void moveMealToDate(session.mealId, getDayDate(weekStart, session.target.index));
      return;
    }
    if (session.target.type === 'rail-pick') {
      openRailDaySheet(session.mealId, session.target.direction, session.originIso);
      return;
    }
    void moveMealToDate(session.mealId, parseLocalIso(session.target.iso));
  };

  const applyPointerMoveRef = useRef(applyPointerMove);
  const finishHoldDragRef = useRef(finishHoldDrag);
  applyPointerMoveRef.current = applyPointerMove;
  finishHoldDragRef.current = finishHoldDrag;

  // Keep the drag alive after the finger leaves the handle. The rail used to
  // vanish because the card lost the pointer and fired cancel.
  useEffect(() => {
    const onMove = (e: PointerEvent) => applyPointerMoveRef.current(e);
    const onUp = (e: PointerEvent) => finishHoldDragRef.current(e, false);
    const onCancel = (e: PointerEvent) => {
      const session = dragRef.current;
      if (!session || e.pointerId !== session.pointerId) return;
      if (!session.armed) {
        finishHoldDragRef.current(e, true);
        return;
      }
      applyPointerMoveRef.current(e);
    };
    const onTouchEnd = () => {
      const session = dragRef.current;
      if (!session?.armed) return;
      finishHoldDragRef.current({ pointerId: session.pointerId, preventDefault() {} } as PointerEvent, false);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  useEffect(() => {
    if (!drag?.armed) return;
    const html = document.documentElement;
    const prevTouch = html.style.touchAction;
    const prevUser = html.style.userSelect;
    html.style.touchAction = 'none';
    html.style.userSelect = 'none';
    return () => {
      html.style.touchAction = prevTouch;
      html.style.userSelect = prevUser;
    };
  }, [drag?.armed]);

  useEffect(() => {
    if (!drag?.armed) return;
    let raf = 0;
    const tick = () => {
      const session = dragRef.current;
      if (!session?.armed) return;
      const viewport = window.visualViewport?.height ?? window.innerHeight;
      const dy = edgeScrollDelta(session.y, viewport, reservedBottomForDrag());
      if (dy !== 0) {
        window.scrollBy(0, dy);
        const target = resolveDragTarget(session.x, session.y, weekHits(), railHits());
        if (!sameDragTarget(session.target, target)) {
          updateDrag({ ...session, target });
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [drag?.armed]);

  // ── Notes ───────────────────────────────────────────────────────────────────

  const handleNoteChange = (dayIndex: number, value: string) => {
    setNotes(prev => ({ ...prev, [dayIndex]: value }));
    if (noteTimers.current[dayIndex]) clearTimeout(noteTimers.current[dayIndex]);
    noteTimers.current[dayIndex] = setTimeout(async () => {
      try {
        const coords = storageCoords(getDayDate(weekStart, dayIndex));
        await fetch(`/api/planner-notes?weekStart=${coords.weekStart}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dayOfWeek: coords.dayOfWeek, note: value }),
        });
      } catch { /* silent */ }
    }, 800);
  };

  // ── Card action menu ────────────────────────────────────────────────────────

  const openCardMenu = (e: React.MouseEvent, mealId: string, dayIndex: number, recipeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const up = rect.bottom > window.innerHeight * 0.55;
    setCardMenu({
      mealId,
      recipeId,
      dayIndex,
      right: window.innerWidth - rect.right,
      y: up ? rect.top - 4 : rect.bottom + 4,
      up,
      view: 'root',
    });
  };

  const goToRecipe = (recipeId: string, mode: 'view' | 'edit', title?: string) => {
    if (!recipeId) return;
    window.location.href = mode === 'edit' ? recipeEditPath(recipeId, title) : recipeViewPath(recipeId, title);
  };

  useEffect(() => {
    if (!cardMenu) return;
    const close = (e?: Event) => {
      if (e && cardMenuRef.current?.contains(e.target as Node)) return;
      setCardMenu(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setCardMenu(null); };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [cardMenu]);

  // ── Magic ───────────────────────────────────────────────────────────────────

  const handleMagicSuggest = async () => {
    if (!recipes.length) { showToast('Add some recipes first!', 'error'); return; }
    setMagicLoading(true);
    try {
      const thisWeekMeals = mealPlans.filter(m => {
        for (let i = 0; i < 7; i++) if (mealOnDisplayDay(m, i)) return true;
        return false;
      });
      for (const m of thisWeekMeals) await fetch(`/api/planner?id=${m.id}`, { method: 'DELETE' });
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
          body: JSON.stringify({ planned_on: formatDate(getDayDate(weekStart, day)), week_start: storageCoords(getDayDate(weekStart, day)).weekStart, recipe_id: picks[day], day_of_week: storageCoords(getDayDate(weekStart, day)).dayOfWeek, meal_type: 'dinner', servings: magicSettings.servings }),
        });
      }
      for (const key of monthsForDisplayWeek(formatDate(weekStart))) {
        loadedMonthsRef.current.delete(key);
      }
      await fetchData();
      broadcastPlannerChanged();
      setShowMagic(false);
      showToast('Week planned! ✨', 'success');
    } catch { showToast('Magic plan failed', 'error'); }
    finally { setMagicLoading(false); }
  };

  // ── Derived ─────────────────────────────────────────────────────────────────

  const filteredRecipes = recipes.filter(r => {
    if (pickerOwnOnly && user && r.owner_id && r.owner_id !== user.id) return false;
    return !pickerSearch || r.title.toLowerCase().includes(pickerSearch.toLowerCase()) || r.tags?.some(t => t.toLowerCase().includes(pickerSearch.toLowerCase()));
  });

  const totalMeals = countPlannedDays(mealPlans, weekStartIso);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="pl-root">

      {/* Top bar */}
      <div className="pl-topbar">
        <div className="pl-topbar-left">
          <h1 className="pl-title">Meal Planner</h1>
          <div className="pl-week-nav">
            <button className="pl-nav-btn" aria-label="Previous week" onClick={() => {
              setWeekStart(d => { const n = new Date(d); n.setDate(d.getDate() - 7); return n; });
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span className="pl-week-label">{formatWeekLabel(formatDate(weekStart), new Date(), weekStartsOn)}</span>
            <button className="pl-nav-btn" aria-label="Next week" onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(d.getDate() + 7); return n; })}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </button>
            {!viewingThisWeek && (
              <button className="pl-today-btn" onClick={() => {
                setWeekStart(startOfDisplayWeek(new Date(), weekStartsOn));
                setSelectedDayIndex(displayDayIndex(new Date(), weekStartsOn));
              }}>Today</button>
            )}
          </div>
        </div>
        <div className="pl-topbar-right" style={{ position: 'relative' }}>
          <span className="pl-count">{totalMeals} of 7 planned</span>
          <button className="pl-icon-btn" title="Jump to a date" aria-label="Jump to a date" onClick={() => openNativeDatePicker(jumpDateRef.current)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
          </button>
          <HiddenDatePicker
            ariaLabel="Jump to a date"
            inputRef={jumpDateRef}
            className="pl-jump-date"
            onPick={iso => {
              const d = parseLocalIso(iso);
              setWeekStart(startOfDisplayWeek(d, weekStartsOn));
              setSelectedDayIndex(displayDayIndex(d, weekStartsOn));
            }}
          />
          <button className="pl-icon-btn" title="Auto-plan" aria-label="Auto-plan" onClick={() => setShowMagic(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
          </button>
          <button className="pl-icon-btn" title="Shopping list" aria-label="Shopping list" onClick={() => setShowGenerateList(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 6h15l-1.5 9h-12z"/>
              <circle cx="9" cy="20" r="1.4"/>
              <circle cx="18" cy="20" r="1.4"/>
              <path d="M6 6L5 3H2"/>
            </svg>
          </button>
          <button
            className="pl-icon-btn is-add"
            title="Add dinner"
            aria-label="Add dinner"
            onClick={() => { setPicker({ dayIndex: selectedDayIndex }); setPickerSearch(''); }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="pl-loading"><div className="loading-dots"><span/><span/><span/></div></div>
      ) : (
        <>
        <div className="pl-week-strip" role="tablist" aria-label="Days this week">
          {DAYS.map((dayName, dayIndex) => {
            const date = getDayDate(weekStart, dayIndex);
            const planned = getMealsForDay(dayIndex).length > 0;
            const isToday = viewingThisWeek && dayIndex === todayDisplayIdx;
            const isSelected = dayIndex === selectedDayIndex;
            const short = date.toLocaleDateString('en-AU', { weekday: 'short' });
            return (
              <button
                key={dayIndex}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={weekChipClass({ planned, today: isToday, selected: isSelected })}
                aria-label={`${dayName} ${date.getDate()}, ${planned ? 'planned' : 'nothing planned'}`}
                onClick={() => {
                  setSelectedDayIndex(dayIndex);
                  dayEls.current[dayIndex]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                <span className="pl-chip-wd">{short}</span>
                <span className="pl-chip-num">{date.getDate()}</span>
              </button>
            );
          })}
        </div>

        <div className={`pl-days${drag?.armed ? ' is-dragging' : ''}`}>
          {DAYS.map((dayName, dayIndex) => {
            const date = getDayDate(weekStart, dayIndex);
            const isToday = viewingThisWeek && dayIndex === todayDisplayIdx;
            const isPast = viewingThisWeek && dayIndex < todayDisplayIdx;
            const dayMeals = getMealsForDay(dayIndex);
            const daySuggestions = suggestions[dayIndex] ?? [];
            const short = date.toLocaleDateString('en-AU', { weekday: 'short' });
            const dayNum = date.getDate();

            return (
              <div
                key={dayIndex}
                ref={el => {
                  dayEls.current[dayIndex] = el;
                  if (isToday) todayRef.current = el;
                }}
                className={`pl-day ${isToday ? 'is-today' : ''} ${isPast ? 'is-past' : ''}${drag?.armed && drag.target?.type === 'week-day' && drag.target.index === dayIndex ? ' is-drop-target' : ''}`}
              >
                {dayMeals.length > 0 && (
                  <div className="pl-meal-stack">
                    {dayMeals.map((meal, mealIndex) => {
                      const recipe = meal.recipe;
                      const menuOpen = cardMenu?.mealId === meal.id;
                      const meta = recipeCardMeta({
                        cookTime: recipe?.cook_time,
                        prepTime: recipe?.prep_time,
                        servings: meal.servings || recipe?.servings,
                      });
                      const tags = [
                        recipe?.primary_protein,
                        ...(recipe?.tags ?? []),
                      ].filter((t, i, all): t is string => Boolean(t) && all.indexOf(t) === i).slice(0, 2);
                      return (
                        <div
                          key={meal.id}
                          className={`pl-recipe-card${drag?.armed && drag.mealId === meal.id ? ' is-dragging' : ''}`}
                          onClick={() => {
                            if (suppressCardClick.current) {
                              suppressCardClick.current = false;
                              return;
                            }
                            if (meal.recipe_id) goToRecipe(meal.recipe_id, 'view', meal.recipe?.title);
                          }}
                          title="View recipe"
                        >
                          <button
                            type="button"
                            draggable={false}
                            className={`pl-card-date${mealIndex > 0 ? ' is-repeat' : ''}${drag?.armed && drag.mealId === meal.id ? ' is-dragging' : ''}${shouldAllowDrag(meal.id) ? '' : ' is-disabled'}`}
                            title="Drag to move"
                            aria-label={`${short} ${dayNum}, drag to move`}
                            disabled={!shouldAllowDrag(meal.id)}
                            onClick={e => { e.preventDefault(); e.stopPropagation(); }}
                            onContextMenu={e => e.preventDefault()}
                            onDragStart={e => e.preventDefault()}
                            onPointerDown={e => onDragHandlePointerDown(e, meal.id, dayIndex)}
                          >
                            <span className="pl-card-wd">{short}</span>
                            <span className="pl-card-num">{dayNum}</span>
                          </button>
                          <div className="pl-recipe-img">
                            {recipe?.image_url ? (
                              <img src={recipe.image_url} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            ) : (
                              <span className="pl-recipe-img-fallback" aria-hidden>🍽</span>
                            )}
                          </div>
                          <div className="pl-recipe-info">
                            <span className="pl-recipe-name">{recipe?.title}</span>
                            {meta && <div className="pl-recipe-meta">{meta}</div>}
                            {tags.length > 0 && (
                              <div className="pl-recipe-tags">
                                {tags.map(t => (
                                  <span key={t} className="pl-recipe-tag">{t}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="pl-card-actions" onClick={e => e.stopPropagation()}>
                            <button
                              className={`pl-card-btn ${menuOpen ? 'is-open' : ''}`}
                              title="Meal options"
                              aria-label="Meal options"
                              aria-haspopup="menu"
                              aria-expanded={menuOpen}
                              onClick={e => openCardMenu(e, meal.id, dayIndex, meal.recipe_id)}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                <circle cx="6" cy="12" r="1.7"/>
                                <circle cx="12" cy="12" r="1.7"/>
                                <circle cx="18" cy="12" r="1.7"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <button
                      className="pl-add-another"
                      onClick={() => { setPicker({ dayIndex }); setPickerSearch(''); }}
                    >
                      Add another
                    </button>
                  </div>
                )}

                {!dayMeals.length && (
                  <div className="pl-empty-slot">
                    <button
                      className="pl-empty-card"
                      onClick={() => { setPicker({ dayIndex }); setPickerSearch(''); }}
                    >
                      <span className="pl-card-date">
                        <span className="pl-card-wd">{short}</span>
                        <span className="pl-card-num">{dayNum}</span>
                      </span>
                      <span className="pl-add-dinner-pill">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                        Add dinner
                      </span>
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
        </>
      )}

      {drag?.armed && railDays.length > 0 && (
        <div
          className="pl-rail"
          aria-live="polite"
          aria-label="Nearby days"
          style={railBottom > 0 ? { bottom: railBottom } : undefined}
        >
          <div
            ref={el => { railPickEls.current.earlier = el; }}
            className={`pl-rail-day pl-rail-pick${drag.target?.type === 'rail-pick' && drag.target.direction === 'earlier' ? ' is-hot' : ''}`}
          >
            <div className="pl-rail-circle" aria-hidden>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 14 12 8 18 14"/>
              </svg>
            </div>
            <div className="pl-rail-wd">Earlier</div>
          </div>
          {railDays.map((iso, index) => {
            const date = parseLocalIso(iso);
            const origin = isRailOrigin(iso, drag.originIso);
            const occupied = !origin && dayOccupied(occupancyMeals, iso);
            const titles = titlesOnDay(occupancyMeals, iso);
            const hot = !origin && drag.target?.type === 'rail-day' && drag.target.iso === iso;
            return (
              <div
                key={iso}
                ref={el => { railEls.current[index] = el; }}
                className={`pl-rail-day${occupied ? ' is-occupied' : ''}${hot ? ' is-hot' : ''}${origin ? ' is-origin' : ''}`}
              >
                <div className="pl-rail-circle">{date.getDate()}</div>
                <div className="pl-rail-wd">
                  {date.toLocaleDateString('en-AU', { weekday: 'short' })}
                </div>
                {titles.length > 0 && (
                  <div className="pl-rail-preview">{titles.join(' · ')}</div>
                )}
              </div>
            );
          })}
          <div
            ref={el => { railPickEls.current.later = el; }}
            className={`pl-rail-day pl-rail-pick${drag.target?.type === 'rail-pick' && drag.target.direction === 'later' ? ' is-hot' : ''}`}
          >
            <div className="pl-rail-circle" aria-hidden>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 10 12 16 18 10"/>
              </svg>
            </div>
            <div className="pl-rail-wd">Later</div>
          </div>
        </div>
      )}
      {moveSheet && (
        <PlannerDaySheet
          title="Move on planner"
          recipeTitle={moveSheet.recipeTitle}
          confirmVerb="Move dinner"
          weekStart={moveSheet.weekStart}
          selectedDay={moveSheet.selectedDay}
          weekPlan={moveSheetPlan}
          confirming={moveSheetSaving}
          onClose={() => setMoveSheet(null)}
          onShiftWeek={weeks => setMoveSheet(current => current
            ? { ...current, weekStart: shiftWeek(current.weekStart, weeks) }
            : current)}
          onSelectDay={day => setMoveSheet(current => current ? { ...current, selectedDay: day } : current)}
          onConfirm={() => { void confirmMoveSheet(); }}
          weekStartsOn={weekStartsOn}
        />
      )}
      {drag?.armed && (
        <div className="pl-drag-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden>
          {mealPlans.find(m => m.id === drag.mealId)?.recipe?.title ?? 'Moving…'}
        </div>
      )}

      {/* Recipe picker modal */}
      {picker && (
        <>
          <div className="pl-picker-dimmer" onClick={() => setPicker(null)} />
          <div
            ref={pickerOverlayRef}
            className="pl-picker-overlay"
            onClick={() => setPicker(null)}
          >
            <div className="pl-picker" onClick={e => e.stopPropagation()}>
              <div className="pl-picker-header">
                <div>
                  <h2 className="pl-picker-title">{picker.replacingId ? 'Replace recipe' : 'Add dinner'}</h2>
                  <p className="pl-picker-day">{DAYS[picker.dayIndex]}</p>
                  <label className="pl-picker-filter">
                    <input type="checkbox" checked={pickerOwnOnly} onChange={e => setPickerOwnOnly(e.target.checked)} />
                    Only my recipes
                  </label>
                </div>
                <button className="modal-close" onClick={() => setPicker(null)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <div className="pl-picker-list">
                {filteredRecipes.length === 0 ? (
                  <div className="pl-picker-empty">
                    {!recipes.length ? <><span>No recipes yet.</span> <a href="/recipes">Add some →</a></> : <span>No matches</span>}
                  </div>
                ) : filteredRecipes.map(r => (
                  <PickerRecipeRow
                    key={r.id}
                    title={r.title}
                    currentDayIndex={picker.dayIndex}
                    days={DAYS.map((name, i) => ({
                      index: i,
                      name,
                      dateLabel: getDayDate(weekStart, i).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }),
                    }))}
                    protein={r.primary_protein ? <ProteinBadge protein={r.primary_protein} /> : null}
                    meta={[(r as any).cook_time && `${(r as any).cook_time}m`, ...(r.tags?.slice(0, 2) || [])].filter(Boolean).join(' · ')}
                    thumb={(r as any).image_url
                      ? <img src={(r as any).image_url} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      : <span>🍽</span>}
                    onSelect={() => pickRecipeForDay(picker.dayIndex, r.id)}
                    onAddToDay={dayIndex => pickRecipeForDay(dayIndex, r.id)}
                    onAddToDate={isoDate => pickRecipeForDate(isoDate, r.id)}
                  />
                ))}
              </div>
              <div className="pl-picker-search-wrap">
                <PickerSearchField
                  inputRef={pickerSearchRef}
                  value={pickerSearch}
                  onChange={setPickerSearch}
                  onFocus={() => {
                    window.scrollTo(0, 0);
                    requestAnimationFrame(() => window.scrollTo(0, 0));
                  }}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Meal card action menu */}
      {cardMenu && (
        <>
          <div className="pl-menu-backdrop" onClick={() => setCardMenu(null)} />
          <PlannerCardMenu
            menuRef={cardMenuRef}
            view={cardMenu.view}
            right={cardMenu.right}
            y={cardMenu.y}
            up={cardMenu.up}
            currentDayIndex={cardMenu.dayIndex}
            canOpenRecipe={Boolean(cardMenu.recipeId)}
            days={DAYS.map((name, i) => ({
              index: i,
              name,
              dateLabel: getDayDate(weekStart, i).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }),
            }))}
            onViewRecipe={() => {
              const { recipeId, mealId } = cardMenu;
              setCardMenu(null);
              const meal = mealPlans.find(m => m.id === mealId);
              goToRecipe(recipeId, 'view', meal?.recipe?.title);
            }}
            onEditRecipe={() => {
              const { recipeId, mealId } = cardMenu;
              setCardMenu(null);
              const meal = mealPlans.find(m => m.id === mealId);
              goToRecipe(recipeId, meal?.recipe?.can_edit ? 'edit' : 'view', meal?.recipe?.title);
            }}
            onReplace={() => {
              const { mealId, dayIndex } = cardMenu;
              setCardMenu(null);
              setPicker({ dayIndex, replacingId: mealId });
              setPickerSearch('');
            }}
            onOpenMove={() => setCardMenu(m => m ? { ...m, view: 'move' } : m)}
            onBack={() => setCardMenu(m => m ? { ...m, view: 'root' } : m)}
            onMoveTo={i => {
              const { mealId, dayIndex } = cardMenu;
              setCardMenu(null);
              moveMeal(mealId, dayIndex, i);
            }}
            onAnotherDate={() => {
              const { mealId, dayIndex } = cardMenu;
              setCardMenu(null);
              const originIso = formatDate(getDayDate(weekStart, dayIndex));
              openMoveDaySheet(mealId, sheetAnchorForDate(originIso, weekStartsOn));
            }}
            onDelete={() => {
              const { mealId } = cardMenu;
              setCardMenu(null);
              removeMeal(mealId);
            }}
          />
        </>
      )}

      {/* Magic modal */}
      {showGenerateList && (
        <GenerateListModal
          onClose={() => setShowGenerateList(false)}
          onCreated={(id) => { setShowGenerateList(false); window.location.href = '/shopping-list'; }}
          defaultWeekStart={formatDate(weekStart)}
          weekStartsOn={weekStartsOn}
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
        .pl-topbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
        .pl-title { font-family: var(--font-body); font-size: 1.7rem; font-weight: 700; line-height: 1.1; color: var(--ink); margin-bottom: 0.35rem; letter-spacing: -0.02em; }
        .pl-week-nav { display: flex; align-items: center; gap: 0.3rem; flex-wrap: wrap; }
        .pl-nav-btn { background: none; border: none; border-radius: 8px; padding: 0.3rem; cursor: pointer; color: var(--ink-muted); display: flex; align-items: center; transition: all 0.15s; }
        .pl-nav-btn:hover { background: var(--parchment); color: var(--ink); }
        .pl-week-label { font-size: 0.95rem; color: var(--ink-muted); padding: 0 0.2rem; font-weight: 500; }
        .pl-today-btn { background: none; border: none; font-size: 0.78rem; color: var(--sage); cursor: pointer; padding: 0.35rem 0.5rem; border-radius: 4px; font-family: var(--font-body); transition: all 0.15s; }
        .pl-today-btn:hover { background: var(--sage-light); }
        .pl-topbar-right { display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap; }
        .pl-count { font-size: 0.75rem; color: var(--ink-muted); margin-right: 0.35rem; }
        .pl-icon-btn { width: 38px; height: 38px; border: none; background: none; border-radius: 10px; color: var(--ink-soft); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.15s, color 0.15s; }
        .pl-icon-btn:hover { background: var(--parchment); color: var(--ink); }
        .pl-icon-btn.is-add { background: var(--sage-light); color: var(--sage); }
        .pl-icon-btn.is-add:hover { background: var(--sage); color: white; }
        .pl-jump-date { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }

        /* Week strip */
        .pl-week-strip { display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.35rem; margin-bottom: 1.25rem; }
        .pl-chip {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 2px; padding: 0.45rem 0.15rem 0.5rem; border: none; background: transparent;
          border-radius: 16px; cursor: pointer; font-family: var(--font-body); min-width: 0;
          transition: background 0.15s, color 0.15s, box-shadow 0.15s;
        }
        .pl-chip-wd { font-size: 0.68rem; font-weight: 500; color: var(--ink-muted); letter-spacing: 0.01em; }
        .pl-chip-num { font-size: 0.95rem; font-weight: 700; color: var(--ink); line-height: 1.2; }
        .pl-chip.is-planned .pl-chip-num {
          width: 28px; height: 28px; border-radius: 50%;
          display: inline-flex; align-items: center; justify-content: center;
          background: var(--sage-light); color: var(--sage);
        }
        .pl-chip.is-empty .pl-chip-num { color: var(--ink-muted); font-weight: 500; }
        .pl-chip.is-today:not(.is-selected) { box-shadow: inset 0 0 0 1.5px var(--rust); }
        .pl-chip.is-selected { background: var(--sage); }
        .pl-chip.is-selected .pl-chip-wd,
        .pl-chip.is-selected .pl-chip-num { color: white; }
        .pl-chip.is-selected.is-planned .pl-chip-num { background: rgba(255,255,255,0.18); color: white; }
        .pl-chip:hover:not(.is-selected) { background: var(--parchment); }

        /* Day list */
        .pl-days { display: flex; flex-direction: column; gap: 0.15rem; }
        .pl-day { padding-block: 0.15rem; }
        .pl-day.is-past { opacity: 0.55; }
        .pl-day.is-drop-target {
          outline: 2px solid var(--sage);
          outline-offset: 2px;
          background: var(--sage-light);
          border-radius: 16px;
        }
        .pl-days.is-dragging { user-select: none; cursor: grabbing; }

        /* Recipe stack */
        .pl-meal-stack { display: flex; flex-direction: column; gap: 0.15rem; }

        /* Recipe card */
        .pl-recipe-card {
          display: flex; align-items: center; gap: 0.75rem;
          background: white; border: none; border-radius: 16px;
          padding: 0.7rem 0.65rem; cursor: pointer;
          transition: background 0.15s, box-shadow 0.15s;
        }
        .pl-recipe-card:hover { background: #fff; box-shadow: 0 2px 14px rgba(26,22,18,0.06); }
        .pl-recipe-card.is-dragging { opacity: 0.4; touch-action: none; }
        .pl-rail {
          position: fixed; top: 0; right: 0; bottom: var(--bottom-nav-height, 0px); z-index: 36;
          width: 92px;
          display: flex; flex-direction: column;
          padding: 8px 6px 8px;
          background: rgba(247, 242, 233, 0.97);
          border-left: 1px solid var(--border);
          box-shadow: -10px 0 28px rgba(60, 42, 30, 0.1);
          pointer-events: none;
        }
        .pl-rail-day {
          flex: 1 1 0;
          min-height: 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 2px;
          border-radius: 10px;
          padding: 2px 0;
        }
        .pl-rail-pick { flex: 0 0 auto; flex-shrink: 0; padding: 8px 0 6px; }
        .pl-rail-day.is-hot { background: rgba(181, 69, 27, 0.1); }
        .pl-rail-day.is-origin { opacity: 0.38; }
        .pl-rail-day.is-origin .pl-rail-circle {
          border-style: dashed;
          border-color: var(--border);
          background: transparent;
          color: var(--ink-muted);
          box-shadow: none;
        }
        .pl-rail-day.is-origin .pl-rail-wd,
        .pl-rail-day.is-origin .pl-rail-preview { color: var(--ink-muted); font-weight: 400; }
        .pl-rail-preview {
          font-size: 0.58rem; line-height: 1.2; text-align: center;
          color: var(--ink-soft); max-width: 100%;
          overflow: hidden; display: -webkit-box;
          -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        }
        .pl-rail-circle {
          flex: 0 0 32px;
          width: 32px; height: 32px;
          min-width: 32px; min-height: 32px;
          max-width: 32px; max-height: 32px;
          aspect-ratio: 1;
          box-sizing: border-box;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.76rem; font-weight: 700;
          border: 2px dashed var(--border);
          background: transparent; color: var(--ink-muted);
        }
        .pl-rail-day.is-occupied .pl-rail-circle {
          border-style: solid; border-color: var(--rust);
          background: var(--rust); color: #fff;
        }
        .pl-rail-pick .pl-rail-circle {
          border-style: dotted;
          background: white;
          color: var(--ink);
        }
        .pl-rail-day.is-hot .pl-rail-circle { transform: scale(1.08); }
        .pl-rail-wd { font-size: 0.58rem; color: var(--ink-muted); letter-spacing: 0.02em; }
        .pl-drag-ghost {
          position: fixed; z-index: 50;
          pointer-events: none;
          max-width: min(280px, 70vw);
          padding: 8px 12px;
          background: white;
          border: 1px solid var(--rust);
          border-radius: 8px;
          box-shadow: 0 8px 24px rgba(60, 42, 30, 0.18);
          font-size: 0.85rem; font-weight: 600; color: var(--ink);
          transform: translate(-8px, -8px);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .pl-card-date {
          flex-shrink: 0; width: 42px; display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 1px; background: none; border: none; padding: 0;
          cursor: grab; color: inherit; font-family: var(--font-body);
          touch-action: none; user-select: none; -webkit-user-select: none;
        }
        .pl-card-date.is-repeat { visibility: hidden; }
        .pl-card-date.is-dragging { cursor: grabbing; }
        .pl-card-date.is-disabled { cursor: default; opacity: 0.55; }
        .pl-card-wd { font-size: 0.68rem; font-weight: 600; color: var(--ink-muted); }
        .pl-card-num { font-size: 0.95rem; font-weight: 700; color: var(--ink); line-height: 1.15; }
        .pl-recipe-img {
          width: 64px; height: 64px; flex-shrink: 0; border-radius: 12px;
          overflow: hidden; background: var(--parchment);
          display: flex; align-items: center; justify-content: center;
        }
        .pl-recipe-img img { width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none; }
        .pl-recipe-img-fallback { font-size: 1.4rem; line-height: 1; }
        .pl-recipe-info { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 3px; }
        .pl-recipe-name { font-size: 0.95rem; color: var(--ink); font-weight: 700; line-height: 1.25; white-space: normal; overflow-wrap: anywhere; }
        .pl-recipe-meta { font-size: 0.75rem; color: var(--ink-muted); }
        .pl-recipe-tags { display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap; margin-top: 2px; }
        .pl-recipe-tag {
          background: var(--sage-light); border: none; border-radius: 99px;
          padding: 2px 8px; font-size: 0.68rem; font-weight: 600; color: var(--sage);
          text-transform: capitalize;
        }
        .pl-card-actions { display: flex; align-items: center; flex-shrink: 0; }
        .pl-card-btn {
          background: none; border: none; border-radius: 50%; width: 36px; height: 36px; min-width: 36px;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
          color: var(--ink-muted); transition: background 0.15s, color 0.15s; padding: 0;
        }
        .pl-card-btn:hover, .pl-card-btn.is-open { background: var(--parchment); color: var(--ink); }
        .pl-add-another {
          align-self: flex-start; margin: 0 0 0.25rem 114px; padding: 0.15rem 0;
          background: none; border: none; font-size: 0.75rem; color: var(--sage);
          font-family: var(--font-body); cursor: pointer; font-weight: 600;
        }
        .pl-add-another:hover { text-decoration: underline; }

        /* Empty slot */
        .pl-empty-slot { margin-bottom: 0.15rem; }
        .pl-empty-card {
          display: flex; align-items: center; gap: 0.75rem; width: 100%;
          background: none; border: none; padding: 0.55rem 0.65rem; border-radius: 16px;
          cursor: pointer; font-family: var(--font-body); text-align: left;
        }
        .pl-empty-card:hover { background: rgba(255,255,255,0.55); }
        .pl-empty-card .pl-card-date { cursor: pointer; }
        .pl-add-dinner-pill {
          display: flex; align-items: center; justify-content: center; gap: 0.45rem;
          flex: 1; padding: 0.85rem 1rem;
          background: none; border: 1.5px dashed var(--border);
          border-radius: 14px; font-size: 0.82rem; color: var(--ink-muted);
          font-family: var(--font-body);
        }
        .pl-empty-card:hover .pl-add-dinner-pill { border-color: var(--sage); color: var(--sage); }
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

        /* Card action menu */
        .pl-menu-backdrop { position: fixed; inset: 0; z-index: 60; }
        .pl-card-menu {
          position: fixed; z-index: 61; min-width: 188px; max-width: 86vw; max-height: 56vh;
          overflow-y: auto; background: white; border: 1px solid var(--border);
          border-radius: 10px; box-shadow: 0 8px 28px rgba(60,42,30,0.18);
          padding: 4px; animation: plMenuIn 0.12s ease-out;
        }
        .pl-card-menu.is-up { transform: translateY(-100%); animation: none; }
        @keyframes plMenuIn { from { opacity: 0; transform: translateY(-2px); } to { opacity: 1; } }
        .pl-card-menu-item {
          display: flex; align-items: center; gap: 0.55rem; width: 100%;
          padding: 0.55rem 0.7rem; background: none; border: none; border-radius: 7px;
          font-family: var(--font-body); font-size: 0.85rem; color: var(--ink);
          cursor: pointer; text-align: left; transition: background 0.1s;
          -webkit-tap-highlight-color: transparent; touch-action: manipulation;
        }
        .pl-card-menu-item:hover { background: var(--parchment); }
        .pl-card-menu-item:disabled, .pl-card-menu-item.is-current { color: var(--ink-muted); cursor: default; }
        .pl-card-menu-item.is-danger { color: var(--rust); }
        .pl-card-menu-item.is-danger:hover { background: rgba(181,69,27,0.08); }
        .pl-card-menu-item svg { flex-shrink: 0; color: currentColor; }
        .pl-card-menu-chevron { margin-left: auto; color: var(--ink-muted); }
        .pl-card-menu-back { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-muted); }
        .pl-card-menu-sep { height: 1px; background: var(--border); margin: 4px 6px; }
        .pl-card-menu-day { flex: 1; min-width: 0; display: flex; align-items: baseline; justify-content: space-between; gap: 0.75rem; }
        .pl-card-menu-date { font-size: 0.72rem; color: var(--ink-muted); }
        .pl-card-menu-check { color: var(--sage, #5a7a52); font-weight: 700; flex-shrink: 0; }

        /* Picker — dimmer is the backdrop; the sheet itself fills the visible area */
        .pl-picker-dimmer { position: fixed; inset: 0; z-index: 1000; background: rgba(26,22,18,0.55); backdrop-filter: blur(4px); }
        .pl-picker-overlay { position: fixed; inset: 0; z-index: 1001; display: flex; align-items: center; justify-content: center; overflow: hidden; overscroll-behavior: none; padding: 1rem; box-sizing: border-box; }
        .pl-picker-overlay.is-sheet { padding: 0; align-items: stretch; background: white; }
        .pl-picker-overlay.is-sheet .pl-picker { height: 100%; width: 100%; max-width: 100%; border-radius: 16px 16px 0 0; }
        .pl-picker { background: white; border-radius: 12px; width: 440px; max-width: 100%; height: min(640px, 100%); max-height: 100%; min-height: 0; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 8px 40px rgba(26,22,18,0.15); }
        .pl-picker-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 1.25rem 1.25rem 0.75rem; border-bottom: 1px solid var(--parchment); flex-shrink: 0; }
        .pl-picker-title { font-family: var(--font-display); font-size: 1.2rem; font-weight: 300; color: var(--ink); }
        .pl-picker-day { font-size: 0.8rem; color: var(--ink-muted); margin-top: 2px; }
        .pl-picker-list { overflow-y: auto; flex: 1; min-height: 0; padding: 0.5rem; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }
        .pl-picker-empty { display: flex; align-items: center; justify-content: center; gap: 0.35rem; min-height: 100%; padding: 2rem; text-align: center; font-size: 0.85rem; color: var(--ink-muted); }
        .pl-picker-empty a { color: var(--rust); }
        .pl-picker-search-wrap { padding: 0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom, 0)); border-top: 1px solid var(--parchment); flex-shrink: 0; background: white; }
        .pl-picker-overlay.is-keyboard .pl-picker-search-wrap { padding-bottom: 0.75rem; }
        .pl-picker-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.65rem 0.75rem; border-radius: 8px; border: none; background: none; cursor: pointer; width: 100%; text-align: left; transition: background 0.12s; font-family: var(--font-body); min-width: 0; }
        .pl-picker-row:hover { background: var(--parchment); }
        .pl-picker-row-wrap { display: flex; align-items: stretch; gap: 2px; position: relative; }
        .pl-picker-date-hidden {
          position: absolute; right: 0; top: 0; bottom: 0; width: 40px;
          opacity: 0.01; border: 0; padding: 0; margin: 0; z-index: 0;
        }
        .pl-picker-row-meta { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; margin-top: 3px; }
        .pl-picker-row-menu-btn {
          position: relative; z-index: 1;
          background: none; border: none; border-radius: 8px; width: 40px; min-width: 40px;
          display: flex; align-items: center; justify-content: center;
          color: var(--ink-muted); cursor: pointer; flex-shrink: 0;
          -webkit-tap-highlight-color: transparent;
        }
        .pl-picker-row-menu-btn:hover { background: var(--parchment); color: var(--ink); }
        .pl-picker-day-menu-backdrop { position: fixed; inset: 0; z-index: 1101; }
        .pl-picker-day-menu { z-index: 1102; }
        .pl-picker-thumb { width: 44px; height: 44px; border-radius: 6px; overflow: hidden; background: var(--parchment); flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 20px; }
        .pl-picker-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .pl-picker-info { flex: 1; min-width: 0; }
        .pl-picker-name { display: block; font-size: 0.9rem; color: var(--ink); white-space: normal; overflow-wrap: anywhere; }
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
          .pl-title { font-size: 1.45rem; }
          .pl-topbar { gap: 0.6rem; margin-bottom: 0.9rem; }
          .pl-week-strip { gap: 0.2rem; margin-bottom: 0.85rem; }
          .pl-chip { padding: 0.35rem 0.05rem 0.4rem; border-radius: 14px; }
          .pl-chip-num { font-size: 0.88rem; }
          .pl-chip.is-planned .pl-chip-num { width: 26px; height: 26px; }
          .pl-recipe-img { width: 56px; height: 56px; border-radius: 10px; }
          .pl-recipe-name { font-size: 0.88rem; }
          .pl-add-another { margin-left: 98px; }
          .pl-picker { height: 100%; max-height: 100%; border-radius: 16px 16px 0 0; width: 100%; max-width: 100%; }
          .pl-picker-search { font-size: 16px; }
          .modal-overlay { align-items: flex-end; }
          .pl-picker-overlay { padding: 0; align-items: stretch; background: white; }
          .pl-card-menu { min-width: 210px; }
          .pl-card-menu-item { padding: 0.7rem 0.75rem; font-size: 0.92rem; }
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
