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

export type ShoppingCheckedMap = Record<string, boolean>;

export type ShoppingListDetail = {
  items: ShoppingItem[];
  checked_state?: unknown;
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

function isTicked(value: unknown): boolean {
  if (value === true) return true;
  if (value === false || value === 0 || value === 'false' || value === '0' || value == null) return false;
  if (typeof value === 'string') {
    try {
      return isTicked(JSON.parse(value));
    } catch {
      return false;
    }
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return isTicked((value as { checked?: unknown }).checked);
  }
  return false;
}

/** Leftover tick map (id → yes/no). Who/when is discarded. */
export function leftoverCheckedMap(raw: unknown): ShoppingCheckedMap {
  const record = asRecord(raw);
  if (!record) return {};
  const out: ShoppingCheckedMap = {};
  for (const [key, value] of Object.entries(record)) {
    if (isTicked(value)) out[key] = true;
  }
  return out;
}

export function itemIdOf(obj: Record<string, unknown>): string {
  if (typeof obj.id === 'string' && obj.id.trim()) return obj.id;
  if (typeof obj.id === 'number' && Number.isFinite(obj.id)) return String(obj.id);
  return '';
}

function asItemRecord(item: unknown): Record<string, unknown> {
  if (item && typeof item === 'object' && !Array.isArray(item)) return { ...(item as Record<string, unknown>) };
  return {};
}

function contributionChecked(item: Record<string, unknown>, index: number): boolean {
  const contributions = Array.isArray(item.contributions) ? item.contributions : [];
  const raw = contributions[index];
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return isTicked((raw as { checked?: unknown }).checked);
  }
  return false;
}

/** Boolean ticks keyed by item id or `id#index` for a detached wording. */
export function checkedMapFromItems(items: unknown[]): ShoppingCheckedMap {
  const out: ShoppingCheckedMap = {};
  for (const item of items) {
    const obj = asItemRecord(item);
    const id = itemIdOf(obj);
    if (!id) continue;
    if (isTicked(obj.checked)) out[id] = true;
    const contributions = Array.isArray(obj.contributions) ? obj.contributions : [];
    contributions.forEach((_, index) => {
      if (contributionChecked(obj, index)) out[`${id}#${index}`] = true;
    });
  }
  return out;
}

function customItemRecords(customItems: unknown): Record<string, unknown>[] {
  if (!Array.isArray(customItems)) return [];
  return customItems
    .map(item => asItemRecord(item))
    .filter(obj => itemIdOf(obj));
}

/**
 * Map leftover name-keyed ticks onto item ids.
 * Unknown keys (detached sub-lines) pass through.
 */
export function alignCheckedKeysToItems(
  ticks: ShoppingCheckedMap,
  items: Array<{ id?: unknown; name?: unknown; displayName?: unknown }>,
  extraKeys: string[] = [],
): ShoppingCheckedMap {
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

  const out: ShoppingCheckedMap = {};
  for (const [key, on] of Object.entries(ticks)) {
    if (!on) continue;
    if (idSet.has(key) || key.includes('#')) {
      out[key] = true;
      continue;
    }
    const remapped = nameToId.get(key);
    out[remapped ?? key] = true;
  }
  return out;
}

function applyTicksToItems(items: Record<string, unknown>[], ticks: ShoppingCheckedMap): Record<string, unknown>[] {
  return items.map(item => {
    const id = itemIdOf(item);
    const contributions = Array.isArray(item.contributions)
      ? item.contributions.map((raw, index) => {
        const obj = asItemRecord(raw);
        const on = ticks[`${id}#${index}`] === true;
        if (on) return { ...obj, checked: true };
        if ('checked' in obj) {
          const { checked: _drop, ...rest } = obj;
          return rest;
        }
        return obj;
      })
      : item.contributions;
    const checked = ticks[id] === true;
    return { ...item, checked, contributions };
  });
}

function toCustomItem(obj: Record<string, unknown>, checked: boolean): Record<string, unknown> {
  const id = itemIdOf(obj);
  const displayName = typeof obj.displayName === 'string' ? obj.displayName
    : typeof obj.name === 'string' ? obj.name : '';
  const totalAmount = typeof obj.totalAmount === 'string' ? obj.totalAmount
    : typeof obj.displayAmount === 'string' ? obj.displayAmount : '';
  return {
    id,
    name: typeof obj.name === 'string' && obj.name ? obj.name : displayName,
    displayName,
    totalAmount,
    unit: typeof obj.unit === 'string' ? obj.unit : '',
    recipes: Array.isArray(obj.recipes) ? obj.recipes : [],
    contributions: Array.isArray(obj.contributions) ? obj.contributions : [],
    category: typeof obj.category === 'string' ? obj.category : 'Pantry',
    checked,
    custom: true,
  };
}

