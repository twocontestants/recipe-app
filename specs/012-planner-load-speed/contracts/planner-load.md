# Contracts: Planner load

Cookie `mise_session` required. Permissions unchanged.

## GET /api/planner

Must **not** run kitchen schema creation or column migration.

Query (unchanged shapes):

- `from` + `to` (and optional `weeks=`) — meals in that window plus leftover `week_start` rows.
- `weekStart` — one storage week (kept for Recipes add-to-planner and other callers).

Response: JSON array of meal cards. Nested `recipe` MUST omit `ingredients` and `steps`.

## POST /api/planner

Unchanged. May return a card-shaped nested recipe; the client already overlays the picked recipe.

## POST /api/shopping-lists

Unchanged. Server-side meal read for generation MUST include ingredients and steps.

## GET /api/planner-notes

Must **not** run kitchen schema creation or column migration.

- `from` + `to`: `{ "YYYY-MM-DD": "note text" }` for notes in that inclusive range.
- `weekStart`: existing `{ [dayOfWeek]: note }` map (compatibility).

## PUT /api/planner-notes?weekStart=

Unchanged.

## UI

- Opening Planner: one meals range GET per month covering the week; one notes range GET; no cookbook GET until Add.
- Preferences hydrating the same week-start day: no second meals GET.
- Adjacent-month prefetch after first paint remains allowed.
