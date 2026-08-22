'use client';

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import type { Recipe, MealPlan } from '@/lib/db';
import { showToast } from '@/components/Toast';
import GenerateListModal from '@/components/GenerateListModal';
import PickerSearchField from '@/components/PickerSearchField';
import PickerRecipeRow from '@/components/PickerRecipeRow';
import { computePickerSheetBox } from '@/lib/pickerViewport';
import {
  displayDayIndex,
  displayDays,
  formatWeekLabel,
  isoDate,
  localDateIso,
  parseLocalIso,
  parseWeekStartDay,
  startOfDisplayWeek,
  storageCoords,
  storageWeeksForDisplayWeek,
  type DayKey,
} from '@/lib/plannerDays';
import {
  HOLD_MS,
  addCalendarDays,
  dayOccupied,
  movementExceededThreshold,
  resolveDragTarget,
  shouldAllowDrag,
  storageWeeksForIsos,
  surroundingTenDays,
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
  const [weekStartsOn, setWeekStartsOn] = useState<DayKey>('monday');
  const [weekStart, setWeekStart] = useState<Date>(() => startOfDisplayWeek(new Date(), 'monday'));
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
  const pickerOverlayRef = useRef<HTMLDivElement>(null);
  const pickerSearchRef = useRef<HTMLInputElement>(null);

  // Magic
  const [showMagic, setShowMagic] = useState(false);
  const [magicSettings, setMagicSettings] = useState<MagicSettings>({ variety: 'medium', servings: 4, preferTags: '', excludeTags: '' });
  const [magicLoading, setMagicLoading] = useState(false);

  const [suggestions, setSuggestions] = useState<Record<number, Recipe[]>>({});

  // Card action menu (delete / replace / move to)
  const [cardMenu, setCardMenu] = useState<{
    mealId: string;
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
  const [railMeals, setRailMeals] = useState<MealPlan[]>([]);
  const railPickEls = useRef<{ earlier: HTMLDivElement | null; later: HTMLDivElement | null }>({
    earlier: null,
    later: null,
  });
  const railDateInputRef = useRef<HTMLInputElement>(null);
  const pendingRailPick = useRef<{ mealId: string; direction: 'earlier' | 'later' } | null>(null);

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
        setWeekStartsOn(day);
        setWeekStart(startOfDisplayWeek(new Date(), day));
      } catch { /* keep Monday default */ }
    })();
  }, []);

  const mealOnDisplayDay = (m: MealPlan, displayIndex: number) => {
    const date = getDayDate(weekStart, displayIndex);
    const coords = storageCoords(date);
    return isoDate(m.week_start) === coords.weekStart && m.day_of_week === coords.dayOfWeek && m.meal_type === 'dinner';
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const displayIso = formatDate(weekStart);
      const storageWeeks = storageWeeksForDisplayWeek(displayIso, weekStartsOn);
      const [recipesRes, ...weekPairs] = await Promise.all([
        fetch('/api/recipes'),
        ...storageWeeks.flatMap(wk => [
          fetch(`/api/planner?weekStart=${wk}`),
          fetch(`/api/planner-notes?weekStart=${wk}`),
        ]),
      ]);
      const recs = await recipesRes.json();
      const plans: MealPlan[] = [];
      const nts: Record<number, string> = {};
      for (let i = 0; i < storageWeeks.length; i++) {
        const plansRes = weekPairs[i * 2];
        const notesRes = weekPairs[i * 2 + 1];
        const wkPlans = await plansRes.json();
        const wkNotes = await notesRes.json();
        if (Array.isArray(wkPlans)) plans.push(...wkPlans);
        if (wkNotes && typeof wkNotes === 'object') {
          for (const [day, note] of Object.entries(wkNotes as Record<string, string>)) {
            const cal = getDayDate(new Date(`${storageWeeks[i]}T00:00:00`), Number(day));
            if (formatDate(startOfDisplayWeek(cal, weekStartsOn)) !== displayIso) continue;
            nts[displayDayIndex(cal, weekStartsOn)] = note;
          }
        }
      }
      setMealPlans(plans);
      setRecipes(recs);
      setNotes(nts);
      const newSuggestions: Record<number, Recipe[]> = {};
      for (let d = 0; d < 7; d++) {
        const date = getDayDate(weekStart, d);
        const coords = storageCoords(date);
        const dayMeals = plans.filter((m: MealPlan) =>
          isoDate(m.week_start) === coords.weekStart && m.day_of_week === coords.dayOfWeek && m.meal_type === 'dinner'
        );
        if (!dayMeals.length) {
          const otherProteins = plans.filter((m: MealPlan) => !(
            isoDate(m.week_start) === coords.weekStart && m.day_of_week === coords.dayOfWeek
          )).map(m => m.recipe?.primary_protein);
          newSuggestions[d] = suggestForDay(recs, otherProteins, 3);
        }
      }
      setSuggestions(newSuggestions);
    } catch { showToast('Failed to load planner', 'error'); }
    finally { setLoading(false); }
  }, [weekStart, weekStartsOn]);

  useEffect(() => { fetchData(); }, [fetchData]);

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
          body: JSON.stringify({ week_start: coords.weekStart, recipe_id: recipeId, day_of_week: coords.dayOfWeek, meal_type: 'dinner', servings }),
        });
        if (!res.ok) throw new Error();
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
      meal_type: 'dinner', servings, week_start: coords.weekStart, recipe: recipe as any,
    };
    setMealPlans(prev => [...prev, optimistic]);
    try {
      const res = await fetch('/api/planner', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_start: coords.weekStart, recipe_id: recipeId, day_of_week: coords.dayOfWeek, meal_type: 'dinner', servings }),
      });
      if (!res.ok) throw new Error();
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
    if (isoDate(meal.week_start) === toCoords.weekStart && meal.day_of_week === toCoords.dayOfWeek) return;

    const destWeek = startOfDisplayWeek(date, weekStartsOn);
    const sameDisplayWeek = formatDate(destWeek) === formatDate(weekStart);

    if (sameDisplayWeek) {
      setMealPlans(prev => prev.map(m => m.id === mealId ? { ...m, day_of_week: toCoords.dayOfWeek, week_start: toCoords.weekStart } : m));
    } else {
      setMealPlans(prev => prev.filter(m => m.id !== mealId));
    }

    try {
      await fetch(`/api/planner?id=${mealId}`, { method: 'DELETE' });
      const res = await fetch('/api/planner', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_start: toCoords.weekStart, recipe_id: meal.recipe_id, day_of_week: toCoords.dayOfWeek, meal_type: 'dinner', servings: meal.servings }),
      });
      if (!res.ok) throw new Error();
      const real = await res.json();
      if (sameDisplayWeek) {
        setMealPlans(prev => prev.map(m => m.id === mealId ? { ...real, recipe: meal.recipe } : m));
      } else {
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

  const openRailDatePicker = (mealId: string, direction: 'earlier' | 'later', days: string[]) => {
    pendingRailPick.current = { mealId, direction };
    const input = railDateInputRef.current;
    if (!input) return;
    if (direction === 'earlier') {
      const max = days[0] ? addCalendarDays(days[0], -1) : localDateIso(new Date());
      input.removeAttribute('min');
      input.max = max;
      input.value = max;
    } else {
      const min = days.length ? addCalendarDays(days[days.length - 1], 1) : localDateIso(new Date());
      input.removeAttribute('max');
      input.min = min;
      input.value = min;
    }
    const open = () => {
      try {
        if (typeof input.showPicker === 'function') input.showPicker();
        else input.focus();
      } catch {
        input.focus();
      }
    };
    open();
    requestAnimationFrame(open);
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
      const weeks = storageWeeksForIsos(days);
      const batches = await Promise.all(weeks.map(async weekStartIso => {
        const res = await fetch(`/api/planner?weekStart=${weekStartIso}`);
        if (!res.ok) return [] as MealPlan[];
        const data = await res.json();
        return Array.isArray(data) ? data as MealPlan[] : [];
      }));
      if (gen !== railFetchGen.current) return;
      setRailMeals(batches.flat());
    } catch { /* occupancy falls back to the week already on screen */ }
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
      const days = surroundingTenDays(session.originIso);
      setRailDays(days);
      void loadRailMeals(days);
      updateDrag({ ...session, armed: true });
    }, HOLD_MS);
  };

  const applyPointerMove = (e: PointerEvent) => {
    const session = dragRef.current;
    if (!session || e.pointerId !== session.pointerId) return;
    const dx = e.clientX - session.startX;
    const dy = e.clientY - session.startY;
    if (!session.armed) {
      if (movementExceededThreshold(dx, dy)) {
        clearHoldTimer();
        holdEl.current = null;
        updateDrag(null);
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
    const daysSnapshot = railDays;
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
      openRailDatePicker(session.mealId, session.target.direction, daysSnapshot);
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

  const openCardMenu = (e: React.MouseEvent, mealId: string, dayIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const up = rect.bottom > window.innerHeight * 0.55;
    setCardMenu({
      mealId,
      dayIndex,
      right: window.innerWidth - rect.right,
      y: up ? rect.top - 4 : rect.bottom + 4,
      up,
      view: 'root',
    });
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
          body: JSON.stringify({ week_start: storageCoords(getDayDate(weekStart, day)).weekStart, recipe_id: picks[day], day_of_week: storageCoords(getDayDate(weekStart, day)).dayOfWeek, meal_type: 'dinner', servings: magicSettings.servings }),
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
            <span className="pl-week-label">{formatWeekLabel(formatDate(weekStart), new Date(), weekStartsOn)}</span>
            <button className="pl-nav-btn" onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(d.getDate() + 7); return n; })}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </button>
            {!viewingThisWeek && (
              <button className="pl-today-btn" onClick={() => setWeekStart(startOfDisplayWeek(new Date(), weekStartsOn))}>Today</button>
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
        <div className={`pl-days${drag?.armed ? ' is-dragging' : ''}`}>
          {DAYS.map((dayName, dayIndex) => {
            const date = getDayDate(weekStart, dayIndex);
            const todayIdx = todayDisplayIdx;
            const isToday = viewingThisWeek && dayIndex === todayIdx;
            const isPast = viewingThisWeek && dayIndex < todayIdx;
            const dayMeals = getMealsForDay(dayIndex);
            const daySuggestions = suggestions[dayIndex] ?? [];

            return (
              <div
                key={dayIndex}
                ref={el => {
                  dayEls.current[dayIndex] = el;
                  if (isToday) todayRef.current = el;
                }}
                className={`pl-day ${isToday ? 'is-today' : ''} ${isPast ? 'is-past' : ''}${drag?.armed && drag.target?.type === 'week-day' && drag.target.index === dayIndex ? ' is-drop-target' : ''}`}
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
                      const menuOpen = cardMenu?.mealId === meal.id;
                      return (
                        <div
                          key={meal.id}
                          className={`pl-recipe-card${drag?.armed && drag.mealId === meal.id ? ' is-dragging' : ''}`}
                          onClick={() => {
                            if (suppressCardClick.current) {
                              suppressCardClick.current = false;
                              return;
                            }
                            if (meal.recipe_id) window.location.href = `/recipes?open=${meal.recipe_id}`;
                          }}
                          title="View recipe"
                        >
                          <button
                            type="button"
                            className={`pl-drag-handle${drag?.armed && drag.mealId === meal.id ? ' is-dragging' : ''}${shouldAllowDrag(meal.id) ? '' : ' is-disabled'}`}
                            title="Hold to move"
                            aria-label="Hold to move"
                            disabled={!shouldAllowDrag(meal.id)}
                            onClick={e => { e.preventDefault(); e.stopPropagation(); }}
                            onContextMenu={e => e.preventDefault()}
                            onPointerDown={e => onDragHandlePointerDown(e, meal.id, dayIndex)}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              <polyline points="5 9 2 12 5 15"/>
                              <polyline points="9 5 12 2 15 5"/>
                              <polyline points="15 19 12 22 9 19"/>
                              <polyline points="19 9 22 12 19 15"/>
                              <line x1="2" y1="12" x2="22" y2="12"/>
                              <line x1="12" y1="2" x2="12" y2="22"/>
                            </svg>
                          </button>
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
                              className={`pl-card-btn ${menuOpen ? 'is-open' : ''}`}
                              title="Meal options"
                              aria-haspopup="menu"
                              aria-expanded={menuOpen}
                              onClick={e => openCardMenu(e, meal.id, dayIndex)}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <line x1="4" y1="6" x2="20" y2="6"/>
                                <line x1="4" y1="12" x2="20" y2="12"/>
                                <line x1="4" y1="18" x2="20" y2="18"/>
                              </svg>
                            </button>
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

      {drag?.armed && railDays.length > 0 && (
        <div className="pl-rail" aria-live="polite" aria-label="Nearby days">
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
            const occupied = dayOccupied(occupancyMeals, iso);
            const titles = titlesOnDay(occupancyMeals, iso);
            const hot = drag.target?.type === 'rail-day' && drag.target.iso === iso;
            return (
              <div
                key={iso}
                ref={el => { railEls.current[index] = el; }}
                className={`pl-rail-day${occupied ? ' is-occupied' : ''}${hot ? ' is-hot' : ''}${iso === drag.originIso ? ' is-origin' : ''}`}
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
      <input
        ref={railDateInputRef}
        type="date"
        className="pl-picker-date-hidden"
        aria-label="Pick a date to move this meal"
        onChange={e => {
          const value = e.target.value;
          const pending = pendingRailPick.current;
          pendingRailPick.current = null;
          e.target.value = '';
          e.target.removeAttribute('min');
          e.target.removeAttribute('max');
          if (!pending || !value) return;
          void moveMealToDate(pending.mealId, parseLocalIso(value));
        }}
      />
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
          <div
            ref={cardMenuRef}
            className={`pl-card-menu ${cardMenu.up ? 'is-up' : ''}`}
            style={{ right: cardMenu.right, top: cardMenu.y }}
            role="menu"
          >
            {cardMenu.view === 'root' ? (
              <>
                <button
                  className="pl-card-menu-item"
                  role="menuitem"
                  onClick={() => {
                    const { mealId, dayIndex } = cardMenu;
                    setCardMenu(null);
                    setPicker({ dayIndex, replacingId: mealId });
                    setPickerSearch('');
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1 4 1 10 7 10"/>
                    <path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
                  </svg>
                  Replace
                </button>
                <button
                  className="pl-card-menu-item"
                  role="menuitem"
                  onClick={() => setCardMenu(m => m ? { ...m, view: 'move' } : m)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                  Move to
                  <svg className="pl-card-menu-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </button>
                <div className="pl-card-menu-sep" />
                <button
                  className="pl-card-menu-item is-danger"
                  role="menuitem"
                  onClick={() => {
                    const { mealId } = cardMenu;
                    setCardMenu(null);
                    removeMeal(mealId);
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                  </svg>
                  Delete
                </button>
              </>
            ) : (
              <>
                <button
                  className="pl-card-menu-item pl-card-menu-back"
                  onClick={() => setCardMenu(m => m ? { ...m, view: 'root' } : m)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                  Move to…
                </button>
                <div className="pl-card-menu-sep" />
                {DAYS.map((name, i) => {
                  const date = getDayDate(weekStart, i);
                  const isCurrent = i === cardMenu.dayIndex;
                  return (
                    <button
                      key={i}
                      className={`pl-card-menu-item ${isCurrent ? 'is-current' : ''}`}
                      role="menuitem"
                      disabled={isCurrent}
                      onClick={() => {
                        const { mealId, dayIndex } = cardMenu;
                        setCardMenu(null);
                        moveMeal(mealId, dayIndex, i);
                      }}
                    >
                      <span className="pl-card-menu-day">
                        <span>{name}</span>
                        <span className="pl-card-menu-date">{date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>
                      </span>
                      {isCurrent && <span className="pl-card-menu-check">✓</span>}
                    </button>
                  );
                })}
              </>
            )}
          </div>
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
        .pl-day { padding: 1.25rem 0; border-bottom: 1px solid var(--border); }
        .pl-day:first-child { border-top: 1px solid var(--border); }
        .pl-day.is-past { opacity: 0.42; }
        .pl-day.is-drop-target {
          outline: 2px solid var(--rust);
          outline-offset: 2px;
          background: rgba(181, 69, 27, 0.06);
        }
        .pl-days.is-dragging { user-select: none; cursor: grabbing; }

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
        .pl-recipe-card.is-dragging { opacity: 0.4; touch-action: none; }
        .pl-rail {
          position: fixed; top: 0; right: 0; bottom: 0; z-index: 36;
          width: 92px;
          display: flex; flex-direction: column;
          padding: 8px 6px env(safe-area-inset-bottom, 8px);
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
        .pl-rail-pick { flex: 0 0 auto; padding: 8px 0 6px; }
        .pl-rail-day.is-hot { background: rgba(181, 69, 27, 0.1); }
        .pl-rail-day.is-origin .pl-rail-circle { box-shadow: 0 0 0 2px var(--parchment), 0 0 0 3px var(--rust); }
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
        .pl-recipe-img { width: 80px; min-height: 66px; align-self: stretch; flex-shrink: 0; background: var(--parchment); overflow: hidden; }
        .pl-recipe-img img { width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none; }
        .pl-recipe-info { flex: 1; min-width: 0; padding: 0.65rem 0.75rem; display: flex; flex-direction: column; justify-content: center; }
        .pl-recipe-top { display: flex; align-items: flex-start; gap: 0.4rem 0.5rem; margin-bottom: 0.35rem; flex-wrap: wrap; }
        .pl-recipe-name { flex: 1 1 10rem; min-width: 0; font-size: 0.9rem; color: var(--ink); font-weight: 400; line-height: 1.3; white-space: normal; overflow-wrap: anywhere; }
        .pl-recipe-meta { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; font-size: 0.72rem; color: var(--ink-muted); }
        .pl-recipe-tag { background: var(--parchment); border: 1px solid var(--border); border-radius: 99px; padding: 1px 6px; font-size: 0.66rem; color: var(--ink-soft); }
        .pl-card-actions { display: flex; align-items: center; gap: 6px; padding: 0 12px; flex-shrink: 0; align-self: center; }
        .pl-card-btn { background: white; border: 1px solid var(--border); border-radius: 50%; width: 32px; height: 32px; min-width: 32px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; cursor: pointer; color: var(--ink-muted); transition: all 0.18s; padding: 0; }
        .pl-card-btn:hover, .pl-card-btn.is-open { border-color: var(--rust); color: var(--rust); }
        .pl-drag-handle {
          flex-shrink: 0; align-self: stretch; width: 40px;
          display: flex; align-items: center; justify-content: center;
          background: var(--parchment); border: none; border-right: 1px solid var(--border);
          color: var(--ink); cursor: grab; padding: 0;
          touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;
        }
        .pl-drag-handle:hover { color: var(--rust); background: rgba(181, 69, 27, 0.08); }
        .pl-drag-handle:active, .pl-drag-handle.is-dragging { cursor: grabbing; color: var(--rust); background: rgba(181, 69, 27, 0.12); }
        .pl-drag-handle.is-disabled { opacity: 0.35; cursor: default; }

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
          .pl-title { font-size: 2rem; }
          .pl-topbar { gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
          .pl-btn-magic, .pl-btn-gen { font-size: 0.75rem; padding: 0.42rem 0.7rem; }
          .pl-day { padding: 1rem 0; }
          .pl-day-name { font-size: 1.1rem; }
          .pl-recipe-img { width: 64px; min-height: 56px; height: auto; }
          .pl-recipe-name { font-size: 0.85rem; }
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
