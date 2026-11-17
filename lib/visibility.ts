import type { Role } from './roles';

/** Recipes are always private to their owner. Column may still exist as 'private'. */
export type Visibility = 'private';

export type RecipeListMode = 'owned';

export interface RecipeAccess {
  owner_id: string;
  visibility: Visibility;
}

export interface Viewer {
  id: string;
  role: Role;
}

export function parseVisibility(_value: unknown): Visibility {
  return 'private';
}

export function canViewRecipe(viewer: Viewer | null, recipe: RecipeAccess): boolean {
  return !!viewer && viewer.id === recipe.owner_id;
}

export function canEditRecipe(viewer: Viewer | null, recipe: RecipeAccess): boolean {
  return !!viewer && viewer.id === recipe.owner_id;
}

export function canPlanRecipe(viewer: Viewer | null, recipe: RecipeAccess): boolean {
  return !!viewer && canViewRecipe(viewer, recipe);
}

export function recipeListMode(opts: { signedIn: boolean }): RecipeListMode | null {
  return opts.signedIn ? 'owned' : null;
}

export function recipeMatchesList(
  recipe: RecipeAccess,
  viewerId: string | null,
  mode: RecipeListMode,
): boolean {
  if (mode !== 'owned' || !viewerId) return false;
  return recipe.owner_id === viewerId;
}

/** Fields copied into a personal duplicate. Always private; owner is the copier. */
export function duplicateRecipeFields<T extends Record<string, unknown>>(recipe: T): {
  title: unknown;
  description: unknown;
  source_url: unknown;
  image_url: unknown;
  servings: unknown;
  prep_time: unknown;
  cook_time: unknown;
  ingredients: unknown;
  steps: unknown;
  tags: unknown;
  primary_protein: unknown;
  visibility: 'private';
} {
  return {
    title: recipe.title,
    description: recipe.description,
    source_url: recipe.source_url,
    image_url: recipe.image_url,
    servings: recipe.servings,
    prep_time: recipe.prep_time,
    cook_time: recipe.cook_time,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    tags: recipe.tags,
    primary_protein: recipe.primary_protein,
    visibility: 'private',
  };
}
