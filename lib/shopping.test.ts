import { describe, expect, it } from 'vitest';
import type { MealPlan } from './db';
import { generateShoppingList } from './shopping';

function dinner(overrides: { title: string; source_url?: string; ingredient: string }): MealPlan {
  return {
    id: 'mp1',
    planned_on: '2026-08-24',
    week_start: '2026-08-24',
    recipe_id: 'r1',
    day_of_week: 0,
    meal_type: 'dinner',
    servings: 4,
    recipe: {
      id: 'r1',
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
});
