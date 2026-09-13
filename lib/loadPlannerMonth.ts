import type { MealPlan } from './db';
import { monthRange, storageWeeksForDateRange } from './plannerMonth';

export function mergePlannerMeals(...batches: MealPlan[][]): MealPlan[] {
  const map = new Map<string, MealPlan>();
  for (const batch of batches) {
    for (const meal of batch) map.set(meal.id, meal);
  }
  return [...map.values()];
}

export function parsePlannerNotes(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [iso, note] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof note === 'string' && note.trim()) out[iso] = note;
  }
  return out;
}

export function mergePlannerNotes(...batches: Record<string, string>[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const batch of batches) Object.assign(map, parsePlannerNotes(batch));
  return map;
}

/** Drop ISO keys in `[from, to]` then merge incoming day notes. Empty text deletes. */
export function replaceNotesInRange(
  store: Map<string, string>,
  from: string,
  to: string,
  incoming: Record<string, string>,
): void {
  for (const iso of [...store.keys()]) {
    if (iso >= from && iso <= to) store.delete(iso);
  }
  for (const [iso, note] of Object.entries(parsePlannerNotes(incoming))) {
    if (iso >= from && iso <= to) store.set(iso, note);
  }
}

export async function fetchMealsForWeeks(weekStarts: string[]): Promise<MealPlan[]> {
  const unique = [...new Set(weekStarts.filter(Boolean))];
  const batches = await Promise.all(unique.map(async weekStart => {
    const res = await fetch(`/api/planner?weekStart=${encodeURIComponent(weekStart)}`);
    if (!res.ok) throw new Error('Failed to load planner week');
    const data = await res.json();
    return Array.isArray(data) ? data as MealPlan[] : [];
  }));
  return batches.flat();
}

export async function fetchMealsForMonths(keys: string[]): Promise<MealPlan[]> {
  const unique = [...new Set(keys)];
  const batches = await Promise.all(unique.map(async key => {
    const { from, to } = monthRange(key);
    const weeks = storageWeeksForDateRange(from, to);
    const params = new URLSearchParams({ from, to });
    if (weeks.length) params.set('weeks', weeks.join(','));
    const res = await fetch(`/api/planner?${params}`);
    if (!res.ok) throw new Error('Failed to load planner month');
    const data = await res.json();
    return Array.isArray(data) ? data as MealPlan[] : [];
  }));
  return batches.flat();
}

export async function fetchNotesForMonths(keys: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(keys)];
  const batches = await Promise.all(unique.map(async key => {
    const { from, to } = monthRange(key);
    const res = await fetch(
      `/api/planner-notes?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    );
    if (!res.ok) throw new Error('Failed to load planner notes');
    return parsePlannerNotes(await res.json());
  }));
  return mergePlannerNotes(...batches);
}
