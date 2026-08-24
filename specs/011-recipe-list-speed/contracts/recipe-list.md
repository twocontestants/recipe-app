# Contracts: Recipe list and detail

Cookie `mise_session` still decides the viewer. Permissions unchanged from user-accounts.

## GET /api/recipes

Must **not** run kitchen schema creation or column migration.

Query:

- `includePublic=1` — signed-in: own recipes plus others’ public. Guests: still public only.
- `ownedOnly=1` — signed-in: own recipes only.

Response: JSON array of **recipe cards**. Each object includes identity, title, image, times, servings, tags, description, `source_url`, visibility, owner display, `can_edit`, `can_publish`, and `my_rating` when signed in.

Each object MUST omit `ingredients` and `steps`. MUST omit `my_note` (notes load with detail).

## POST /api/recipes

Unchanged. 201 full recipe (including ingredients and steps). Client inserts that object into the grid; it does not re-GET the list.

## GET /api/recipes/:id

Must **not** run kitchen schema creation or column migration.

200: full recipe including `ingredients`, `steps`, and `my_note` when signed in. 404 if not viewable.

## PUT /api/recipes/:id

Unchanged. 200 full recipe. Client replaces that id in the grid.

## DELETE /api/recipes/:id

Unchanged. 200 `{ success: true }`. Client removes that id locally.

## POST /api/recipes/:id/duplicate | publish | unpublish

Unchanged. 200 full recipe. Client upserts that object; does not re-GET the list.

## GET /api/ingredient-categories and POST /api/recipes/retag

Still use the **full** recipe list (ingredients required). Not the card endpoint shape.

## UI

- Opening Recipes: one `GET /api/recipes` (+ `?includePublic=1` only if the toggle is on). Hydrating `user` from `/api/auth/me` MUST NOT issue another list GET.
- Toggling include-public: one new list GET with the updated query.
- Opening a card or Edit: `GET /api/recipes/:id` if that item has no method arrays yet.
- After create / save / delete / duplicate / publish: no list GET.
