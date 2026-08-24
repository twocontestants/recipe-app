import { describe, expect, it } from 'vitest';
import { recipeDeepLinkFromSearch, recipeEditPath, recipeViewPath } from './recipeLinks';

describe('recipeLinks', () => {
  it('builds view and edit paths from a recipe id', () => {
    expect(recipeViewPath('abc-123')).toBe('/recipes?open=abc-123');
    expect(recipeEditPath('abc-123')).toBe('/recipes?edit=abc-123');
  });

  it('encodes ids that need it', () => {
    expect(recipeViewPath('a b')).toBe('/recipes?open=a%20b');
    expect(recipeEditPath('a&b')).toBe('/recipes?edit=a%26b');
  });

  it('reads edit over open from search params', () => {
    const params = new URLSearchParams('open=view-me&edit=edit-me');
    expect(recipeDeepLinkFromSearch(params)).toEqual({ mode: 'edit', id: 'edit-me' });
  });

  it('reads an open view link', () => {
    const params = new URLSearchParams('open=view-me');
    expect(recipeDeepLinkFromSearch(params)).toEqual({ mode: 'view', id: 'view-me' });
  });

  it('ignores blank params', () => {
    expect(recipeDeepLinkFromSearch(new URLSearchParams('open=&edit=  '))).toBeNull();
    expect(recipeDeepLinkFromSearch(new URLSearchParams())).toBeNull();
  });
});
