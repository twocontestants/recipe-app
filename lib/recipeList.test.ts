import { describe, expect, it } from 'vitest';
import {
  hasRecipeMethod,
  recipeListQueryString,
  removeRecipeFromList,
  upsertRecipeInList,
} from './recipeList';

describe('recipeListQueryString', () => {
  it('uses only the include-public toggle, never a user id', () => {
    expect(recipeListQueryString({ includePublic: false })).toBe('');
    expect(recipeListQueryString({ includePublic: true })).toBe('?includePublic=1');
    expect(recipeListQueryString({ includePublic: true })).not.toMatch(/user/i);
    expect(recipeListQueryString({ includePublic: false })).not.toMatch(/user/i);
  });
});

describe('hasRecipeMethod', () => {
  it('treats missing ingredients or steps as not yet loaded', () => {
    expect(hasRecipeMethod({})).toBe(false);
    expect(hasRecipeMethod({ ingredients: [] })).toBe(false);
    expect(hasRecipeMethod({ steps: [] })).toBe(false);
    expect(hasRecipeMethod({ ingredients: [{ name: 'flour' }] })).toBe(false);
  });

  it('treats present arrays as loaded, including an empty method', () => {
    expect(hasRecipeMethod({ ingredients: [], steps: [] })).toBe(true);
    expect(hasRecipeMethod({ ingredients: [{ name: 'flour' }], steps: ['Mix'] })).toBe(true);
  });
});

describe('upsertRecipeInList', () => {
  it('prepends a new recipe and replaces an existing id', () => {
    const pie = { id: '1', title: 'Pie' };
    const stew = { id: '2', title: 'Stew' };
    const withNew = upsertRecipeInList([pie], stew);
    expect(withNew.map(r => r.id)).toEqual(['2', '1']);
    const renamed = upsertRecipeInList(withNew, { id: '1', title: 'Apple pie' });
    expect(renamed).toEqual([
      { id: '2', title: 'Stew' },
      { id: '1', title: 'Apple pie' },
    ]);
  });
});

describe('removeRecipeFromList', () => {
  it('drops the matching id and leaves others', () => {
    expect(removeRecipeFromList([{ id: '1' }, { id: '2' }], '1')).toEqual([{ id: '2' }]);
    expect(removeRecipeFromList([{ id: '1' }], 'missing')).toEqual([{ id: '1' }]);
  });
});
