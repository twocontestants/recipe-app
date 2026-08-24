export const SHOPPING_LIST_META_COLUMNS = [
  'id',
  'name',
  'subtitle',
  'generated_at',
  'recipe_ids',
] as const;

export type ShoppingListMeta = {
  id: string;
  name: string;
  subtitle: string;
  generated_at: string;
  recipe_ids: string[];
};

const ITEM_JSONB_COLUMNS = [
  'items',
  'checked_state',
  'item_overrides',
  'custom_items',
  'category_labels',
  'category_order',
  'item_order',
] as const;

export function shoppingListMetaSelectSql(): string {
  return `SELECT ${SHOPPING_LIST_META_COLUMNS.join(', ')} FROM shopping_lists`;
}

export function shoppingListMetaOmitsItemBodies(sql: string): boolean {
  const selected = sql.replace(/^SELECT\s+/i, '').replace(/\s+FROM[\s\S]*$/i, '');
  return ITEM_JSONB_COLUMNS.every(col => !selected.split(',').map(s => s.trim()).includes(col));
}

export function toShoppingListMeta(row: {
  id: string;
  name: string;
  subtitle?: string | null;
  generated_at: string;
  recipe_ids?: string[] | null;
}): ShoppingListMeta {
  return {
    id: row.id,
    name: row.name,
    subtitle: row.subtitle ?? '',
    generated_at: row.generated_at,
    recipe_ids: row.recipe_ids ?? [],
  };
}

export function recipeSourceMapFromItems(
  items: Array<{ contributions?: Array<{ recipe?: string; source_url?: string | null }> }>,
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const item of items) {
    for (const contribution of item.contributions ?? []) {
      if (contribution.recipe && contribution.source_url) {
        map[contribution.recipe] = contribution.source_url;
      }
    }
  }
  return map;
}

export function recipeSourceMapFromRecipes(
  recipes: Array<{ title?: string | null; source_url?: string | null }>,
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const recipe of recipes) {
    if (recipe.title && recipe.source_url) map[recipe.title] = recipe.source_url;
  }
  return map;
}

export function mergeRecipeSourceMaps(
  ...maps: Array<Record<string, string> | undefined>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const map of maps) {
    if (!map) continue;
    for (const [title, url] of Object.entries(map)) {
      if (title && url) out[title] = url;
    }
  }
  return out;
}

export type ShoppingCheckedState = Record<string, { checked: boolean; checkedBy: string; checkedAt: number }>;

/** A detail GET has an items array. Meta index (array or dropdown object) does not. */
export function isShoppingListDetail(payload: unknown): payload is {
  items: unknown[];
  checked_state?: ShoppingCheckedState | null;
  recipe_sources?: Record<string, string>;
  item_overrides?: Record<string, unknown>;
  custom_items?: unknown[];
  category_labels?: Record<string, string>;
  category_order?: string[];
  item_order?: Record<string, string[]>;
  subtitle?: string;
} {
  return !!payload
    && typeof payload === 'object'
    && !Array.isArray(payload)
    && Array.isArray((payload as { items?: unknown }).items);
}

/**
 * Checked map to adopt from a detail GET. `undefined` means the payload is not
 * a list body (do not clobber local checks). Missing/empty `checked_state` is `{}`.
 */
export function adoptCheckedState(payload: unknown): ShoppingCheckedState | undefined {
  if (!isShoppingListDetail(payload)) return undefined;
  const raw = payload.checked_state;
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as ShoppingCheckedState;
}

/** Structural refetch still adopts DB checks — live deltas can miss; the row is source of truth. */
export function shouldAdoptCheckedState(opts: { busy: boolean }): boolean {
  return !opts.busy;
}
