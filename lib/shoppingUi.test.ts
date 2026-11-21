import { describe, expect, it } from 'vitest';
import {
  categoryTheme,
  formatRecipeSourceLabel,
  progressBarInset,
  shoppingProgress,
} from './shoppingUi';

describe('shoppingProgress', () => {
  it('formats a fraction and percent for the pinned bar', () => {
    expect(shoppingProgress(4, 14)).toEqual({
      checked: 4,
      total: 14,
      percent: 29,
      label: '4 / 14 items',
    });
  });

  it('is empty when the list has no lines', () => {
    expect(shoppingProgress(0, 0)).toEqual({
      checked: 0,
      total: 0,
      percent: 0,
      label: '0 / 0 items',
    });
  });

  it('does not let checked exceed total', () => {
    expect(shoppingProgress(9, 3).checked).toBe(3);
    expect(shoppingProgress(9, 3).percent).toBe(100);
  });
});

describe('formatRecipeSourceLabel', () => {
  it('joins several recipes with a midpoint dot', () => {
    expect(formatRecipeSourceLabel(['Stir Fry', 'Breakfast'])).toBe('Stir Fry • Breakfast');
  });

  it('says All recipes when the line is used by every meal on the list', () => {
    expect(formatRecipeSourceLabel(
      ['Thai Curry', 'Stir Fry', 'Breakfast'],
      ['Breakfast', 'Stir Fry', 'Thai Curry'],
    )).toBe('All recipes');
  });

  it('keeps the names when the list has only one recipe', () => {
    expect(formatRecipeSourceLabel(['Stir Fry'], ['Stir Fry'])).toBe('Stir Fry');
  });

  it('drops blanks and repeats', () => {
    expect(formatRecipeSourceLabel(['Stir Fry', '', 'Stir Fry', 'Breakfast'])).toBe('Stir Fry • Breakfast');
  });

  it('is empty when no recipe titles are left', () => {
    expect(formatRecipeSourceLabel(['', '  '])).toBe('');
  });
});

describe('categoryTheme', () => {
  it('maps known aisles to pastel theme keys', () => {
    expect(categoryTheme('Meat & Seafood').key).toBe('meat');
    expect(categoryTheme('Dairy').key).toBe('dairy');
    expect(categoryTheme('Pantry').key).toBe('pantry');
    expect(categoryTheme('Fruit & Veg').key).toBe('produce');
    expect(categoryTheme('Spices').key).toBe('spices');
    expect(categoryTheme('Bakery').key).toBe('bakery');
  });

  it('falls back for a custom aisle', () => {
    expect(categoryTheme('Hardware').key).toBe('other');
  });
});

describe('progressBarInset', () => {
  it('clears the desktop sidebar and pins to the top', () => {
    expect(progressBarInset(1280)).toEqual({ top: 0, left: 220 });
  });

  it('sits under the tablet top nav', () => {
    expect(progressBarInset(800)).toEqual({ top: 52, left: 0 });
  });

  it('pins to the viewport top on a phone (tabs are at the bottom)', () => {
    expect(progressBarInset(390)).toEqual({ top: 0, left: 0 });
  });
});
