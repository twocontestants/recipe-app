import { describe, expect, it } from 'vitest';
import {
  mergeRecipeSourceMaps,
  recipeSourceMapFromItems,
  recipeSourceMapFromRecipes,
  shoppingListMetaOmitsItemBodies,
  shoppingListMetaSelectSql,
  toShoppingListMeta,
} from './shoppingList';

describe('shoppingListMetaSelectSql', () => {
  it('selects dropdown meta columns and separates them with commas', () => {
    expect(shoppingListMetaSelectSql()).toBe(
      'SELECT id, name, subtitle, generated_at, recipe_ids FROM shopping_lists',
    );
  });

  it('does not select item bodies, checks, or aisle JSON', () => {
    expect(shoppingListMetaOmitsItemBodies(shoppingListMetaSelectSql())).toBe(true);
    expect(shoppingListMetaSelectSql()).not.toMatch(/\bitems\b/);
    expect(shoppingListMetaSelectSql()).not.toMatch(/checked_state/);
    expect(shoppingListMetaSelectSql()).not.toMatch(/item_overrides/);
    expect(shoppingListMetaSelectSql()).not.toMatch(/custom_items/);
  });
});

describe('toShoppingListMeta', () => {
  it('keeps dropdown fields and drops missing optional values to empties', () => {
    expect(toShoppingListMeta({
      id: '1',
      name: 'This week',
      generated_at: '2026-08-24T00:00:00.000Z',
    })).toEqual({
      id: '1',
      name: 'This week',
      subtitle: '',
      generated_at: '2026-08-24T00:00:00.000Z',
      recipe_ids: [],
    });
  });
});

describe('recipe source maps', () => {
  it('collects title → URL from contributions', () => {
    expect(recipeSourceMapFromItems([
      { contributions: [{ recipe: 'Pie', source_url: 'https://example.com/pie' }] },
      { contributions: [{ recipe: 'Stew' }] },
    ])).toEqual({ Pie: 'https://example.com/pie' });
  });

  it('collects title → URL from recipe cards', () => {
    expect(recipeSourceMapFromRecipes([
      { title: 'Pie', source_url: 'https://example.com/pie' },
      { title: 'Stew', source_url: '' },
      { title: 'Soup' },
    ])).toEqual({ Pie: 'https://example.com/pie' });
  });

  it('merges contribution URLs with a live lookup, preferring later maps', () => {
    expect(mergeRecipeSourceMaps(
      { Pie: 'https://old.example/pie', Stew: 'https://example.com/stew' },
      { Pie: 'https://example.com/pie' },
    )).toEqual({
      Pie: 'https://example.com/pie',
      Stew: 'https://example.com/stew',
    });
  });
});
