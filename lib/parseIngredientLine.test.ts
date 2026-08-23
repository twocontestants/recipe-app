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
});
