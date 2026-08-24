# Data model: Per-user accounts

## Users

| Column | Type | Notes |
|--------|------|--------|
| id | UUID | PK |
| login_name | TEXT UNIQUE | Jessica’s is `Jessica`. New accounts use email (case-insensitive unique). |
| display_name | TEXT | Shown on public recipes |
| password_hash | TEXT | scrypt output (salt + hash) |
| role | TEXT | `cook` \| `publisher` \| `moderator` |
| created_at | TIMESTAMPTZ | |

Rules:

- New self-service accounts: `role = cook`, `login_name` = email.
- Jessica: `login_name = Jessica`, `role = moderator`, created at setup.
- Cannot update role such that zero moderators remain.

## Sessions

| Column | Type | Notes |
|--------|------|--------|
| id | TEXT PK | 32-byte hex (or 64 hex chars) random session id |
| user_id | UUID | FK users, ON DELETE CASCADE |
| expires_at | TIMESTAMPTZ | Weeks of inactivity from last use or from issue |
| created_at | TIMESTAMPTZ | |

Cookie: HTTP-only, `Secure` in production, `SameSite=Lax`, name `mise_session`, value = `sessions.id`.

On each authenticated request, optionally slide `expires_at`. Logout deletes the row.

## Recipe ownership and visibility

Existing `recipes` table gains:

| Column | Type | Notes |
|--------|------|--------|
| owner_id | UUID NULL → NOT NULL after backfill | FK users |
| visibility | TEXT | `private` \| `public`, default `private` |

Backfill: `owner_id = Jessica`, `visibility = public` for existing rows.

A cook may edit contents only when `owner_id` is themselves. Publish/unpublish only when they are publisher/moderator **and** owner (moderators may set `visibility = private` on others’ public recipes without becoming owner).

Duplicate: insert a new row, `owner_id = current user`, `visibility = private`, copy fields, new id.

## Recipe ratings (personal)

| Column | Type |
|--------|------|
| user_id | UUID |
| recipe_id | UUID |
| stars | INTEGER 1–5 |
| updated_at | TIMESTAMPTZ |
| PK | (user_id, recipe_id) |

## Recipe notes (personal)

| Column | Type |
|--------|------|
| user_id | UUID |
| recipe_id | UUID |
| note | TEXT |
| updated_at | TIMESTAMPTZ |
| PK | (user_id, recipe_id) |

Empty note deletes the row.

## Planner, notes, shopping, settings

Add `owner_id UUID` (FK users) to:

- `meal_plans`
- `planner_notes`
- `shopping_lists`
- `app_settings` — replace global key with `(owner_id, key)` unique
- `ingredient_categories` — `(owner_id, name)` unique

Backfill `owner_id = Jessica`. Unique keys that were global become per-owner.

`meal_plans.recipe_id` still points at `recipes.id` (live reference). Planned-on remains `YYYY-MM-DD`.

## Visibility helpers (not tables)

`canViewRecipe(user, recipe)`:

- public → anyone (including guest)
- private → owner only

`canEditRecipe(user, recipe)`: signed in and owner.

`canPublish(user, recipe)`: owner and role in `{publisher, moderator}`.

`canUnpublishAny(user)`: role = moderator.

`canPlanRecipe(user, recipe)`: signed in and `canViewRecipe`.

## State: visibility

```text
private --(owner + publisher/moderator)--> public
public  --(owner + publisher/moderator, or any moderator)--> private
```

New recipes always enter `private`.
