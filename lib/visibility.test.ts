import { describe, expect, it } from 'vitest';
import {
  canEditRecipe,
  canPlanRecipe,
  canPublishRecipe,
  canUnpublishRecipe,
  canViewRecipe,
  duplicateRecipeFields,
  recipeListMode,
  recipeMatchesList,
} from './visibility';

const moderator = { id: 'mod-1', role: 'moderator' as const };
const cook = { id: 'cook-1', role: 'cook' as const };
const publisher = { id: 'pub-1', role: 'publisher' as const };

const ownerPublic = { owner_id: 'mod-1', visibility: 'public' as const };
const ownerPrivate = { owner_id: 'mod-1', visibility: 'private' as const };
const cookPrivate = { owner_id: 'cook-1', visibility: 'private' as const };

describe('recipe visibility', () => {
  it('lets anyone view public recipes and only the owner view private ones', () => {
    expect(canViewRecipe(null, ownerPublic)).toBe(true);
    expect(canViewRecipe(cook, ownerPublic)).toBe(true);
    expect(canViewRecipe(null, ownerPrivate)).toBe(false);
    expect(canViewRecipe(cook, ownerPrivate)).toBe(false);
    expect(canViewRecipe(moderator, ownerPrivate)).toBe(true);
    expect(canViewRecipe(cook, cookPrivate)).toBe(true);
  });

  it('lets only the owner edit contents', () => {
    expect(canEditRecipe(cook, ownerPublic)).toBe(false);
    expect(canEditRecipe(moderator, ownerPublic)).toBe(true);
    expect(canEditRecipe(null, ownerPublic)).toBe(false);
  });

  it('lets only publishers and moderators publish their own recipes', () => {
    expect(canPublishRecipe(cook, cookPrivate)).toBe(false);
    expect(canPublishRecipe(publisher, { owner_id: 'pub-1', visibility: 'private' })).toBe(true);
    expect(canPublishRecipe(moderator, ownerPrivate)).toBe(true);
    expect(canPublishRecipe(publisher, ownerPrivate)).toBe(false);
  });

  it('lets a moderator unpublish anyone’s public recipe', () => {
    expect(canUnpublishRecipe(moderator, ownerPublic)).toBe(true);
    expect(canUnpublishRecipe(cook, ownerPublic)).toBe(false);
    expect(canUnpublishRecipe(publisher, { owner_id: 'pub-1', visibility: 'public' })).toBe(true);
  });

  it('requires sign-in to plan a viewable recipe', () => {
    expect(canPlanRecipe(null, ownerPublic)).toBe(false);
    expect(canPlanRecipe(cook, ownerPublic)).toBe(true);
    expect(canPlanRecipe(cook, ownerPrivate)).toBe(false);
  });
});

describe('recipe list filters', () => {
  it('uses guest / owned / ownedPlusPublic modes from query flags', () => {
    expect(recipeListMode({ signedIn: false })).toBe('guest');
    expect(recipeListMode({ signedIn: true })).toBe('owned');
    expect(recipeListMode({ signedIn: true, includePublic: true })).toBe('ownedPlusPublic');
    expect(recipeListMode({ signedIn: true, includePublic: true, ownedOnly: true })).toBe('owned');
  });

  it('matches recipes for each list mode', () => {
    expect(recipeMatchesList(ownerPublic, null, 'guest')).toBe(true);
    expect(recipeMatchesList(ownerPrivate, null, 'guest')).toBe(false);
    expect(recipeMatchesList(cookPrivate, 'cook-1', 'owned')).toBe(true);
    expect(recipeMatchesList(ownerPublic, 'cook-1', 'owned')).toBe(false);
    expect(recipeMatchesList(ownerPublic, 'cook-1', 'ownedPlusPublic')).toBe(true);
    expect(recipeMatchesList(ownerPrivate, 'cook-1', 'ownedPlusPublic')).toBe(false);
  });
});

describe('duplicate fields', () => {
  it('copies kitchen fields and forces private visibility without keeping the original owner', () => {
    const copy = duplicateRecipeFields({
      id: 'orig',
      owner_id: 'mod-1',
      visibility: 'public',
      title: 'Pie',
      description: 'Nice',
      source_url: 'https://example.com',
      image_url: null,
      servings: 4,
      prep_time: 10,
      cook_time: 40,
      ingredients: [{ name: 'flour', amount: '1', unit: 'cup' }],
      steps: ['Mix'],
      tags: ['bake'],
      primary_protein: null,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    });
    expect(copy.visibility).toBe('private');
    expect(copy.title).toBe('Pie');
    expect(copy.ingredients).toEqual([{ name: 'flour', amount: '1', unit: 'cup' }]);
    expect(copy).not.toHaveProperty('owner_id');
    expect(copy).not.toHaveProperty('id');
  });
});
