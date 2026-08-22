import type { MealPlan } from './db';
import { monthRange } from './plannerMonth';

export async function fetchMealsForMonths(keys: string[]): Promise<MealPlan[]> {
  const unique = [...new Set(keys)];
  const batches = await Promise.all(unique.map(async key => {
    const { from, to } = monthRange(key);
    const res = await fetch(`/api/planner?from=${from}&to=${to}`);
    if (!res.ok) throw new Error('Failed to load planner month');
    const data = await res.json();
    return Array.isArray(data) ? data as MealPlan[] : [];
  }));
  return batches.flat();
}
