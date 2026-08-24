import { canPublishOwn, isModerator, type Role } from './roles';

export type Visibility = 'private' | 'public';

export type RecipeListMode = 'guest' | 'owned' | 'ownedPlusPublic';

export interface RecipeAccess {
  owner_id: string;
  visibility: Visibility;
}

export interface Viewer {
  id: string;
  role: Role;
}

export function parseVisibility(value: unknown): Visibility {
  return value === 'public' ? 'public' : 'private';
}

export function canViewRecipe(viewer: Viewer | null, recipe: RecipeAccess): boolean {
  if (recipe.visibility === 'public') return true;
  return viewer?.id === recipe.owner_id;
}

export function canEditRecipe(viewer: Viewer | null, recipe: RecipeAccess): boolean {
  return !!viewer && viewer.id === recipe.owner_id;
}

export function canPublishRecipe(viewer: Viewer | null, recipe: RecipeAccess): boolean {
  return !!viewer && viewer.id === recipe.owner_id && canPublishOwn(viewer.role);
}

export function canUnpublishRecipe(viewer: Viewer | null, recipe: RecipeAccess): boolean {
  if (!viewer) return false;
  if (isModerator(viewer.role) && recipe.visibility === 'public') return true;
  return canPublishRecipe(viewer, recipe);
}

export function canPlanRecipe(viewer: Viewer | null, recipe: RecipeAccess): boolean {
  return !!viewer && canViewRecipe(viewer, recipe);
}

export function recipeListMode(opts: {
  signedIn: boolean;
  includePublic?: boolean;
  ownedOnly?: boolean;
}): RecipeListMode {
  if (!opts.signedIn) return 'guest';
  if (opts.ownedOnly) return 'owned';
  if (opts.includePublic) return 'ownedPlusPublic';
  return 'owned';
}

export function recipeMatchesList(
  recipe: RecipeAccess,
  viewerId: string | null,
  mode: RecipeListMode,
): boolean {
  if (mode === 'guest') return recipe.visibility === 'public';
  if (mode === 'owned') return recipe.owner_id === viewerId;
  return recipe.owner_id === viewerId || recipe.visibility === 'public';
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
