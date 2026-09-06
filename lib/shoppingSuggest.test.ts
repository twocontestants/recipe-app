import { describe, expect, it } from 'vitest';
import { ingredientSuggestions, prettyIngredientLabel } from './shoppingSuggest';

describe('prettyIngredientLabel', () => {
  it('capitalises a dictionary name', () => {
    expect(prettyIngredientLabel('onion')).toBe('Onion');
    expect(prettyIngredientLabel('olive oil')).toBe('Olive oil');
  });

  it('keeps a name that already has capitals', () => {
    expect(prettyIngredientLabel('Large onion, diced')).toBe('Large onion, diced');
  });
});

describe('ingredientSuggestions', () => {
  const catalog = ['onion', 'red onion', 'olive oil', 'Onion', 'black pepper', 'tape'];

  it('returns nothing until the cook has typed something', () => {
    expect(ingredientSuggestions('', catalog)).toEqual([]);
    expect(ingredientSuggestions('  ', catalog)).toEqual([]);
  });

  it('ranks a starts-with match ahead of a later word', () => {
    expect(ingredientSuggestions('oni', catalog)[0]).toBe('Onion');
  });

  it('matches a word inside a longer name', () => {
    expect(ingredientSuggestions('pep', catalog)).toContain('Black pepper');
  });

  it('collapses duplicate casing and respects the limit', () => {
    const names = ingredientSuggestions('o', catalog, 3);
    expect(names.filter(n => n.toLowerCase() === 'onion')).toHaveLength(1);
    expect(names).toHaveLength(3);
  });
});
