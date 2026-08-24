# Data model: Faster recipe list

No new tables. Same `recipes` row; two read shapes and two indexes.

## Recipe card (list)

Returned by `GET /api/recipes`. Enough to draw a grid tile and decide edit vs duplicate.

| Field | Notes |
|-------|--------|
| id | UUID |
| title | |
| description | Short text on the card |
| source_url | Shopping list maps titles to sources |
| image_url | Card image |
| servings, prep_time, cook_time | Card meta |
| tags, primary_protein | Filters / badge |
| created_at, updated_at | Recency |
| owner_id, owner_display_name | Owner chip |
| visibility | `private` \| `public` |
| can_edit, can_publish | Viewer permissions |
| my_rating | Personal stars when signed in (grid must not flash after rating from detail) |

Must **not** include: `ingredients`, `steps`, `my_note`.

Rules:

- Guest: public cards only.
- Signed in, default: owner’s cards.
- `?includePublic=1`: owner’s plus others’ public.
- `?ownedOnly=1`: owner’s only (unchanged, unused by the Recipes toggle).

## Recipe detail (open / edit)

Returned by `GET /api/recipes/:id` and by create/update/duplicate/publish. Card fields plus:

| Field | Notes |
|-------|--------|
| ingredients | JSONB array |
| steps | JSONB string array |
| my_note | Personal note when signed in |

Rules:

- Same view permission as today (`canViewRecipe`). 404 if hidden.
- Client treats missing `ingredients`/`steps` as “not loaded”. Present arrays (even empty) mean the method is loaded.
- Edit/view must load detail before filling the editor or showing the method.

## Cookbook filter

| Field | Source |
|-------|--------|
| viewer | Session cookie (`optionalUser`). Not a query param. |
| includePublic | Query `includePublic=1` from the UI toggle only |

Learning `user` on the client after mount is not a filter change.

## Indexes (recipes)

| Name | Definition | Serves |
|------|------------|--------|
| idx_recipes_created | `(created_at DESC)` | existing |
| idx_recipes_owner_created | `(owner_id, created_at DESC)` | “my kitchen” list |
| idx_recipes_visibility_created | `(visibility, created_at DESC)` | public library list |

Created with `IF NOT EXISTS` from `setupDatabase` and `ensureAccountsSchema`. Not from list GET.

## List state (client)

In-memory `Recipe[]` on Recipes:

- Initial fill: card list.
- Open/edit: replace that id with the detail payload.
- Create: prepend the create response.
- Update / duplicate / publish: replace by id from the action response.
- Delete: remove by id.

Planner and shopping may keep their own fetches of the card list; they must not require method text.
