# Contracts: Settings load

Cookie `mise_session` required. Permissions unchanged.

## GET /api/preferences

Must **not** run kitchen schema creation or column migration.

One read of this cook’s `categoryPrefMode` and `weekStartDay`. Response shape unchanged: `{ categoryPrefMode, weekStartDay }`.

## PUT /api/preferences

Unchanged. May still ensure schema on write.

## GET /api/ingredient-categories

Must **not** run kitchen schema creation or column migration.

Must **not** load method steps, ratings, or notes.

Response unchanged: `{ entries, categories }` where each entry has `name`, `category`, `autoCategory`, `source`, `count`, `examples`.

## PUT / DELETE /api/ingredient-categories

Unchanged. May still ensure schema on write.

## GET /api/recipes/retag

Unchanged. Full recipes including ingredients.

## GET /api/auth/users

Unchanged. Moderators only. Not called for Cooks.

## UI

- Opening Settings: account controls visible immediately; one preferences GET; one dictionary GET that omits steps.
- Dictionary spinner does not cover account or week-start / aisle-save controls.
- Cooks do not request the moderator user list.
