import { describe, expect, it } from 'vitest';
import {
  ingredientGroupHeading,
  ingredientSections,
  mergeGroupedIngredients,
} from './ingredientGroups';

describe('ingredientGroupHeading', () => {
  it('reads a colon label and a common subheading', () => {
    expect(ingredientGroupHeading('Chili Spice Mix:')).toBe('Chili Spice Mix');
    expect(ingredientGroupHeading('For the sauce:')).toBe('For the sauce');
    expect(ingredientGroupHeading('To Serve')).toBe('To Serve');
    expect(ingredientGroupHeading('To Garnish')).toBe('To Garnish');
  });

  it('leaves real ingredient lines alone', () => {
    expect(ingredientGroupHeading('1 tbsp olive oil')).toBeNull();
    expect(ingredientGroupHeading('olive oil')).toBeNull();
    expect(ingredientGroupHeading('Ingredients:')).toBeNull();
    expect(ingredientGroupHeading('For the sauce: simmer until thick.')).toBeNull();
  });
});

describe('ingredientSections', () => {
  it('keeps ungrouped lines and splits when the heading changes', () => {
    const sections = ingredientSections([
      { amount: '1', unit: '', name: 'duck' },
      { amount: '1', unit: '', name: 'celeriac', group: 'Celeriac Puree' },
      { amount: '', unit: '', name: 'salt and pepper' },
      { amount: '8', unit: '', name: 'orange segments', group: 'To Garnish' },
    ]);
    expect(sections.map(section => [section.heading, section.items.map(item => item.name)])).toEqual([
      [null, ['duck']],
      ['Celeriac Puree', ['celeriac']],
      [null, ['salt and pepper']],
      ['To Garnish', ['orange segments']],
    ]);
  });
});

describe('mergeGroupedIngredients', () => {
  it('keeps schema wording when the lists are the same length', () => {
    const merged = mergeGroupedIngredients(
      [
        { amount: '1', unit: 'tbsp', name: 'olive oil' },
        { amount: '4', unit: 'tsp', name: 'paprika powder (Note 2)' },
      ],
      [
        { amount: '1', unit: 'tbsp', name: 'olive oil' },
        { amount: '4', unit: 'tsp', name: 'paprika powder', group: 'Chili Spice Mix' },
      ],
      true,
    );
    expect(merged).toEqual([
      { amount: '1', unit: 'tbsp', name: 'olive oil' },
      { amount: '4', unit: 'tsp', name: 'paprika powder (Note 2)', group: 'Chili Spice Mix' },
    ]);
  });

  it('uses the grouped list when the flat schema list dropped whole sections', () => {
    const merged = mergeGroupedIngredients(
      [{ amount: '1', unit: '', name: 'celeriac' }],
      [
        { amount: '1', unit: '', name: 'whole duck' },
        { amount: '1', unit: '', name: 'celeriac', group: 'Celeriac Puree' },
      ],
      true,
    );
    expect(merged.map(ing => ing.name)).toEqual(['whole duck', 'celeriac']);
    expect(merged[1].group).toBe('Celeriac Puree');
  });
});
