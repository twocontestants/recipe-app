import { describe, expect, it } from 'vitest';
import { parseIngredientLine } from './scraper';

describe('parseIngredientLine', () => {
  it('drops the leading comma WP Recipe Maker puts inside note parens', () => {
    const ing = parseIngredientLine(
      '1 scallion/shallot stem (, green and white part separated, both finely sliced (Note 2))'
    );
    expect(ing.amount).toBe('1');
    expect(ing.unit).toBe('');
    expect(ing.name).toBe(
      'scallion/shallot stem (green and white part separated, both finely sliced (Note 2))'
    );
  });

  it('cleans the same leftover on lines without a leading amount', () => {
    const ing = parseIngredientLine(
      'sliced beef (, any good quality tender cut suitable for grilling (Note 1))'
    );
    expect(ing.name).toBe(
      'sliced beef (any good quality tender cut suitable for grilling (Note 1))'
    );
  });

  it('cleans a short prep note that starts with a comma', () => {
    const ing = parseIngredientLine('1/2 medium carrot (, peeled, cut vertically then into batons)');
    expect(ing.amount).toBe('1/2');
    expect(ing.name).toBe('medium carrot (peeled, cut vertically then into batons)');
  });

  it('decodes an apostrophe written as an HTML entity', () => {
    const ing = parseIngredientLine('1 tsp chef&#39;s salt');
    expect(ing.amount).toBe('1');
    expect(ing.unit).toBe('tsp');
    expect(ing.name).toBe("chef's salt");
  });

  it('keeps 1½ as the amount and teaspoon as the unit', () => {
    const ing = parseIngredientLine('1½ teaspoon smoked paprika');
    expect(ing.amount).toBe('1½');
    expect(ing.unit).toBe('teaspoon');
    expect(ing.name).toBe('smoked paprika');
  });

  it('reads a quantity range and a dual metric/imperial weight', () => {
    expect(parseIngredientLine('1-3 teaspoons paprika')).toMatchObject({
      amount: '1-3', unit: 'teaspoons', name: 'paprika',
    });
    expect(parseIngredientLine('500g/1lb chicken')).toMatchObject({
      amount: '500', unit: 'g', name: 'chicken',
    });
  });
});
