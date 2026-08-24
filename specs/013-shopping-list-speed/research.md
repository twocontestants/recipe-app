# Research: Faster shopping list load

## Stop schema work on browse

- **Decision**: `GET /api/shopping-lists` (index and `?id=`) must not call `ensureAccountsSchema()`. Writes (`createShoppingList`, category dictionary, `/api/setup`) keep ensuring schema. The owner+generated-at index is created in `ensureAccountsSchema` / end of `setupDatabase` after `owner_id` exists.
- **Rationale**: First shopping GET in a process currently ensures accounts schema (ALTERs, backfills). Same class of hang as schema work on recipe/planner GET. Production already has columns. `getShoppingListById` already skips ensure.
- **Alternatives considered**: Keep ensure on index GET behind an in-process flag (still pays first-request ALTER).

## Index GET returns meta only

- **Decision**: Index SELECT is `id, name, subtitle, generated_at, recipe_ids`. No `items`, `checked_state`, `item_overrides`, `custom_items`, `category_labels`, `category_order`, or `item_order`.
- **Rationale**: The dropdown (`ShoppingListMeta`) only needs those fields. Today `SELECT *` ships every list’s JSONB bodies, then the client immediately GETs the newest list again.
- **Alternatives considered**: Keep `SELECT *` and hope gzip is enough (rejected). A combined “meta + newest detail” endpoint (more API churn than two light/known shapes).

## First paint: meta + one detail

- **Decision**: Client still fetches `/api/shopping-lists` then `/api/shopping-lists?id=` for the newest (or selected) list. Spinner may wait on the detail read. Do not embed item bodies in the index.
- **Rationale**: Two round-trips with a tiny first payload beat one round-trip that duplicates every list. There is no week-start hydrate double-fetch on this page.
- **Alternatives considered**: `GET ?latest=1` that returns meta array plus one detail (extra shape). Wait to paint until both finish with full index (status quo).

## Recipe source URLs without the cookbook

- **Decision**: At generate time, copy `recipe.source_url` onto each shopping contribution. Detail GET also returns `recipe_sources` (title → URL) from a card-field lookup of `recipe_ids` already on the list, for lists generated before URLs were stored. Client builds the pill map from contributions + that field. Remove the `GET /api/recipes` on Shopping mount.
- **Rationale**: Pills key off recipe title. Baking the URL survives later recipe deletion. The ids lookup is a small `WHERE id = ANY(...)` of card columns, not the cookbook.
- **Alternatives considered**: Keep the cookbook GET (rejected). New `?ids=` on recipes GET (unused if detail already looks up). A `recipe_sources` JSONB column (extra migration; contributions plus a computed map are enough).

## Generate with one meal query

- **Decision**: `POST /api/shopping-lists` calls `getMealPlansForWeeks(week_starts, ownerId, { includeMethod: true })` once. Keep full ingredient join. `getCategoryDictionary` may still ensure schema (write/generate path).
- **Rationale**: Today the handler loops `getMealPlanForWeek` per selected week. `getMealPlansForWeeks` already ORs the week spans in one SQL.
- **Alternatives considered**: Leave the loop (N queries). A new shopping-specific meals helper (duplicate of existing weeks helper).

## Index

- **Decision**: `CREATE INDEX IF NOT EXISTS idx_shopping_lists_owner_generated ON shopping_lists (owner_id, generated_at DESC)`. Create it where `owner_id` is ensured, not on the initial `CREATE TABLE` (that table has no `owner_id` yet).
- **Rationale**: Query is `WHERE owner_id = $1 ORDER BY generated_at DESC`.
- **Alternatives considered**: Index `generated_at` only; application cache; Redis (new library, constitution V).
