import { describe, expect, it } from 'vitest';
import { EMPTY_RECIPE_FORM } from './recipeForm';
import {
  appendParsedIngredients,
  appendParsedSteps,
  ingredientPasteFromClipboard,
  insertParsedIngredients,
  parseIngredientBlock,
  parseStepBlock,
  retagRecipeForm,
  stepPasteFromClipboard,
} from './recipeBulkPaste';

describe('parseIngredientBlock', () => {
  it('splits a pasted list into amount, unit, and name rows', () => {
    expect(parseIngredientBlock(`
Ingredients:
2 cups flour
1 tsp salt
3 eggs
`)).toEqual([
      { amount: '2', unit: 'cups', name: 'flour' },
      { amount: '1', unit: 'tsp', name: 'salt' },
      { amount: '3', unit: '', name: 'eggs' },
    ]);
  });

  it('reads tab-separated columns from a spreadsheet paste', () => {
    expect(parseIngredientBlock('500\tg\tchicken thighs\n1\ttsp\tchilli flakes')).toEqual([
      { amount: '500', unit: 'g', name: 'chicken thighs' },
      { amount: '1', unit: 'tsp', name: 'chilli flakes' },
    ]);
  });
});

describe('parseStepBlock', () => {
  it('splits a numbered method into separate steps', () => {
    expect(parseStepBlock(`
Method:
1. Preheat the oven to 200C.
2. Season the chicken.
3. Roast for 25 minutes.
`)).toEqual([
      'Preheat the oven to 200C.',
      'Season the chicken.',
      'Roast for 25 minutes.',
    ]);
  });

  it('keeps a wrapped paragraph as one step', () => {
    expect(parseStepBlock(
      'Preheat the oven to 180C and line a large baking tray\nwith baking paper so nothing sticks.',
    )).toEqual([
      'Preheat the oven to 180C and line a large baking tray with baking paper so nothing sticks.',
    ]);
  });

  it('splits an inline numbered list pasted as one line', () => {
    expect(parseStepBlock('1. Mix the flour. 2. Add the eggs. 3. Bake until golden.')).toEqual([
      'Mix the flour.',
      'Add the eggs.',
      'Bake until golden.',
    ]);
  });
});

describe('clipboard paste detection', () => {
  it('treats a multi-line ingredient paste as bulk', () => {
    const parsed = ingredientPasteFromClipboard('2 cups flour\n1 tsp salt', {
      amount: '',
      unit: '',
      name: '',
    });
    expect(parsed).toHaveLength(2);
  });

  it('fills amount and unit when a structured line is pasted into an empty row', () => {
    expect(ingredientPasteFromClipboard('2 cups flour', { amount: '', unit: '', name: '' })).toEqual([
      { amount: '2', unit: 'cups', name: 'flour' },
    ]);
  });

  it('leaves ordinary name edits to native paste', () => {
    expect(ingredientPasteFromClipboard('garlic', { amount: '1', unit: 'clove', name: '' })).toBeNull();
  });

  it('treats a numbered method as bulk steps', () => {
    expect(stepPasteFromClipboard('1. Mix well.\n2. Bake until golden.')).toEqual([
      'Mix well.',
      'Bake until golden.',
    ]);
  });

  it('does not hijack a single step sentence', () => {
    expect(stepPasteFromClipboard('Preheat the oven to 180C.')).toBeNull();
  });
});

describe('inserting parsed rows', () => {
  it('replaces the blank starter row', () => {
    expect(insertParsedIngredients(
      [{ amount: '', unit: '', name: '' }],
      0,
      [{ amount: '2', unit: 'cups', name: 'flour' }],
    )).toEqual([{ amount: '2', unit: 'cups', name: 'flour' }]);
  });

  it('appends a paste-list after existing filled rows', () => {
    expect(appendParsedIngredients(
      [{ amount: '1', unit: '', name: 'onion' }],
      [{ amount: '2', unit: '', name: 'carrots' }],
    )).toEqual([
      { amount: '1', unit: '', name: 'onion' },
      { amount: '2', unit: '', name: 'carrots' },
    ]);
  });

  it('keeps a filled step and inserts the pasted list after it', () => {
    expect(appendParsedSteps(['Brown the mince.'], ['Add tomatoes.', 'Simmer 20 minutes.'])).toEqual([
      'Brown the mince.',
      'Add tomatoes.',
      'Simmer 20 minutes.',
    ]);
  });
});

describe('retagRecipeForm', () => {
  it('fills protein and cooking tags from pasted ingredients and steps', () => {
    const tagged = retagRecipeForm({
      ...EMPTY_RECIPE_FORM,
      title: 'Tray chicken',
      ingredients: [
        { amount: '500', unit: 'g', name: 'chicken thighs' },
        { amount: '1', unit: 'tsp', name: 'chilli flakes' },
      ],
      steps: ['Preheat the oven to 200C.', 'Roast for 25 minutes.'],
    });
    expect(tagged.primary_protein).toBe('chicken');
    expect(tagged.tags).toEqual(expect.arrayContaining(['spicy', 'oven', 'roast']));
  });

  it('does not overwrite a protein the cook already chose', () => {
    const tagged = retagRecipeForm({
      ...EMPTY_RECIPE_FORM,
      primary_protein: 'beef',
      ingredients: [{ amount: '2', unit: '', name: 'chicken breasts' }],
      steps: ['Grill until cooked through.'],
    });
    expect(tagged.primary_protein).toBe('beef');
    expect(tagged.tags).toContain('grill');
  });
});
