# Research: Unified shopping list items

## One item array

- **Decision**: Recipe-derived and hand-added lines both live in `shopping_lists.items`. A hand-added line is a `ShoppingItem` with `custom: true`, empty `contributions` / `recipes`, and `totalAmount` holding the typed quantity string.
- **Rationale**: The client already resolves both into one row model. A second JSONB array (`custom_items`) only exists because generate wrote recipe items first. One array matches how cooks use the list.
- **Alternatives considered**: Keep `custom_items` and only move ticks (rejected — same split the cook asked to remove). Promote custom rows to a new table (rejected — extra schema, constitution V).

## Tick is a boolean on the item

- **Decision**: `item.checked: boolean`, default `false`. Detached wording (`id#index`) stores `checked` on that contribution object. No `checkedBy` or `checkedAt` in storage or ops.
- **Rationale**: Spec FR-003. Live socket may still carry an ephemeral shopper name for the “onions checked off” toast; that is not persisted.
- **Alternatives considered**: Keep `checked_state` as a boolean map (still a side table). Store ticks in a new column (unnecessary; items already JSONB).

## Check ops write the items array

- **Decision**: `check` merges `{ checked }` onto the matching `items[]` element (or contribution) with `jsonb_agg` + `||`, same concurrency style as today’s custom-item patch. `clearChecked` sets `checked: false` on every item and contribution. `addCustom` / `updateCustom` / `removeCustom` target `items` (filter by `id`, treat as upsert/remove).
- **Rationale**: Op-based sync must stay composable. Rewriting the whole list on each tick would clobber concurrent aisle edits.
- **Alternatives considered**: PUT the full items array on each tick (rejected — clobber). Keep writing `checked_state` and only fold on read (rejected — two sources of truth).

## Fold older lists on detail read

- **Decision**: Extend `migrateShoppingListShape` to: assign missing ids (existing), append leftover `custom_items` into `items` with `custom: true`, copy `checked_state` onto matching item/contribution ids (and leftover name keys), drop who/when, then write back `items` and empty `custom_items` / `checked_state`.
- **Rationale**: Same pattern as the pre-id upgrade. Index GET never sees item bodies. First open upgrades the row.
- **Alternatives considered**: One-shot SQL migration on setup (heavier; browse must not run schema work). Dual-read forever (two sources of truth).

## Leave leftover columns

- **Decision**: Do not `DROP COLUMN` `custom_items` or `checked_state` in this feature. New writes leave them empty. Meta SELECT still omits them.
- **Rationale**: Avoids a setup-only destructive migrate while old rows still exist. Columns can be dropped in a later cleanup once every household has opened its lists.
- **Alternatives considered**: Drop on setup (risk for unread lists if migrate missed a shape).

## Client adopts items, not a tick map

- **Decision**: Detail payload’s `items` are the source of ticks and extras. `adoptCheckedState` becomes a boolean map derived from `item.checked` / contribution `checked`. Custom rows come from `items` with `custom: true` (fallback: leftover `custom_items` if migrate write-back failed).
- **Rationale**: UI can keep a local boolean map for live deltas; persistence is the item.
- **Alternatives considered**: Client-only merge without server fold (every client reimplements). Keep two React state trees (`customItems` + `checked`) forever (rejected).
