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
  // Upsert a custom (manually added) item by id.
  | { t: 'addCustom'; item: Record<string, unknown> }
  // Merge `patch` into the custom item with this id.
  | { t: 'updateCustom'; id: string; patch: Record<string, unknown> }
  // Remove the custom item with this id.
  | { t: 'removeCustom'; id: string }
  // Set (or, with label === null, delete) a category label.
  | { t: 'setLabel'; cat: string; label: string | null }
  // Replace the category ordering (inherently a whole-list value).
  | { t: 'setCategoryOrder'; order: string[] }
  // Set the item ordering for a single category.
  | { t: 'setItemOrder'; cat: string; order: string[] }
  // Set (value) or clear (null) the checked state for one item.
  | { t: 'check'; key: string; value: { checked: boolean; checkedBy: string; checkedAt: number } | null }
  // Clear all checked state.
  | { t: 'clearChecked' }
  // Set the list subtitle.
  | { t: 'setSubtitle'; subtitle: string };

/** Check ops already have live socket deltas — they must not trigger a full reread. */
export function opsNeedListChanged(ops: ShoppingOp[]): boolean {
  return ops.some(op => op.t !== 'check' && op.t !== 'clearChecked');
}
