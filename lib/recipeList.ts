export function recipeListQueryString(opts: { includePublic: boolean }): string {
  return opts.includePublic ? '?includePublic=1' : '';
}

export function hasRecipeMethod(recipe: { ingredients?: unknown; steps?: unknown }): boolean {
  return Array.isArray(recipe.ingredients) && Array.isArray(recipe.steps);
}

export function upsertRecipeInList<T extends { id: string }>(list: T[], recipe: T): T[] {
  const index = list.findIndex(item => item.id === recipe.id);
  if (index === -1) return [recipe, ...list];
  const next = list.slice();
  next[index] = recipe;
  return next;
}

export function removeRecipeFromList<T extends { id: string }>(list: T[], id: string): T[] {
  return list.filter(item => item.id !== id);
}
