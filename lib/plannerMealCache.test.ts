import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MealPlan } from './db';
import {
  ensurePlannerMonths,
  hasPlannerMonths,
  hydratePlannerMealCache,
  invalidatePlannerMonths,
  loadedPlannerMonthKeys,
  reloadPlannerMonths,
  removePlannerMeal,
  resetPlannerMealCache,
  snapshotPlannerMeals,
  subscribePlannerMeals,
  upsertPlannerMeal,
} from './plannerMealCache';

function dinner(id: string, plannedOn: string, title = `Meal ${id}`): MealPlan {
  return {
    id,
    planned_on: plannedOn,
    week_start: plannedOn,
    recipe_id: id,
    day_of_week: 0,
    meal_type: 'dinner',
    servings: 4,
    recipe: { title } as MealPlan['recipe'],
  };
}

function stubPlannerGets(handler: (url: string) => MealPlan[] | Promise<MealPlan[]>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (!url.includes('/api/planner')) return { ok: false, json: async () => ({}) };
    const data = await handler(url);
    return { ok: true, json: async () => data };
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  resetPlannerMealCache();
  vi.unstubAllGlobals();
});

describe('ensurePlannerMonths', () => {
  it('fetches missing months once and reuses them', async () => {
    const pie = dinner('pie', '2026-08-17', 'Chicken pie');
    const fetchMock = stubPlannerGets(() => [pie]);

    const first = await ensurePlannerMonths(['2026-08']);
    expect(first.map(meal => meal.id)).toEqual(['pie']);
    expect(hasPlannerMonths(['2026-08'])).toBe(true);

    const second = await ensurePlannerMonths(['2026-08']);
    expect(second.map(meal => meal.id)).toEqual(['pie']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('from=2026-08-01');
    expect(String(fetchMock.mock.calls[0][0])).not.toContain('weekStart=');
  });

  it('shares one in-flight request for the same month', async () => {
    let release!: (meals: MealPlan[]) => void;
    const pending = new Promise<MealPlan[]>(resolve => { release = resolve; });
    const fetchMock = stubPlannerGets(() => pending);

    const a = ensurePlannerMonths(['2026-08']);
    const b = ensurePlannerMonths(['2026-08']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    release([dinner('pie', '2026-08-17')]);
    expect((await a).map(meal => meal.id)).toEqual(['pie']);
    expect((await b).map(meal => meal.id)).toEqual(['pie']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('reloadPlannerMonths', () => {
  it('refetches loaded months and keeps optimistic rows', async () => {
    hydratePlannerMealCache(
      [dinner('old', '2026-08-17', 'Old pie'), dinner('tmp-1', '2026-08-18', 'Pending')],
      ['2026-08'],
    );
    stubPlannerGets(() => [dinner('fresh', '2026-08-19', 'Fresh pie')]);

    const meals = await reloadPlannerMonths(['2026-08']);
    expect(meals.map(meal => meal.id).sort()).toEqual(['fresh', 'tmp-1']);
    expect(hasPlannerMonths(['2026-08'])).toBe(true);
  });

  it('does not wipe occupancy when a reload comes back empty', async () => {
    hydratePlannerMealCache([dinner('pie', '2026-08-17')], ['2026-08']);
    stubPlannerGets(() => []);
    const meals = await reloadPlannerMonths(['2026-08']);
    expect(meals.map(meal => meal.id)).toEqual(['pie']);
  });
});

describe('planner meal cache mutations', () => {
  it('notifies subscribers on upsert and remove', () => {
    const seen: number[] = [];
    const stop = subscribePlannerMeals(() => seen.push(snapshotPlannerMeals().length));
    upsertPlannerMeal(dinner('a', '2026-08-17'));
    removePlannerMeal('a');
    stop();
    upsertPlannerMeal(dinner('b', '2026-08-18'));
    expect(seen).toEqual([1, 0]);
  });

  it('invalidates months so the next ensure fetches again', async () => {
    const fetchMock = stubPlannerGets(() => [dinner('pie', '2026-08-17')]);
    await ensurePlannerMonths(['2026-08']);
    invalidatePlannerMonths(['2026-08']);
    expect(loadedPlannerMonthKeys()).toEqual([]);
    await ensurePlannerMonths(['2026-08']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
