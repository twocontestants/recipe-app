import { describe, expect, it } from 'vitest';
import {
  recipeDeepLinkFromSearch,
  recipeEditPath,
  recipeLegacyListRedirect,
  recipeLegacyListRedirectFromQuery,
  recipeViewPath,
  recipeWantsEdit,
} from './recipeLinks';

describe('recipeLinks', () => {
  it('builds a dedicated view path from a recipe id', () => {
    expect(recipeViewPath('abc-123')).toBe('/recipes/abc-123');
  });

  it('appends a safe short name when a title is known', () => {
    expect(recipeViewPath('abc-123', 'Tomato Soup')).toBe('/recipes/abc-123/tomato-soup');
    expect(recipeEditPath('abc-123', 'Tomato Soup')).toBe('/recipes/abc-123/tomato-soup?edit=1');
  });

  it('never puts markup or schemes into the path', () => {
    expect(recipeViewPath('abc-123', '<script>alert(1)</script>')).toBe('/recipes/abc-123/alert-1');
    expect(recipeViewPath('abc-123', 'javascript:alert(1)')).toBe('/recipes/abc-123/alert-1');
    expect(recipeViewPath('abc-123', '"><img src=x onerror=alert(1)>')).toBe('/recipes/abc-123/recipe');
    expect(recipeViewPath('abc-123', '<script>alert(1)</script>')).not.toContain('<');
    expect(recipeViewPath('abc-123', '<script>alert(1)</script>')).not.toContain('>');
  });

  it('builds a dedicated edit path from a recipe id', () => {
    expect(recipeEditPath('abc-123')).toBe('/recipes/abc-123?edit=1');
  });

  it('encodes ids that need it', () => {
    expect(recipeViewPath('a b')).toBe('/recipes/a%20b');
    expect(recipeEditPath('a&b')).toBe('/recipes/a%26b?edit=1');
  });

  it('maps leftover list query params to the dedicated recipe page', () => {
    expect(recipeLegacyListRedirect(new URLSearchParams('open=view-me'))).toBe('/recipes/view-me');
    expect(recipeLegacyListRedirect(new URLSearchParams('edit=edit-me'))).toBe('/recipes/edit-me?edit=1');
    expect(recipeLegacyListRedirect(new URLSearchParams('open=view-me&edit=edit-me'))).toBe('/recipes/edit-me?edit=1');
    expect(recipeLegacyListRedirect(new URLSearchParams())).toBeNull();
    expect(recipeLegacyListRedirectFromQuery({ open: 'view-me' })).toBe('/recipes/view-me');
    expect(recipeLegacyListRedirectFromQuery({ edit: ['edit-me'] })).toBe('/recipes/edit-me?edit=1');
    expect(recipeLegacyListRedirectFromQuery({})).toBeNull();
  });

  it('reads edit over open from leftover list search params', () => {
    const params = new URLSearchParams('open=view-me&edit=edit-me');
    expect(recipeDeepLinkFromSearch(params)).toEqual({ mode: 'edit', id: 'edit-me' });
  });

  it('reads an open view link from leftover list search params', () => {
    const params = new URLSearchParams('open=view-me');
    expect(recipeDeepLinkFromSearch(params)).toEqual({ mode: 'view', id: 'view-me' });
  });

  it('ignores blank leftover list params', () => {
    expect(recipeDeepLinkFromSearch(new URLSearchParams('open=&edit=  '))).toBeNull();
    expect(recipeDeepLinkFromSearch(new URLSearchParams())).toBeNull();
  });

  it('treats edit=1 as open-the-editor', () => {
    expect(recipeWantsEdit(new URLSearchParams('edit=1'))).toBe(true);
    expect(recipeWantsEdit(new URLSearchParams('edit=true'))).toBe(true);
    expect(recipeWantsEdit(new URLSearchParams())).toBe(false);
    expect(recipeWantsEdit(new URLSearchParams('edit=edit-me'))).toBe(false);
  });
});
