export type RecipeDeepLink = { mode: 'view' | 'edit'; id: string };

export function recipeViewPath(id: string): string {
  return `/recipes?open=${encodeURIComponent(id)}`;
}

export function recipeEditPath(id: string): string {
  return `/recipes?edit=${encodeURIComponent(id)}`;
}

export function recipeDeepLinkFromSearch(
  params: { get(name: string): string | null },
): RecipeDeepLink | null {
  const editId = params.get('edit')?.trim();
  if (editId) return { mode: 'edit', id: editId };
  const openId = params.get('open')?.trim();
  if (openId) return { mode: 'view', id: openId };
  return null;
}
