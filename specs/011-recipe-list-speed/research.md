# Research: Faster recipe list

## Stop schema work on browse

- **Decision**: `GET /api/recipes` must not call `setupDatabase()`. `listRecipeCards` and `getRecipeById` must not call `ensureAccountsSchema()`. Writes and `/api/setup` keep ensuring schema. Indexes are created in `setupDatabase` and `ensureAccountsSchema` (first write or explicit setup).
- **Rationale**: Browse currently waits on `CREATE TABLE` / `ALTER TABLE` / primary-key rewrites. Login already stopped doing this (hung sign-in). Same rule for the cookbook. Production tables already exist; spec allows fail-closed if setup never ran.
- **Alternatives considered**: Keep a cached `_accountsReady` flag on GET (still pays the first-request ALTER, and GET would still be a migrate path). A separate migrator process (extra ops).

## List URL ignores client auth hydrate

- **Decision**: Pattern A. `GET /api/recipes` query string is only `includePublic=1` when the public-library toggle is on. The session cookie is the viewer. Recipes client fetch depends on `includePublic` only, not on `user`.
- **Rationale**: `AuthProvider` fills `user` after `GET /api/auth/me`. Today `qs = user && includePublic` and `[user, includePublic]` deps cause a second identical cookbook download. Cookies are already on the first same-origin `fetch`.
- **Alternatives considered**: Wait for `user` before the first fetch (adds latency). Pattern B: key the list on `user?.id` (second fetch by design). Include a `viewer` query param (redundant with the cookie, leaks ids).

## Card list vs full list

- **Decision**: New `listRecipeCards` SELECT of card columns only (no `ingredients`, `steps`, or `my_note`). Keep `listRecipes` (`SELECT r.*`) for `/api/ingredient-categories` and `/api/recipes/retag`, which need every ingredient line. `GET /api/recipes/:id` remains the full recipe for view/edit.
- **Rationale**: Cards do not render method. JSONB ingredients/steps dominate payload. Settings dictionary and retag are rare and must stay complete. Planner picker and shopping source-URL map only need `id`, `title`, `image_url`, `source_url`.
- **Alternatives considered**: One list endpoint with `?fields=card` (more API surface than needed). Two tables (constitution V). Always return full recipes (status quo, rejected).

## Detecting “needs a detail fetch”

- **Decision**: A recipe has a method when `ingredients` and `steps` are both arrays (including empty). Cards omit those keys. `hasRecipeMethod` is the type/runtime gate before view or edit.
- **Rationale**: Empty method on a real recipe (`[]`) must still skip a redundant GET. Missing keys mean “not loaded”, not “no ingredients”.
- **Alternatives considered**: A `has_method` boolean on every card (extra contract). Treat empty arrays as unloaded (would refetch every blank recipe).

## Patch the grid after writes

- **Decision**: Create/update/duplicate/publish responses already return the recipe. Client `upsertRecipeInList` (replace by id, or prepend if new). Delete `removeRecipeFromList`. Do not call the list GET after those actions. Ratings/notes already patch locally.
- **Rationale**: Reloading the cookbook after save is what makes save feel like opening the page again.
- **Alternatives considered**: SWR/React Query (new library). Keep `fetchRecipes()` after save (rejected).

## Indexes

- **Decision**: `CREATE INDEX IF NOT EXISTS idx_recipes_owner_created ON recipes (owner_id, created_at DESC)` and `idx_recipes_visibility_created ON recipes (visibility, created_at DESC)`. Keep existing `idx_recipes_created`.
- **Rationale**: Signed-in default is `owner_id = $1 ORDER BY created_at DESC`. Guests are `visibility = 'public' ORDER BY created_at DESC`. Composite indexes match those filters. `IF NOT EXISTS` is the same style as other kitchen indexes.
- **Alternatives considered**: Partial index `WHERE visibility = 'public'` only (less general). Application-level cache (new moving part).
