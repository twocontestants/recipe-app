import type { ShoppingItem } from './shopping';

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

export type ShoppingListDetail = {
  items: ShoppingItem[];
  checked_state?: ShoppingCheckedState | null;
  recipe_sources?: Record<string, string>;
  item_overrides?: Record<string, {
    displayName?: string;
    displayAmount?: string;
    category?: string;
    hidden?: boolean;
    detached?: boolean;
  }>;
  custom_items?: unknown[];
  category_labels?: Record<string, string>;
  category_order?: string[];
  item_order?: Record<string, string[]>;
  subtitle?: string;
};

/** A detail GET has an items array. Meta index (array or dropdown object) does not. */
export function isShoppingListDetail(payload: unknown): payload is ShoppingListDetail {
  return !!payload
    && typeof payload === 'object'
    && !Array.isArray(payload)
    && Array.isArray((payload as { items?: unknown }).items);
}

export type ShoppingCheckedEntry = { checked: boolean; checkedBy: string; checkedAt: number };

/** Merge a check onto the JSON object. Text keys stay object keys, never array indexes. */
export function shoppingListCheckSetSql(): string {
  return `UPDATE shopping_lists
             SET checked_state = CASE
               WHEN jsonb_typeof(COALESCE(checked_state, '{}'::jsonb)) = 'object'
               THEN COALESCE(checked_state, '{}'::jsonb) || jsonb_build_object($2::text, $3::jsonb)
               ELSE jsonb_build_object($2::text, $3::jsonb)
             END
           WHERE id = $1`;
}

export function shoppingListCheckClearKeySql(): string {
  return `UPDATE shopping_lists
             SET checked_state = CASE
               WHEN jsonb_typeof(COALESCE(checked_state, '{}'::jsonb)) = 'object'
               THEN COALESCE(checked_state, '{}'::jsonb) - $2::text
               ELSE '{}'::jsonb
             END
           WHERE id = $1`;
}

function asRecord(raw: unknown): Record<string, unknown> | undefined {
  if (raw == null) return undefined;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    try {
      return asRecord(JSON.parse(trimmed));
    } catch {
      return undefined;
    }
  }
  if (Array.isArray(raw)) {
    const out: Record<string, unknown> = {};
    raw.forEach((value, index) => {
      if (value != null) out[String(index)] = value;
    });
    return out;
  }
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  return undefined;
}

function isCheckedFlag(value: unknown): boolean {
  if (value === false || value === 0 || value === 'false' || value === '0') return false;
  if (value === undefined) return true;
  return !!value;
}

