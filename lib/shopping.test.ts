import { describe, expect, it } from 'vitest';
import type { MealPlan } from './db';
import {
  generateShoppingList,
  mealPlansForSelectedDinners,
  parseShoppingDinnerPicks,
} from './shopping';

function dinner(overrides: {
  title: string;
  source_url?: string;
  ingredient: string;
  recipe_id?: string;
  planned_on?: string;
  week_start?: string;
  day_of_week?: number;
  id?: string;
}): MealPlan {
  const recipe_id = overrides.recipe_id ?? 'r1';
  return {
    id: overrides.id ?? 'mp1',
    planned_on: overrides.planned_on ?? '2026-08-24',
    week_start: overrides.week_start ?? '2026-08-24',
    recipe_id,
    day_of_week: overrides.day_of_week ?? 0,
    meal_type: 'dinner',
    servings: 4,
    recipe: {
      id: recipe_id,
      title: overrides.title,
      source_url: overrides.source_url,
      servings: 4,
      tags: [],
      created_at: '',
      updated_at: '',
      owner_id: 'u1',
      visibility: 'private',
      ingredients: [{ name: overrides.ingredient, amount: '1', unit: '' }],
      steps: ['Cook'],
    },
  };
}

describe('generateShoppingList source URLs', () => {
  it('copies the recipe source URL onto each contribution', () => {
    const items = generateShoppingList([
      dinner({ title: 'Pie', source_url: 'https://example.com/pie', ingredient: 'onion' }),
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].contributions).toEqual([
      expect.objectContaining({
        recipe: 'Pie',
        source_url: 'https://example.com/pie',
      }),
    ]);
  });

  it('omits source_url when the recipe has no original URL', () => {
    const items = generateShoppingList([
      dinner({ title: 'Stew', ingredient: 'carrot' }),
    ]);
    expect(items[0].contributions[0].source_url).toBeUndefined();
  });

  it('starts every generated line unchecked and not custom', () => {
    const items = generateShoppingList([
      dinner({ title: 'Stew', ingredient: 'carrot' }),
    ]);
    expect(items[0].checked).toBe(false);
    expect(items[0].custom).toBeUndefined();
  });

  it('adds a recipe once per planned dinner, so two nights double the amount', () => {
    const items = generateShoppingList([
      dinner({ title: 'Pie', ingredient: 'onion', planned_on: '2026-08-26', id: 'last' }),
      dinner({ title: 'Pie', ingredient: 'onion', planned_on: '2026-09-02', id: 'this' }),
    ]);
    expect(items[0].contributions).toHaveLength(2);
    expect(items[0].totalAmount).toBe('2');
  });
});

describe('mealPlansForSelectedDinners', () => {
  const lastWeek = dinner({
    title: 'Pie',
    ingredient: 'onion',
    planned_on: '2026-08-26',
    week_start: '2026-08-24',
    day_of_week: 2,
    id: 'last',
  });
  const thisWeek = dinner({
    title: 'Pie',
    ingredient: 'onion',
    planned_on: '2026-09-02',
    week_start: '2026-08-31',
    day_of_week: 2,
    id: 'this',
  });
  const other = dinner({
    title: 'Stew',
    ingredient: 'carrot',
    recipe_id: 'r2',
    planned_on: '2026-09-03',
    week_start: '2026-08-31',
    day_of_week: 3,
    id: 'other',
  });

  it('keeps only the ticked dinner when the same recipe is also last week', () => {
    expect(mealPlansForSelectedDinners([lastWeek, thisWeek, other], [
      { recipe_id: 'r1', planned_on: '2026-09-02' },
    ])).toEqual([thisWeek]);
  });

  it('keeps both dinners when the cook ticks both weeks', () => {
    expect(mealPlansForSelectedDinners([lastWeek, thisWeek], [
      { recipe_id: 'r1', planned_on: '2026-08-26' },
      { recipe_id: 'r1', planned_on: '2026-09-02' },
    ])).toEqual([lastWeek, thisWeek]);
  });

  it('does not include an unticked same-recipe dinner that shares the storage week', () => {
    // Sunday 6 Sep is this display week when the week starts Sunday; that
    // calendar day still lives in the Mon 31 Aug storage week, which also
    // holds last Thursday's dinner.
    const sundayThisDisplayWeek = dinner({
      title: 'Pie',
      ingredient: 'onion',
      planned_on: '2026-09-06',
      week_start: '2026-08-31',
      day_of_week: 6,
      id: 'sun',
    });
    const lastThursday = dinner({
      title: 'Pie',
      ingredient: 'onion',
      planned_on: '2026-09-03',
      week_start: '2026-08-31',
      day_of_week: 3,
      id: 'thu',
    });
    expect(mealPlansForSelectedDinners([lastThursday, sundayThisDisplayWeek], [
      { recipe_id: 'r1', planned_on: '2026-09-06' },
    ])).toEqual([sundayThisDisplayWeek]);
  });
});

describe('parseShoppingDinnerPicks', () => {
  it('keeps planned dinners and drops malformed rows', () => {
    expect(parseShoppingDinnerPicks([
      { recipe_id: 'r1', planned_on: '2026-09-02' },
      { recipe_id: 3 },
      null,
      { recipe_id: 'r2', week_start: '2026-08-31', day_of_week: 2 },
    ])).toEqual([
      { recipe_id: 'r1', planned_on: '2026-09-02' },
      { recipe_id: 'r2', week_start: '2026-08-31', day_of_week: 2 },
    ]);
  });
});
