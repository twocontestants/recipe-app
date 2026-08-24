import { describe, expect, it } from 'vitest';
import {
  adoptCheckedState,
  alignCheckedStateToItems,
  isShoppingListDetail,
  mergeRecipeSourceMaps,
  migrateShoppingListShape,
  normalizeCheckedState,
  recipeSourceMapFromItems,
  recipeSourceMapFromRecipes,
  shouldAdoptCheckedState,
  shoppingListCheckClearKeySql,
  shoppingListCheckSetSql,
  shoppingListMetaOmitsItemBodies,
  shoppingListMetaSelectSql,
  stableShoppingItemId,
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

describe('shopping list checked state', () => {
  const checks = { a1: { checked: true, checkedBy: 'Sam', checkedAt: 1 } };

  it('treats a detail body as the source of checks, including a structural refetch', () => {
    expect(isShoppingListDetail({ items: [], checked_state: checks })).toBe(true);
    expect(adoptCheckedState({ items: [{ id: 'a1' }], checked_state: checks })).toEqual(checks);
    expect(adoptCheckedState({ items: [] })).toEqual({});
    expect(shouldAdoptCheckedState({ busy: false })).toBe(true);
    expect(shouldAdoptCheckedState({ busy: true })).toBe(false);
  });

  it('does not adopt checks from a meta index or an error payload', () => {
    expect(isShoppingListDetail([{ id: '1', name: 'This week' }])).toBe(false);
    expect(adoptCheckedState([{ id: '1' }])).toBeUndefined();
    expect(adoptCheckedState({ id: '1', name: 'This week', recipe_ids: [] })).toBeUndefined();
    expect(adoptCheckedState({ error: 'Not found' })).toBeUndefined();
  });

  it('maps leftover name-keyed ticks onto item ids so the row can show them', () => {
    const entry = { checked: true, checkedBy: 'Sam', checkedAt: 1 };
    expect(adoptCheckedState({
      items: [{ id: 'a1', name: 'onion', displayName: 'Onion' }],
      checked_state: { onion: entry },
    })).toEqual({ a1: entry });
    expect(alignCheckedStateToItems(
      { Onion: entry },
      [{ id: 'a1', name: 'onion', displayName: 'Onion' }],
    )).toEqual({ a1: entry });
  });

  it('parses string JSON and double-encoded entries instead of dropping them', () => {
    const entry = { checked: true, checkedBy: 'Sam', checkedAt: 1 };
    expect(normalizeCheckedState(JSON.stringify({ a1: entry }))).toEqual({ a1: entry });
    expect(normalizeCheckedState({ a1: JSON.stringify(entry) })).toEqual({ a1: entry });
    expect(adoptCheckedState({
      items: [{ id: 'a1', name: 'onion' }],
      checked_state: JSON.stringify({ onion: entry }),
    })).toEqual({ a1: entry });
  });

  it('keeps custom-item and detached-subline keys', () => {
    const entry = { checked: true, checkedBy: 'Sam', checkedAt: 1 };
    expect(adoptCheckedState({
      items: [{ id: 'a1', name: 'onion' }],
      custom_items: [{ id: 'c9', displayName: 'Tape' }],
      checked_state: { c9: entry, 'a1#0': entry },
    })).toEqual({ c9: entry, 'a1#0': entry });
  });
});

describe('shopping list check SQL', () => {
  it('merges checks as object keys instead of jsonb_set array paths', () => {
    expect(shoppingListCheckSetSql()).toMatch(/jsonb_build_object\(\$2::text, \$3::jsonb\)/);
    expect(shoppingListCheckSetSql()).not.toMatch(/jsonb_set/);
    expect(shoppingListCheckSetSql()).not.toMatch(/ARRAY\[\$2\]/);
    expect(shoppingListCheckClearKeySql()).toMatch(/- \$2::text/);
  });
});

describe('migrateShoppingListShape', () => {
  const entry = { checked: true, checkedBy: 'Sam', checkedAt: 1 };

  it('remaps name-keyed ticks when every item already has an id', () => {
    const { list, changed } = migrateShoppingListShape({
      items: [{ id: 'a1', name: 'onion', displayName: 'Onion' }],
      item_overrides: { onion: { hidden: true } },
      item_order: { Pantry: ['onion'] },
      checked_state: { onion: entry },
    });
    expect(changed).toBe(true);
    expect((list.items[0] as { id: string }).id).toBe('a1');
    expect(list.checked_state).toEqual({ a1: entry });
    expect(list.item_overrides).toEqual({ a1: { hidden: true } });
    expect(list.item_order).toEqual({ Pantry: ['a1'] });
  });

  it('keeps existing ids and only fills ids on rows that lack them', () => {
    const { list, changed } = migrateShoppingListShape({
      items: [
        { id: 'keep-me', name: 'onion', displayName: 'Onion' },
        { name: 'garlic', displayName: 'Garlic', totalAmount: '2', unit: '', recipes: [], category: 'Fruit & Veg' },
      ],
      item_overrides: {},
      item_order: {},
      checked_state: { onion: entry, garlic: entry },
    });
    expect(changed).toBe(true);
    expect((list.items[0] as { id: string }).id).toBe('keep-me');
    expect((list.items[1] as { id: string }).id).toBe(stableShoppingItemId('garlic', 1));
    expect(list.checked_state).toEqual({
      'keep-me': entry,
      [stableShoppingItemId('garlic', 1)]: entry,
    });
  });

  it('is stable across remigration when write-back did not land', () => {
    const first = migrateShoppingListShape({
      items: [{ name: 'onion', displayName: 'Onion' }],
      item_overrides: {},
      item_order: {},
      checked_state: { onion: entry },
    });
    const second = migrateShoppingListShape({
      items: first.list.items,
      item_overrides: first.list.item_overrides,
      item_order: first.list.item_order,
      checked_state: first.list.checked_state,
    });
    expect(first.list.items[0]).toEqual(second.list.items[0]);
    expect(second.changed).toBe(false);
    expect(first.list.checked_state).toEqual({ [stableShoppingItemId('onion', 0)]: entry });
  });
});
