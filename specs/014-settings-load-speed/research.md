# Research: Faster settings load

## Stop schema work on browse

- **Decision**: `GET /api/ingredient-categories` and `GET /api/preferences` must not call `ensureAccountsSchema()`, `ensureAppSettingsTable()`, or `ensureIngredientCategoriesTable()`. `getAppSetting` / `getCategoryDictionary` become reads. Writes (`setAppSetting`, dictionary PUT/DELETE) and `/api/setup` keep ensuring schema.
- **Rationale**: First Settings (and Planner/Recipes/Shopping preferences) GET currently `CREATE TABLE`s and ALTERs owner columns. Same class of hang as schema work on the other pages. Production tables already exist.
- **Alternatives considered**: Keep the in-process `_appSettingsReady` / `_ingredientCategoriesReady` flags on GET (still pays first-request CREATE/ALTER).

## Dictionary without full recipes

- **Decision**: Settings dictionary loads `id` + `ingredients` for recipes the cook owns (`WHERE owner_id = $1`). No `steps`, no `SELECT r.*`, no ratings/notes joins, no users join. Retag keeps `listRecipes` (full rows).
- **Rationale**: The editor needs raw ingredient names, counts, and a few example wordings. Steps, ratings, and notes are unused. 011 already called this out as the remaining full-list consumer besides retag.
- **Alternatives considered**: Keep `listRecipes` (status quo). Unnest JSONB in SQL and return only names (harder to cap examples per recipe in one pass; JS aggregation is enough). A persisted dictionary table of every ingredient (write amplification).

## One preferences read

- **Decision**: `GET /api/preferences` uses one `SELECT key, value FROM app_settings WHERE owner_id = $1 AND key = ANY($2)`. Client still calls that endpoint once. Planner/Recipes/Shopping keep their existing preferences GET and inherit the cheaper server read.
- **Rationale**: Today two `getAppSetting` calls each ensure schema and hit the table once.
- **Alternatives considered**: Fold preferences into the dictionary GET (would couple week-start to the heavy path). Two keys stay two HTTP calls from other pages (those pages already do one GET that returned both keys).

## Account and prefs do not wait on the dictionary

- **Decision**: Keep AccountSettings and week-start / aisle-save controls outside the dictionary spinner. Dictionary GET stays parallel, not a gate for first paint of those controls. Cooks do not fetch `/api/auth/users`.
- **Rationale**: Already mostly true in the layout; the remaining cost is making the dictionary GET itself light so it does not stall the tab.
- **Alternatives considered**: Lazy-load the dictionary only when scrolled into view (extra UX; not needed once the GET is ingredients-only).

## Index

- **Decision**: No new index. `idx_recipes_owner_created (owner_id, created_at DESC)` already serves “my recipes”. `ingredient_categories` and `app_settings` already have `(owner_id, name)` / `(owner_id, key)` primary keys.
- **Rationale**: The dictionary filter is `owner_id = $1`. Adding another owner-only index would duplicate 011.
- **Alternatives considered**: GIN on `recipes.ingredients` (overkill). Application cache.
