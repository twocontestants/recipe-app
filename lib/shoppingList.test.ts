import { describe, expect, it } from 'vitest';
import {
  adoptCheckedState,
  alignCheckedKeysToItems,
  checkedMapFromItems,
  isShoppingListDetail,
  leftoverCheckedMap,
  migrateShoppingListShape,
  rowIsChecked,
  shoppingSubtitleSig,
  mergeRecipeSourceMaps,
  recipeSourceMapFromItems,
  recipeSourceMapFromRecipes,
  shouldAdoptCheckedState,
  shoppingListAddItemSql,
  shoppingListClearCheckedSql,
  shoppingListContributionCheckSql,
  shoppingListItemCheckSql,
  shoppingListMetaOmitsItemBodies,
  shoppingListMetaSelectSql,
  shoppingListRemoveItemSql,
  shoppingListUpdateItemSql,
  splitCheckKey,
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

describe('shopping list checked flags', () => {
  it('treats a detail body as the source of ticks, including a structural refetch', () => {
    expect(isShoppingListDetail({ items: [], checked_state: { a1: true } })).toBe(true);
    expect(adoptCheckedState({ items: [{ id: 'a1', checked: true }] })).toEqual({ a1: true });
    expect(adoptCheckedState({ items: [] })).toEqual({});
    expect(shouldAdoptCheckedState({ busy: false })).toBe(true);
    expect(shouldAdoptCheckedState({ busy: true })).toBe(false);
  });

  it('does not adopt ticks from a meta index or an error payload', () => {
    expect(isShoppingListDetail([{ id: '1', name: 'This week' }])).toBe(false);
    expect(adoptCheckedState([{ id: '1' }])).toBeUndefined();
    expect(adoptCheckedState({ id: '1', name: 'This week', recipe_ids: [] })).toBeUndefined();
    expect(adoptCheckedState({ error: 'Not found' })).toBeUndefined();
  });

  it('maps leftover name-keyed ticks onto item ids so the row can show them', () => {
    expect(adoptCheckedState({
      items: [{ id: 'a1', name: 'onion', displayName: 'Onion' }],
      checked_state: { onion: { checked: true, checkedBy: 'Sam', checkedAt: 1 } },
    })).toEqual({ a1: true });
    expect(alignCheckedKeysToItems(
      { Onion: true },
      [{ id: 'a1', name: 'onion', displayName: 'Onion' }],
    )).toEqual({ a1: true });
  });

  it('parses string JSON leftover ticks and drops who/when', () => {
    expect(leftoverCheckedMap(JSON.stringify({
      a1: { checked: true, checkedBy: 'Sam', checkedAt: 1 },
    }))).toEqual({ a1: true });
    expect(leftoverCheckedMap({ a1: JSON.stringify({ checked: true, checkedBy: 'Sam' }) })).toEqual({ a1: true });
    expect(adoptCheckedState({
      items: [{ id: 'a1', name: 'onion' }],
      checked_state: JSON.stringify({ onion: { checked: true, checkedBy: 'Sam', checkedAt: 1 } }),
    })).toEqual({ a1: true });
  });

  it('keeps custom-item and detached-subline ticks on those rows', () => {
    expect(adoptCheckedState({
      items: [{ id: 'a1', name: 'onion', contributions: [{ name: 'Onion', checked: true }] }],
      custom_items: [{ id: 'c9', displayName: 'Tape' }],
      checked_state: { c9: { checked: true, checkedBy: 'Sam', checkedAt: 1 }, 'a1#0': { checked: true } },
    })).toEqual({ c9: true, 'a1#0': true });
  });

  it('reads ticks from item.checked after fold', () => {
    expect(checkedMapFromItems([
      { id: 'a1', checked: true, contributions: [{ name: 'Onion' }] },
      { id: 'c9', custom: true, checked: false },
    ])).toEqual({ a1: true });
  });

  it('shows a tick from the item when the overlay was never adopted', () => {
    expect(rowIsChecked('a1', {}, true)).toBe(true);
    expect(rowIsChecked('a1', {}, false)).toBe(false);
    expect(rowIsChecked('a1', { a1: true }, false)).toBe(true);
    expect(rowIsChecked('a1', { a1: false }, true)).toBe(false);
  });

  it('uses the same subtitle signature as a loaded empty note so mount does not look dirty', () => {
    expect(shoppingSubtitleSig('')).toBe(JSON.stringify(''));
    expect(shoppingSubtitleSig('')).not.toBe('');
  });
});

describe('shopping list item SQL', () => {
  it('merges a boolean onto the matching items[] element', () => {
    expect(shoppingListItemCheckSql()).toMatch(/jsonb_build_object\('checked', to_jsonb\(\$3::boolean\)\)/);
    expect(shoppingListItemCheckSql()).toMatch(/WITH ORDINALITY/);
    expect(shoppingListContributionCheckSql()).toMatch(/contributions/);
    expect(shoppingListClearCheckedSql()).toMatch(/"checked":false/);
    expect(shoppingListAddItemSql()).toMatch(/jsonb_build_array\(\$3::jsonb\)/);
    expect(shoppingListUpdateItemSql()).toMatch(/e \|\| \$3::jsonb/);
    expect(shoppingListRemoveItemSql()).toMatch(/e->>'id' <> \$2/);
  });

  it('splits a detached wording key from an item id', () => {
    expect(splitCheckKey('a1')).toEqual({ itemId: 'a1', contributionIndex: null });
    expect(splitCheckKey('a1#0')).toEqual({ itemId: 'a1', contributionIndex: 0 });
  });
});

describe('migrateShoppingListShape', () => {
  it('folds leftover ticks onto item.checked and remaps name keys', () => {
    const { list, changed } = migrateShoppingListShape({
      items: [{ id: 'a1', name: 'onion', displayName: 'Onion' }],
      item_overrides: { onion: { hidden: true } },
      item_order: { Pantry: ['onion'] },
      checked_state: { onion: { checked: true, checkedBy: 'Sam', checkedAt: 1 } },
    });
    expect(changed).toBe(true);
    const onion = list.items[0] as unknown as { id: string; checked: boolean };
    expect(onion.id).toBe('a1');
    expect(onion.checked).toBe(true);
    expect(list.checked_state).toEqual({});
    expect(list.item_overrides).toEqual({ a1: { hidden: true } });
    expect(list.item_order).toEqual({ Pantry: ['a1'] });
  });

  it('appends leftover custom items onto items with custom: true', () => {
    const { list, changed } = migrateShoppingListShape({
      items: [{ id: 'a1', name: 'onion', displayName: 'Onion', checked: false }],
      custom_items: [{ id: 'c9', displayName: 'Tape', category: 'Pantry', displayAmount: '1' }],
      checked_state: { c9: { checked: true, checkedBy: 'Sam', checkedAt: 1 } },
      item_overrides: {},
      item_order: {},
    });
    expect(changed).toBe(true);
    expect(list.custom_items).toEqual([]);
    const tape = list.items.find(item => (item as { id: string }).id === 'c9') as unknown as {
      custom?: boolean; checked: boolean; displayName: string; totalAmount: string;
    };
    expect(tape.custom).toBe(true);
    expect(tape.checked).toBe(true);
    expect(tape.displayName).toBe('Tape');
    expect(tape.totalAmount).toBe('1');
  });

  it('keeps existing ids and only fills ids on rows that lack them', () => {
    const { list, changed } = migrateShoppingListShape({
      items: [
        { id: 'keep-me', name: 'onion', displayName: 'Onion' },
        { name: 'garlic', displayName: 'Garlic', totalAmount: '2', unit: '', recipes: [], category: 'Fruit & Veg' },
      ],
      item_overrides: {},
      item_order: {},
      checked_state: { onion: { checked: true, checkedBy: 'Sam', checkedAt: 1 }, garlic: { checked: true } },
    });
    expect(changed).toBe(true);
    const first = list.items[0] as unknown as { id: string; checked: boolean };
    const second = list.items[1] as unknown as { id: string; checked: boolean };
    expect(first.id).toBe('keep-me');
    expect(second.id).toBe(stableShoppingItemId('garlic', 1));
    expect(first.checked).toBe(true);
    expect(second.checked).toBe(true);
  });

  it('is stable across remigration when write-back did not land', () => {
    const first = migrateShoppingListShape({
      items: [{ name: 'onion', displayName: 'Onion' }],
      item_overrides: {},
      item_order: {},
      custom_items: [],
      checked_state: { onion: { checked: true, checkedBy: 'Sam', checkedAt: 1 } },
    });
    const second = migrateShoppingListShape({
      items: first.list.items,
      item_overrides: first.list.item_overrides,
      item_order: first.list.item_order,
      custom_items: first.list.custom_items,
      checked_state: first.list.checked_state,
    });
    expect(first.list.items[0]).toEqual(second.list.items[0]);
    expect(second.changed).toBe(false);
    const migrated = first.list.items[0] as unknown as { id: string; checked: boolean };
    expect(migrated.checked).toBe(true);
    expect(migrated.id).toBe(stableShoppingItemId('onion', 0));
  });

  it('does not rewrite a list that is already unified', () => {
    const { changed } = migrateShoppingListShape({
      items: [{ id: 'a1', name: 'onion', displayName: 'Onion', checked: false, custom: false }],
      custom_items: [],
      checked_state: {},
      item_overrides: {},
      item_order: {},
    });
    expect(changed).toBe(false);
  });
});
