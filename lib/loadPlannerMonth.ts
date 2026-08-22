import type { MealPlan } from './db';
import { monthRange, storageWeeksForDateRange } from './plannerMonth';

export function mergePlannerMeals(...batches: MealPlan[][]): MealPlan[] {
  const map = new Map<string, MealPlan>();
  for (const batch of batches) {
    for (const meal of batch) map.set(meal.id, meal);
  }
  return [...map.values()];
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
