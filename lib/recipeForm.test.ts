import { describe, expect, it } from 'vitest';
import type { Recipe } from './db';
import { EMPTY_RECIPE_FORM, emptyRecipeForm, recipeFormPayload, recipeToForm } from './recipeForm';

const recipe: Recipe = {
  id: 'r1',
  title: 'Soup',
  description: 'Warm',
  source_url: 'https://example.com',
  image_url: '',
  servings: 2,
  prep_time: 10,
  cook_time: 20,
  ingredients: [{ amount: '1', unit: 'can', name: 'tomatoes' }, { amount: '', unit: '', name: '  ' }],
  steps: ['Heat', ''],
  tags: ['soup'],
  primary_protein: 'vegetables',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  owner_id: 'u1',
  visibility: 'private',
};

describe('recipeForm', () => {
  it('copies a recipe into the editor form', () => {
    expect(recipeToForm(recipe)).toMatchObject({
      title: 'Soup',
      description: 'Warm',
      servings: 2,
      prep_time: 10,
      cook_time: 20,
      tags: ['soup'],
      primary_protein: 'vegetables',
    });
  });

  it('drops blank ingredient and step rows on save', () => {
    const payload = recipeFormPayload(recipeToForm(recipe));
    expect(payload.ingredients).toEqual([{ amount: '1', unit: 'can', name: 'tomatoes' }]);
    expect(payload.steps).toEqual(['Heat']);
  });

  it('starts a new recipe with one empty ingredient and step', () => {
    expect(EMPTY_RECIPE_FORM.ingredients).toHaveLength(1);
    expect(EMPTY_RECIPE_FORM.steps).toEqual(['']);
    const fresh = emptyRecipeForm();
    expect(fresh.ingredients).not.toBe(EMPTY_RECIPE_FORM.ingredients);
    expect(fresh.steps).not.toBe(EMPTY_RECIPE_FORM.steps);
  });
});
