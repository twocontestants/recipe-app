# Contracts: Unified shopping items

Cookie `mise_session` required. Permissions unchanged.

## GET /api/shopping-lists

Unchanged meta rules (no item JSONB, no schema work).

`?id=`: JSON object whose `items` array includes recipe-derived and hand-added lines. Each item has `checked` (boolean). Custom lines have `custom: true`. Response SHOULD omit populated `custom_items` / `checked_state` after fold (empty object/array is fine). No `checkedBy` / `checkedAt` on items.

## POST /api/shopping-lists

Unchanged request body. Generated `items` MUST include `checked: false` on each line. MUST NOT write a separate tick map or extras array.

## PATCH /api/shopping-lists?id=

`{ ops: ShoppingOp[] }`.

Check op (current):

```json
{ "t": "check", "key": "<item-id-or-id#index>", "checked": true }
```

Clear: `{ "t": "clearChecked" }`.

Custom ops keep the same `t` names but mutate `items`:

```json
{ "t": "addCustom", "item": { "id": "i…", "displayName": "Tape", "category": "Pantry", "totalAmount": "", "custom": true, "checked": false } }
{ "t": "updateCustom", "id": "i…", "patch": { "displayName": "Duct tape" } }
{ "t": "removeCustom", "id": "i…" }
```

Legacy check `{ "t": "check", "key": "…", "value": { "checked": true } | null }` MUST still apply as boolean on the item.

## PUT /api/shopping-lists?id=

May still accept leftover `custom_items` / `checked_state` for older clients; server SHOULD fold them into `items` when present. New clients send `items` only.

## Socket relay (not stored)

`check-item` / `item-updated` / `clear-all` stay live-only. Shopper name on the payload is optional and MUST NOT be persisted.

## UI

- Open list: ticks and extras come from `items`.
- Tick: PATCH `check` + socket delta; reload agrees.
- Add extra: PATCH `addCustom` into `items`; reload shows the same line.
