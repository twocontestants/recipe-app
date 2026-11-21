import type { MealPlan } from './db';
import { fetchMealsForMonths } from './loadPlannerMonth';
import { plannedOnOf } from './plannerDate';
import { missingMonths, monthRange } from './plannerMonth';

type Listener = () => void;

const meals = new Map<string, MealPlan>();
const loadedMonths = new Set<string>();
const inflight = new Map<string, Promise<void>>();
const listeners = new Set<Listener>();

function notify() {
  for (const listener of listeners) listener();
}

function clearMonthWindow(key: string) {
  const { from, to } = monthRange(key);
  for (const [id, meal] of meals) {
    if (id.startsWith('tmp-')) continue;
    const on = plannedOnOf(meal);
    if (on >= from && on <= to) meals.delete(id);
  }
}

async function fetchAndStore(keys: string[]) {
  const fetched = await fetchMealsForMonths(keys);
  for (const key of keys) {
    clearMonthWindow(key);
    loadedMonths.add(key);
  }
  for (const meal of fetched) meals.set(meal.id, meal);
  notify();
}

export function resetPlannerMealCache() {
  meals.clear();
  loadedMonths.clear();
  inflight.clear();
}

export function snapshotPlannerMeals(): MealPlan[] {
  return [...meals.values()];
}

export function loadedPlannerMonthKeys(): string[] {
  return [...loadedMonths];
}

export function hasPlannerMonths(keys: string[]): boolean {
  return keys.length > 0 && missingMonths(keys, loadedMonths).length === 0;
}

export function subscribePlannerMeals(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function hydratePlannerMealCache(plans: MealPlan[], monthKeys: string[]) {
  meals.clear();
  loadedMonths.clear();
  inflight.clear();
  for (const plan of plans) meals.set(plan.id, plan);
  for (const key of monthKeys) loadedMonths.add(key);
  notify();
}

export function upsertPlannerMeal(meal: MealPlan) {
  meals.set(meal.id, meal);
  notify();
}

export function removePlannerMeal(id: string) {
  meals.delete(id);
  notify();
}

export function invalidatePlannerMonths(keys: string[]) {
  for (const key of keys) loadedMonths.delete(key);
}

export async function ensurePlannerMonths(keys: string[]): Promise<MealPlan[]> {
  const unique = [...new Set(keys.filter(Boolean))];
  const needed = missingMonths(unique, loadedMonths);
  const waitFor: Promise<void>[] = [];
  const fetchKeys: string[] = [];
  for (const key of needed) {
    const flying = inflight.get(key);
    if (flying) waitFor.push(flying);
    else fetchKeys.push(key);
  }
  if (fetchKeys.length) {
    const work = fetchAndStore(fetchKeys).finally(() => {
      for (const key of fetchKeys) inflight.delete(key);
    });
    for (const key of fetchKeys) inflight.set(key, work);
    waitFor.push(work);
  }
  if (waitFor.length) await Promise.all(waitFor);
  return snapshotPlannerMeals();
}

export async function reloadPlannerMonths(keys: string[]): Promise<MealPlan[]> {
  const unique = [...new Set(keys.filter(Boolean))];
  if (!unique.length) return snapshotPlannerMeals();
  const fetched = await fetchMealsForMonths(unique);
  if (!fetched.length && meals.size > 0) return snapshotPlannerMeals();
  const temps = [...meals.values()].filter(meal => String(meal.id).startsWith('tmp-'));
  for (const key of unique) {
    clearMonthWindow(key);
    loadedMonths.add(key);
  }
  for (const meal of fetched) meals.set(meal.id, meal);
  for (const temp of temps) meals.set(temp.id, temp);
  notify();
  return snapshotPlannerMeals();
}
