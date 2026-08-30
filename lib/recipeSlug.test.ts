import { describe, expect, it } from 'vitest';
import { isSafeRecipeSlug, recipeSlug } from './recipeSlug';

describe('recipeSlug', () => {
  it('shortens a normal title to lowercase hyphenated words', () => {
    expect(recipeSlug('Tomato Soup')).toBe('tomato-soup');
    expect(recipeSlug('Chicken Tikka Masala')).toBe('chicken-tikka-masala');
  });

  it('strips accents so the url stays ascii', () => {
    expect(recipeSlug('Crème Brûlée')).toBe('creme-brulee');
  });

  it('drops markup and never keeps angle brackets or quotes', () => {
    expect(recipeSlug('<script>alert(1)</script>')).toBe('alert-1');
    expect(recipeSlug('"><img src=x onerror=alert(1)>')).toBe('recipe');
    expect(recipeSlug('<svg onload=alert(1)>')).toBe('recipe');
    for (const title of [
      '<script>alert(1)</script>',
      '"><img src=x onerror=alert(1)>',
      '<svg onload=alert(1)>',
      "javascript:alert('xss')",
      '../../etc/passwd',
      '%3Cscript%3Ealert(1)%3C/script%3E',
    ]) {
      const slug = recipeSlug(title);
      expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(slug).not.toMatch(/[<>"'`/\\:]/);
      expect(slug).not.toContain('javascript');
    }
  });

  it('turns a javascript url into a plain path token, not a scheme', () => {
    expect(recipeSlug('javascript:alert(1)')).toBe('alert-1');
  });

  it('collapses punctuation and path tricks', () => {
    expect(recipeSlug('../../etc/passwd')).toBe('etc-passwd');
    expect(recipeSlug('Fish & Chips')).toBe('fish-chips');
    expect(recipeSlug('  Sunday  Roast  ')).toBe('sunday-roast');
  });

  it('clips long names at a word boundary', () => {
    const slug = recipeSlug('Grandmother’s Very Famous Overnight Breakfast Casserole With Extra Cheese');
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(slug.startsWith('grandmother')).toBe(true);
    expect(slug.endsWith('-')).toBe(false);
  });

  it('falls back when nothing safe remains', () => {
    expect(recipeSlug('')).toBe('recipe');
    expect(recipeSlug('你好')).toBe('recipe');
    expect(recipeSlug('!!!')).toBe('recipe');
  });
});

describe('isSafeRecipeSlug', () => {
  it('accepts only generated-style tokens', () => {
    expect(isSafeRecipeSlug('tomato-soup')).toBe(true);
    expect(isSafeRecipeSlug('recipe')).toBe(true);
  });

  it('rejects anything that could be markup, a path, or a scheme', () => {
    expect(isSafeRecipeSlug('<script>')).toBe(false);
    expect(isSafeRecipeSlug('Tomato-Soup')).toBe(false);
    expect(isSafeRecipeSlug('../etc')).toBe(false);
    expect(isSafeRecipeSlug('foo/bar')).toBe(false);
    expect(isSafeRecipeSlug('javascript:alert')).toBe(false);
    expect(isSafeRecipeSlug('')).toBe(false);
    expect(isSafeRecipeSlug('tomato--soup')).toBe(false);
    expect(isSafeRecipeSlug('-soup')).toBe(false);
  });
});
