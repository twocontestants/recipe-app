import { recipeSlug } from './recipeSlug';

export type RecipeDeepLink = { mode: 'view' | 'edit'; id: string };

export function recipeViewPath(id: string, title?: string | null): string {
  const idPart = encodeURIComponent(id);
  if (title === undefined || title === null) return `/recipes/${idPart}`;
  return `/recipes/${idPart}/${recipeSlug(title)}`;
}

export function recipeEditPath(id: string, title?: string | null): string {
  return `${recipeViewPath(id, title)}?edit=1`;
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

export function recipeLegacyListRedirect(
  params: { get(name: string): string | null },
): string | null {
  const link = recipeDeepLinkFromSearch(params);
  if (!link) return null;
  return link.mode === 'edit' ? recipeEditPath(link.id) : recipeViewPath(link.id);
}

export function recipeLegacyListRedirectFromQuery(
  query: Record<string, string | string[] | undefined>,
): string | null {
  const first = (key: string) => {
    const value = query[key];
    return (Array.isArray(value) ? value[0] : value)?.trim() || '';
  };
  const params = new URLSearchParams();
  const edit = first('edit');
  const open = first('open');
  if (edit) params.set('edit', edit);
  if (open) params.set('open', open);
  return recipeLegacyListRedirect(params);
}

export function recipeWantsEdit(
  params: { get(name: string): string | null },
): boolean {
  const value = params.get('edit')?.trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}
