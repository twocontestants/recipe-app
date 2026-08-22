# Data model: Shared day sheet

No new persisted tables. Session state is client-only.

## Day sheet session

| Field | Meaning |
|-------|---------|
| `mode` | `add` (Recipes) or `move` (planner rail) |
| `recipeTitle` | Name shown under the title |
| `weekStart` | Display-week key (same string Recipes already uses) |
| `selectedDay` | Index `0…6` in the household week order |
| `weekPlan` | Dinners already on that display week, keyed by `selectedDay` |
| `confirming` | Save in flight; confirm button disabled |

## Rail pick open

| Field | Meaning |
|-------|---------|
| `direction` | `earlier` or `later` |
| `originIso` | Calendar date the held dinner started on |
| `weekStartsOn` | Household start-of-week |

`sheetAnchorForRailPick(direction, originIso, weekStartsOn)` → `{ weekStart, selectedDay }`.

## Rail origin

| Field | Meaning |
|-------|---------|
| `originIso` | Held dinner’s current date |
| `iso` | A numbered rail day |

`isRailOrigin(iso, originIso)` is true when both are the same calendar day.

## Validation

- Dismiss without confirm: no write.
- Confirm on the origin date: existing `moveMealToDate` no-op.
- `tmp-*` meals never open the sheet (hold is blocked upstream).