export function normalizeCheckedEntry(raw: unknown): ShoppingCheckedEntry | undefined {
  if (raw == null) return undefined;
  if (typeof raw === 'string') {
    try {
      return normalizeCheckedEntry(JSON.parse(raw));
    } catch {
      return undefined;
    }
  }
  if (raw === true) return { checked: true, checkedBy: '', checkedAt: 0 };
  if (typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const obj = raw as Record<string, unknown>;
  if (!isCheckedFlag(obj.checked)) return undefined;
  return {
    checked: true,
    checkedBy: typeof obj.checkedBy === 'string' ? obj.checkedBy : '',
    checkedAt: typeof obj.checkedAt === 'number' && Number.isFinite(obj.checkedAt)
      ? obj.checkedAt
      : Number(obj.checkedAt) || 0,
  };
}

export function normalizeCheckedState(raw: unknown): ShoppingCheckedState {
  const record = asRecord(raw);
  if (!record) return {};
  const out: ShoppingCheckedState = {};
  for (const [key, value] of Object.entries(record)) {
    const entry = normalizeCheckedEntry(value);
    if (entry) out[key] = entry;
  }
  return out;
}

function itemIdOf(obj: Record<string, unknown>): string {
  if (typeof obj.id === 'string' && obj.id.trim()) return obj.id;
  if (typeof obj.id === 'number' && Number.isFinite(obj.id)) return String(obj.id);
  return '';
}

function customItemIds(customItems: unknown): string[] {
  if (!Array.isArray(customItems)) return [];
  return customItems
    .map(item => (item && typeof item === 'object' && !Array.isArray(item) ? itemIdOf(item as Record<string, unknown>) : ''))
    .filter(Boolean);
}

/**
 * Map name-keyed ticks onto item ids so the UI key (`id ?? name`) finds them.
 * Unknown keys (custom rows, detached sub-lines) pass through.
 */
export function alignCheckedStateToItems(
  checked: ShoppingCheckedState,
  items: Array<{ id?: unknown; name?: unknown; displayName?: unknown }>,
  extraKeys: string[] = [],
): ShoppingCheckedState {
  const idSet = new Set<string>(extraKeys.filter(Boolean));
  const nameToId = new Map<string, string>();
  for (const item of items) {
    const id = typeof item.id === 'string' && item.id
      ? item.id
      : typeof item.id === 'number'
        ? String(item.id)
        : '';
    if (!id) continue;
    idSet.add(id);
    if (typeof item.name === 'string' && item.name && !nameToId.has(item.name)) nameToId.set(item.name, id);
    if (typeof item.displayName === 'string' && item.displayName && !nameToId.has(item.displayName)) {
      nameToId.set(item.displayName, id);
    }
  }

  const out: ShoppingCheckedState = {};
  for (const [key, entry] of Object.entries(checked)) {
    if (idSet.has(key) || key.includes('#')) {
      out[key] = entry;
      continue;
    }
    const remapped = nameToId.get(key);
    if (remapped) {
      if (!out[remapped]) out[remapped] = entry;
    } else {
      out[key] = entry;
    }
  }
  return out;
}

/**
 * Checked map to adopt from a detail GET. `undefined` means the payload is not
 * a list body (do not clobber local checks). Missing/empty `checked_state` is `{}`.
 */
export function adoptCheckedState(payload: unknown): ShoppingCheckedState | undefined {
  if (!isShoppingListDetail(payload)) return undefined;
  const customIds = customItemIds(payload.custom_items);
  return alignCheckedStateToItems(
    normalizeCheckedState(payload.checked_state),
    payload.items ?? [],
    customIds,
  );
}

/** Structural refetch still adopts DB checks — live deltas can miss; the row is source of truth. */
export function shouldAdoptCheckedState(opts: { busy: boolean }): boolean {
  return !opts.busy;
}

/** Deterministic id for a pre-id snapshot row so remigration does not reshuffle keys. */
export function stableShoppingItemId(name: string, index: number): string {
  const input = `${index}:${name}`;
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `m${(hash >>> 0).toString(36)}`;
}

type MigratableList = {
  items: unknown[];
  item_overrides?: Record<string, unknown>;
  custom_items?: unknown[];
  item_order?: Record<string, string[]>;
  checked_state?: unknown;
};

function asItemRecord(item: unknown): Record<string, unknown> {
  if (item && typeof item === 'object' && !Array.isArray(item)) return { ...(item as Record<string, unknown>) };
  return {};
}

function upgradeItemWithoutId(obj: Record<string, unknown>, id: string): Record<string, unknown> {
  const name = typeof obj.name === 'string' ? obj.name : '';
  const displayName = typeof obj.displayName === 'string' ? obj.displayName : name;
  const recipes = Array.isArray(obj.recipes) ? obj.recipes : [];
  const contributions = Array.isArray(obj.contributions) && obj.contributions.length
    ? obj.contributions
    : (name ? [{ name: displayName, amount: (obj.totalAmount as string) ?? '', unit: (obj.unit as string) ?? '', recipe: recipes[0] ?? '' }] : []);
  return {
    ...obj,
    id,
    name,
    displayName,
    totalAmount: (obj.totalAmount as string) ?? '',
    unit: (obj.unit as string) ?? '',
    recipes,
    contributions,
    category: (obj.category as string) ?? 'Pantry',
  };
}

function remapKeyedRecord<T>(
  record: Record<string, T> | undefined,
  remap: (key: string) => string,
): { next: Record<string, T>; changed: boolean } {
  const next: Record<string, T> = {};
  let changed = false;
  for (const [key, value] of Object.entries(record ?? {})) {
    const mapped = remap(key);
    if (mapped !== key) changed = true;
    next[mapped] = value;
  }
  return { next, changed };
}

/**
 * Upgrade a pre-id shopping list and remap name-keyed edits onto item ids.
 * Existing ids are kept. Remigration is stable so a failed write-back still
 * serves the same keys on the next read.
 */
export function migrateShoppingListShape<T extends MigratableList>(list: T): { list: T; changed: boolean } {
  const items = Array.isArray(list.items) ? list.items : [];
  let changed = false;

  const migratedItems = items.map((item, index) => {
    const obj = asItemRecord(item);
    const existingId = itemIdOf(obj);
    if (existingId) {
      if (obj.id !== existingId) {
        changed = true;
        return { ...obj, id: existingId };
      }
      return obj;
    }
    changed = true;
    const name = typeof obj.name === 'string' ? obj.name : '';
    return upgradeItemWithoutId(obj, stableShoppingItemId(name, index));
  });

  const nameToId = new Map<string, string>();
  const idSet = new Set<string>(customItemIds(list.custom_items));
  for (const item of migratedItems) {
    const id = itemIdOf(item);
    if (!id) continue;
    idSet.add(id);
    const name = typeof item.name === 'string' ? item.name : '';
    const displayName = typeof item.displayName === 'string' ? item.displayName : '';
    if (name && !nameToId.has(name)) nameToId.set(name, id);
    if (displayName && !nameToId.has(displayName)) nameToId.set(displayName, id);
  }

  const remap = (key: string) => {
    if (idSet.has(key) || key.includes('#')) return key;
    return nameToId.get(key) ?? key;
  };

  const overrides = remapKeyedRecord(list.item_overrides ?? {}, remap);
  const alignedChecks = alignCheckedStateToItems(
    normalizeCheckedState(list.checked_state),
    migratedItems,
    customItemIds(list.custom_items),
  );
  const previousChecks = normalizeCheckedState(list.checked_state);
  const checksChanged = JSON.stringify(previousChecks) !== JSON.stringify(alignedChecks);

  const item_order: Record<string, string[]> = {};
  let orderChanged = false;
  for (const [cat, keys] of Object.entries(list.item_order ?? {})) {
    const mapped = (Array.isArray(keys) ? keys : []).map(remap);
    item_order[cat] = mapped;
    if (mapped.some((key, i) => key !== keys[i])) orderChanged = true;
  }

  changed = changed || overrides.changed || checksChanged || orderChanged;
  if (!changed) return { list, changed: false };

  return {
    list: {
      ...list,
      items: migratedItems,
      item_overrides: overrides.next,
      checked_state: alignedChecks,
      item_order,
    } as T,
    changed: true,
  };
}
