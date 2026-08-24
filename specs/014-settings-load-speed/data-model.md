# Data model: Faster settings load

No new tables. Same `recipes`, `ingredient_categories`, and `app_settings` rows; slimmer reads.

## Preferences (one read)

`GET /api/preferences` returns `{ categoryPrefMode, weekStartDay }` from one `app_settings` query for this owner and those two keys.

Must **not** create tables or migrate columns.

## Ingredient dictionary

Built from:

- Owned recipe ingredient lines: `id`, `ingredients` only.
- Override map: `ingredient_categories` for this owner (`name`, `category`).

Each row: `name`, `category`, `autoCategory`, `source` (`custom` | `auto`), `count`, `examples` (up to three raw wordings).

Leftover overrides with `count: 0` remain visible.

Must **not** include recipe `steps`, ratings, or notes.

## Full recipe (retag)

Unchanged `listRecipes` (`SELECT r.*` plus rating/note joins). Not used by Settings GET.

## Indexes (existing)

| Name | Definition | Serves |
|------|------------|--------|
| idx_recipes_owner_created | `(owner_id, created_at DESC)` | “my recipes” for the dictionary |
| ingredient_categories PK | `(owner_id, name)` | override map |
| app_settings PK | `(owner_id, key)` | preferences |

No new index in this feature.

## Client load

- Account controls from the existing session (no extra cookbook GET).
- One `GET /api/preferences`.
- One `GET /api/ingredient-categories` (ingredients-only). Parallel with preferences; does not hide account/week-start.
- Moderator-only: `GET /api/auth/users`.
