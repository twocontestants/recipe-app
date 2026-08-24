# Contracts: Shopping list load

Cookie `mise_session` required. Permissions unchanged.

## GET /api/shopping-lists

Must **not** run kitchen schema creation or column migration.

No query `id`: JSON array of meta objects `{ id, name, subtitle, generated_at, recipe_ids }`. MUST omit item JSONB columns listed in data-model.md.

`?id=`: JSON object of the full list (items, edits, checked state) plus optional `recipe_sources`. 404 if missing or not owned. Pre-id item migration on first detail read stays.

## POST /api/shopping-lists

Unchanged request body (`name`, `subtitle`, `week_starts`, `recipe_ids`). Server-side meal read MUST be one query for all `week_starts` and MUST include ingredients and steps. Generated contributions SHOULD include `source_url` when the recipe has one.

## PUT / PATCH / DELETE /api/shopping-lists?id=

Unchanged. May still ensure schema on writes that already do.

## GET /api/recipes

Unchanged. Shopping first paint MUST NOT call it to build source links.

## UI

- Opening Shopping: one meta GET; one detail GET for the open list; no cookbook GET.
- Empty household: meta GET only; no detail GET.
- Generate: still POST; then refresh meta and open the new id.
