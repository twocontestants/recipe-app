const MAX_SLUG_LENGTH = 40;
const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function clipSlug(slug: string): string {
  if (slug.length <= MAX_SLUG_LENGTH) return slug;
  const cut = slug.slice(0, MAX_SLUG_LENGTH);
  const lastHyphen = cut.lastIndexOf('-');
  const clipped = lastHyphen >= 12 ? cut.slice(0, lastHyphen) : cut;
  return clipped.replace(/-+$/g, '');
}

export function recipeSlug(title: unknown): string {
  const raw = typeof title === 'string' ? title : '';
  const noTags = raw.replace(/<[^>]*>/g, ' ');
  const noSchemes = noTags.replace(/(?:javascript|data|vbscript)\s*:/gi, ' ');
  const ascii = noSchemes
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return clipSlug(ascii) || 'recipe';
}

export function isSafeRecipeSlug(slug: unknown): boolean {
  if (typeof slug !== 'string') return false;
  if (slug.length === 0 || slug.length > MAX_SLUG_LENGTH) return false;
  return SAFE_SLUG.test(slug);
}
