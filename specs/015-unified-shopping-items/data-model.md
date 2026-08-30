# Data model: Unified shopping list items

Same `shopping_lists` table. Source of truth for lines and ticks is `items` JSONB.

## Shopping item (in `items[]`)

| Field | Meaning |
|-------|---------|
| id | Stable identity (existing `i…` / migrated `m…`) |
| name | Standardised merge key (recipe lines); display key for custom |
| displayName | Headline text |
| totalAmount | Headline quantity (custom: the typed amount string) |
| unit | Unit when known |
| recipes | Contributing recipe titles |
| contributions | Per-recipe wordings; optional `checked` on a detached wording |
| category | Aisle |
| checked | Yes/no tick. Default `false`. No who/when. |
| custom | `true` when the cook typed the line. Omit/false for generated lines. |

A detached wording (`id#index`) is not a second list row in storage. Its tick is `contributions[index].checked`.

## Shopping list row

Written by generate and by ops / migrate write-back:

- `items` — full array above
- `item_overrides`, `category_labels`, `category_order`, `item_order`, `subtitle` — unchanged
- `custom_items` — leftover; empty after fold
- `checked_state` — leftover; empty after fold

## Shopping list meta (dropdown)

Unchanged: `id`, `name`, `subtitle`, `generated_at`, `recipe_ids`.

Must **not** include `items`, `checked_state`, `item_overrides`, `custom_items`, `category_labels`, `category_order`, or `item_order`.

## Fold (on detail read)

1. Existing id upgrade + name-key remap for overrides / order.
2. Each leftover `custom_items` element with an id, if not already in `items`, is appended as a custom item (`checked` from old tick map if present).
3. Each leftover `checked_state` key:
   - item id or remapped name → `item.checked = true` when the old entry was ticked
   - `parent#index` → that contribution’s `checked = true`
   - who/when discarded
4. `custom_items` → `[]`, `checked_state` → `{}` on write-back.

## Check ops

| Op | Effect |
|----|--------|
| `check` `{ key, checked }` | Set `items[id].checked` or `contributions[i].checked`. `checked: false` clears. Legacy `{ value: { checked } \| null }` still accepted. |
| `clearChecked` | All item and contribution `checked` flags false |
| `addCustom` | Append/upsert the item on `items` with `custom: true` |
| `updateCustom` | Merge patch into that `items` element |
| `removeCustom` | Drop that `items` element |

## Generate

New items include `checked: false` and do not set `custom`.