/**
 * Checked map to adopt from a detail GET. `undefined` means the payload is not
 * a list body (do not clobber local checks). Missing ticks is `{}`.
 */
export function adoptCheckedState(payload: unknown): ShoppingCheckedMap | undefined {
  if (!isShoppingListDetail(payload)) return undefined;
  const { list } = migrateShoppingListShape({
    items: payload.items ?? [],
    custom_items: payload.custom_items,
    checked_state: payload.checked_state,
  });
  return checkedMapFromItems(list.items);
}

/** Structural refetch still adopts DB checks — live deltas can miss; the row is source of truth. */
export function shouldAdoptCheckedState(opts: { busy: boolean }): boolean {
  return !opts.busy;
}

/**
 * A row is ticked when the live overlay says so, or — if that key was never
 * adopted — when the item itself is ticked. Overlay `false` wins so a live
 * uncheck is not undone by a stale item.checked.
 */
export function rowIsChecked(
  key: string,
  overlay: ShoppingCheckedMap,
  itemChecked?: boolean,
): boolean {
  if (Object.prototype.hasOwnProperty.call(overlay, key)) return overlay[key] === true;
  return itemChecked === true;
}

/** Signature used to skip a no-op subtitle save after load. Must match JSON.stringify. */
export function shoppingSubtitleSig(subtitle: string): string {
  return JSON.stringify(subtitle);
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

export type MigratableList = {
  items: unknown[];
  item_overrides?: Record<string, unknown>;
  custom_items?: unknown[];
  item_order?: Record<string, string[]>;
  checked_state?: unknown;
};

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
    checked: isTicked(obj.checked),
    custom: obj.custom === true,
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

function parseDetachedKey(key: string): { itemId: string; index: number } | null {
  const hash = key.lastIndexOf('#');
  if (hash <= 0) return null;
  const index = Number(key.slice(hash + 1));
  if (!Number.isInteger(index) || index < 0) return null;
  return { itemId: key.slice(0, hash), index };
}

/**
 * Upgrade a pre-id shopping list, fold leftover extras/ticks onto items, and
 * remap name-keyed edits onto item ids. Existing ids are kept.
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

  const customRecords = customItemRecords(list.custom_items);
  const existingIds = new Set(migratedItems.map(itemIdOf).filter(Boolean));
  for (const custom of customRecords) {
    const id = itemIdOf(custom);
    if (!id || existingIds.has(id)) continue;
    changed = true;
    existingIds.add(id);
    migratedItems.push(toCustomItem(custom, isTicked(custom.checked)));
  }

  const nameToId = new Map<string, string>();
  const idSet = new Set<string>();
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
  const leftoverTicks = alignCheckedKeysToItems(
    leftoverCheckedMap(list.checked_state),
    migratedItems,
    [...idSet],
  );
  const itemTicks = checkedMapFromItems(migratedItems);
  const mergedTicks: ShoppingCheckedMap = { ...itemTicks, ...leftoverTicks };
  const tickedItems = applyTicksToItems(migratedItems, mergedTicks);

  const previousTicks = JSON.stringify(itemTicks);
  const nextTicks = JSON.stringify(checkedMapFromItems(tickedItems));
  const leftoverPresent = leftoverTicks && Object.keys(leftoverCheckedMap(list.checked_state)).length > 0;
  const leftoverCustomPresent = customRecords.length > 0;
  const checksChanged = previousTicks !== nextTicks;

  const item_order: Record<string, string[]> = {};
  let orderChanged = false;
  for (const [cat, keys] of Object.entries(list.item_order ?? {})) {
    const mapped = (Array.isArray(keys) ? keys : []).map(remap);
    item_order[cat] = mapped;
    if (mapped.some((key, i) => key !== keys[i])) orderChanged = true;
  }

  changed = changed || overrides.changed || checksChanged || orderChanged || leftoverPresent || leftoverCustomPresent;
  if (!changed) return { list, changed: false };

  return {
    list: {
      ...list,
      items: tickedItems,
      item_overrides: overrides.next,
      custom_items: [],
      checked_state: {},
      item_order,
    } as T,
    changed: true,
  };
}

/** Set `checked` on the item whose id matches `$2`. Preserves array order. */
export function shoppingListItemCheckSql(): string {
  return `UPDATE shopping_lists
             SET items = (
               SELECT COALESCE(jsonb_agg(e ORDER BY ord), '[]'::jsonb)
               FROM (
                 SELECT CASE WHEN elem->>'id' = $2
                   THEN elem || jsonb_build_object('checked', to_jsonb($3::boolean))
                   ELSE elem
                 END AS e, ord
                 FROM jsonb_array_elements(COALESCE(items, '[]'::jsonb))
                   WITH ORDINALITY AS t(elem, ord)
               ) s
             )
           WHERE id = $1`;
}

/** Set `checked` on contributions[$3] of the item whose id is `$2`. */
export function shoppingListContributionCheckSql(): string {
  return `UPDATE shopping_lists
             SET items = (
               SELECT COALESCE(jsonb_agg(e ORDER BY ord), '[]'::jsonb)
               FROM (
                 SELECT CASE WHEN elem->>'id' = $2
                   THEN jsonb_set(
                     elem,
                     ARRAY['contributions', $3::text, 'checked'],
                     to_jsonb($4::boolean),
                     true
                   )
                   ELSE elem
                 END AS e, ord
                 FROM jsonb_array_elements(COALESCE(items, '[]'::jsonb))
                   WITH ORDINALITY AS t(elem, ord)
               ) s
             )
           WHERE id = $1`;
}

/** Set every item and contribution `checked` to false. */
export function shoppingListClearCheckedSql(): string {
  return `UPDATE shopping_lists
             SET items = (
               SELECT COALESCE(jsonb_agg(cleared ORDER BY ord), '[]'::jsonb)
               FROM (
                 SELECT (elem || '{"checked":false}'::jsonb) || jsonb_build_object(
                   'contributions',
                   COALESCE((
                     SELECT jsonb_agg(c || '{"checked":false}'::jsonb ORDER BY c_ord)
                     FROM jsonb_array_elements(COALESCE(elem->'contributions', '[]'::jsonb))
                       WITH ORDINALITY AS ct(c, c_ord)
                   ), '[]'::jsonb)
                 ) AS cleared, ord
                 FROM jsonb_array_elements(COALESCE(items, '[]'::jsonb))
                   WITH ORDINALITY AS t(elem, ord)
               ) s
             )
           WHERE id = $1`;
}

/** Upsert an item by id onto the items array (used for hand-added lines). */
export function shoppingListAddItemSql(): string {
  return `UPDATE shopping_lists
             SET items = (
               SELECT COALESCE(jsonb_agg(e ORDER BY ord), '[]'::jsonb)
               FROM jsonb_array_elements(COALESCE(items, '[]'::jsonb))
                 WITH ORDINALITY AS t(e, ord)
               WHERE e->>'id' <> $2
             ) || jsonb_build_array($3::jsonb)
           WHERE id = $1`;
}

/** Merge a patch into the item whose id matches. */
export function shoppingListUpdateItemSql(): string {
  return `UPDATE shopping_lists
             SET items = (
               SELECT COALESCE(jsonb_agg(
                 CASE WHEN e->>'id' = $2 THEN e || $3::jsonb ELSE e END
                 ORDER BY ord
               ), '[]'::jsonb)
               FROM jsonb_array_elements(COALESCE(items, '[]'::jsonb))
                 WITH ORDINALITY AS t(e, ord)
             )
           WHERE id = $1`;
}

/** Drop the item whose id matches. */
export function shoppingListRemoveItemSql(): string {
  return `UPDATE shopping_lists
             SET items = (
               SELECT COALESCE(jsonb_agg(e ORDER BY ord), '[]'::jsonb)
               FROM jsonb_array_elements(COALESCE(items, '[]'::jsonb))
                 WITH ORDINALITY AS t(e, ord)
               WHERE e->>'id' <> $2
             )
           WHERE id = $1`;
}

export function splitCheckKey(key: string): { itemId: string; contributionIndex: number | null } {
  const detached = parseDetachedKey(key);
  if (detached) return { itemId: detached.itemId, contributionIndex: detached.index };
  return { itemId: key, contributionIndex: null };
}

export function customItemPayload(item: Record<string, unknown>): Record<string, unknown> {
  return toCustomItem(item, isTicked(item.checked));
}
