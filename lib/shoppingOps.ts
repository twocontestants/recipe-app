// Operation-based sync for shopping lists. Instead of PUTting the whole edited
// state (which clobbers concurrent edits), each change is a targeted operation
// applied to just the relevant slice/key on the server. Independent edits
// (delete item A on one device, add item B on another) therefore compose
// instead of overwriting each other. Each op is designed to be idempotent so a
// retry/reconnect can safely re-send it.

export type ShoppingOp =
  // Merge `patch` into item_overrides[key] (rename/recategorize/hide an item
  // derived from a recipe). Merging means two devices touching different fields
  // of the same item both land.
  | { t: 'override'; key: string; patch: Record<string, unknown> }
  // Upsert a hand-added item onto the items array (custom: true).
  | { t: 'addCustom'; item: Record<string, unknown> }
  // Merge `patch` into the item with this id.
  | { t: 'updateCustom'; id: string; patch: Record<string, unknown> }
  // Remove the item with this id from items.
  | { t: 'removeCustom'; id: string }
  // Set (or, with label === null, delete) a category label.
  | { t: 'setLabel'; cat: string; label: string | null }
  // Replace the category ordering (inherently a whole-list value).
  | { t: 'setCategoryOrder'; order: string[] }
  // Set the item ordering for a single category.
  | { t: 'setItemOrder'; cat: string; order: string[] }
  // Set the yes/no tick on one item (or detached wording key).
  | { t: 'check'; key: string; checked: boolean; value?: { checked?: boolean } | null }
  // Clear all ticks.
  | { t: 'clearChecked' }
  // Set the list subtitle.
  | { t: 'setSubtitle'; subtitle: string };

/** Check ops already have live socket deltas — they must not trigger a full reread. */
export function opsNeedListChanged(ops: ShoppingOp[]): boolean {
  return ops.some(op => op.t !== 'check' && op.t !== 'clearChecked');
}

/** Current `checked` boolean, or leftover `{ value }` / `value: null` from older clients. */
export function checkOpIsOn(op: { checked?: boolean; value?: { checked?: boolean } | null }): boolean {
  if (typeof op.checked === 'boolean') return op.checked;
  if (op.value == null) return false;
  return op.value.checked !== false;
}
