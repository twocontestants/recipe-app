import { describe, expect, it } from 'vitest';
import {
  canEditRecipe,
  canPlanRecipe,
  canViewRecipe,
  duplicateRecipeFields,
  parseVisibility,
  recipeListMode,
  recipeMatchesList,
} from './visibility';

const cook = { id: 'cook-1', role: 'cook' as const };
const moderator = { id: 'mod-1', role: 'moderator' as const };
const ownerPrivate = { owner_id: 'mod-1', visibility: 'private' as const };
const cookPrivate = { owner_id: 'cook-1', visibility: 'private' as const };

describe('recipe visibility', () => {
  it('treats every stored value as private', () => {
    expect(parseVisibility('public')).toBe('private');
    expect(parseVisibility('private')).toBe('private');
    expect(parseVisibility(null)).toBe('private');
  });

  it('lets only the owner view a recipe', () => {
    expect(canViewRecipe(null, ownerPrivate)).toBe(false);
    expect(canViewRecipe(cook, ownerPrivate)).toBe(false);
    expect(canViewRecipe(moderator, ownerPrivate)).toBe(true);
    expect(canViewRecipe(cook, cookPrivate)).toBe(true);
  });

  it('lets only the owner edit', () => {
    expect(canEditRecipe(cook, ownerPrivate)).toBe(false);
    expect(canEditRecipe(moderator, ownerPrivate)).toBe(true);
    expect(canEditRecipe(null, ownerPrivate)).toBe(false);
  });

  it('lets a signed-in owner plan their recipe and blocks guests', () => {
    expect(canPlanRecipe(null, cookPrivate)).toBe(false);
    expect(canPlanRecipe(cook, cookPrivate)).toBe(true);
    expect(canPlanRecipe(cook, ownerPrivate)).toBe(false);
  });

  it('lists only owned recipes when signed in', () => {
    expect(recipeListMode({ signedIn: false })).toBeNull();
    expect(recipeListMode({ signedIn: true })).toBe('owned');
    expect(recipeMatchesList(cookPrivate, 'cook-1', 'owned')).toBe(true);
    expect(recipeMatchesList(ownerPrivate, 'cook-1', 'owned')).toBe(false);
  });

  it('copies kitchen fields and forces private visibility without keeping the original owner', () => {
    const copy = duplicateRecipeFields({
      title: 'Pie',
      description: 'Good',
      source_url: 'https://example.com',
      image_url: null,
      servings: 4,
      prep_time: 10,
      cook_time: 20,
      ingredients: [],
      steps: [],
      tags: ['dessert'],
      primary_protein: null,
      visibility: 'public',
      owner_id: 'someone-else',
    });
    expect(copy.title).toBe('Pie');
    expect(copy.visibility).toBe('private');
    expect(copy).not.toHaveProperty('owner_id');
  });
});
