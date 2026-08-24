# Data model: Faster shopping list load

No new tables. Same `shopping_lists` rows; two read shapes, contribution URL, computed source map, and one index.

## Shopping list meta (dropdown)

Returned by `GET /api/shopping-lists` with no `id`.

Fields: `id`, `name`, `subtitle`, `generated_at`, `recipe_ids`.

Must **not** include `items`, `checked_state`, `item_overrides`, `custom_items`, `category_labels`, `category_order`, or `item_order`.

## Shopping list detail (open list)

Returned by `GET /api/shopping-lists?id=`. Full row shape used today, plus optional `recipe_sources` (title → original URL) from a card-field lookup of `recipe_ids`.

Item lines include `contributions[]` with `recipe` (title) and optional `source_url` stored at generate time.

## Shopping contribution

| Field | Meaning |
|-------|---------|
| name | Recipe wording |
| amount / unit | This line’s quantity |
| recipe | Recipe title (pill label) |
| source_url | Original URL when known at generate time |

## Index (`shopping_lists`)

| Name | Definition | Serves |
|------|------------|--------|
| idx_shopping_lists_owner_generated | `(owner_id, generated_at DESC)` | “my lists, newest first” |

Created with `IF NOT EXISTS` after `owner_id` exists. Not from shopping GET.

## Client load

- Index: meta only. Newest list opens with one detail GET.
- No `GET /api/recipes` on Shopping mount.
- Generate: one meals query for all selected weeks with ingredients/steps.
- Preferences GET for category-pref mode stays (out of scope).
