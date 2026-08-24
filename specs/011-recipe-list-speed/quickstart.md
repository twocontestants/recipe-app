# Quickstart: Faster recipe list

## Prerequisites

- Postgres (`POSTGRES_URL`) with kitchen tables already created (`/api/setup` once).
- `npm install`

## Checks

1. Open Recipes signed in. Network: one `GET /api/recipes` (no `setup` and no second list GET when the account name appears). Cards show titles/images. Response bodies do not include `ingredients` or `steps`.
2. Toggle include public library: a second `GET /api/recipes?includePublic=1`. Toggle off: `GET /api/recipes` without that flag.
3. Open a card: `GET /api/recipes/:id` then ingredients and steps appear. Edit is filled from that payload, not blank method fields.
4. Change a title and save: the card updates; there is no new `GET /api/recipes`. Delete removes the card; duplicate/publish update from the action response.
5. Planner picker and shopping still list recipes by title (card fields are enough).
6. Settings ingredient dictionary still lists ingredients (full-recipe read, not the card list).

## Tests

```bash
npm test
```

Expect coverage of list query string (no user in the URL), `hasRecipeMethod`, and upsert/remove helpers (no live Postgres).
