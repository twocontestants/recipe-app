import { describe, expect, it } from 'vitest';
import {
  PREFERENCE_KEYS,
  aggregateIngredientDictionary,
  ownedIngredientsSelectSql,
  preferenceSettingsSelectSql,
} from './settingsLoad';

describe('ownedIngredientsSelectSql', () => {
  it('selects owned ingredient JSON without method steps or a star', () => {
    const sql = ownedIngredientsSelectSql();
    expect(sql).toMatch(/SELECT r\.id,\s*r\.ingredients FROM recipes r/);
    expect(sql).not.toMatch(/\br\.\*/);
    expect(sql).not.toMatch(/\bsteps\b/);
    expect(sql).not.toMatch(/recipe_ratings|recipe_notes|my_rating|my_note/);
  });
});

describe('preferenceSettingsSelectSql', () => {
  it('loads many keys in one owner query', () => {
    expect(preferenceSettingsSelectSql()).toBe(
      'SELECT key, value FROM app_settings WHERE owner_id = $1 AND key = ANY($2::text[])',
    );
    expect(PREFERENCE_KEYS).toEqual(['categoryPrefMode', 'weekStartDay']);
  });
});

describe('aggregateIngredientDictionary', () => {
  it('counts each recipe once per standardised name and keeps a few wordings', () => {
    const { entries } = aggregateIngredientDictionary(
      [
        { ingredients: [{ name: 'Large onion, diced' }, { name: 'onion' }] },
        { ingredients: [{ name: 'red onion' }] },
      ],
      {},
    );
    const onion = entries.find(e => e.name === 'onion');
    expect(onion).toMatchObject({
      source: 'auto',
      count: 2,
    });
    expect(onion?.examples).toEqual(expect.arrayContaining(['Large onion, diced', 'red onion']));
    expect(onion?.examples.length).toBeLessThanOrEqual(3);
  });

  it('keeps leftover custom overrides and lists their aisle in categories', () => {
    const { entries, categories } = aggregateIngredientDictionary(
      [{ ingredients: [{ name: 'flour' }] }],
      { saffron: 'Spices', 'fancy salt': 'The fancy aisle' },
    );
    const leftover = entries.find(e => e.name === 'saffron');
    expect(leftover).toMatchObject({ count: 0, source: 'custom', category: 'Spices' });
    expect(categories).toContain('The fancy aisle');
    expect(categories[0]).toBe('Fruit & Veg');
  });

  it('does not invent method steps on a dictionary row', () => {
    const { entries } = aggregateIngredientDictionary(
      [{ ingredients: [{ name: 'butter' }] }],
      {},
    );
    expect(entries[0]).not.toHaveProperty('steps');
    expect(entries[0]).not.toHaveProperty('ingredients');
  });
});
