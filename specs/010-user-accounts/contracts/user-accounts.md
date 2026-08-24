# Contracts: Auth, recipes, planner, ratings

Cookie on every mutating personal request: `mise_session`. Missing/expired → 401 for personal routes; guests still `GET` public recipes.

## Auth

### POST /api/auth/register

Body: `{ email, password, display_name }`. Creates `cook`. Sets session cookie. 409 if email taken.

### POST /api/auth/login

Body: `{ login, password }` where `login` is email or `Jessica`. Sets session cookie. 401 on mismatch.

### PATCH /api/auth/password

Body: `{ current_password, new_password }`. 401 if unsigned or current password is wrong. 400 if the new password is missing or matches the current one. Stays signed in.

### POST /api/auth/logout

Deletes session row, clears cookie.

### GET /api/auth/me

401 if unsigned. Else `{ id, login_name, display_name, role }`.

### PATCH /api/auth/users/:id/role (moderator)

Body: `{ role }`. 403 if not moderator. 409 if it would remove the last moderator.

## Recipes

### GET /api/recipes

- Guest: public recipes only.
- Signed in, default: owner’s recipes.
- `?includePublic=1`: owner’s plus other public.
- `?ownedOnly=1`: owner’s only (planner “private” filter).

Each recipe includes `owner_id`, `owner_display_name`, `visibility`, `can_edit`, and the caller’s `rating` / `note` when signed in.

### POST /api/recipes

401 if guest. Creates private recipe owned by caller.

### GET /api/recipes/:id

404 if private and not owner (do not leak existence to the wrong cook). Public readable by guests.

### PUT /api/recipes/:id

403 unless owner. Cannot change `owner_id`. `visibility` change allowed only if `canPublish` (or moderator unpublish of someone else’s public recipe via a dedicated action).

### POST /api/recipes/:id/publish and POST /api/recipes/:id/unpublish

Publish: 403 unless owner and publisher/moderator. Unpublish own: same. Unpublish others: moderator.

### POST /api/recipes/:id/duplicate

401 if guest. 404 if not viewable. Creates private copy owned by caller. Does not alter planner.

### PUT /api/recipes/:id/rating

Body: `{ stars: 1-5 | null }`. 401 guest. 404 if not viewable.

### PUT /api/recipes/:id/notes

Body: `{ note: string }`. Empty clears. Same auth as rating.

## Planner / shopping / settings / categories

All GET/POST/PUT/DELETE require a session. Queries filter `owner_id = me`. Guests 401.

Planner POST may reference any viewable recipe id (own or public). Does not copy the recipe.

## UI

- Guest nav: Recipes, Sign in / Create account. No Planner, Shopping, Settings.
- Signed-in nav: Recipes, Planner, Shopping, Settings. Sign out lives in Settings, not the nav pane.
- Settings Account section: change password (current + new + confirm) and Sign out.
- Recipe list toggle “Include public library” (default off).
- Planner picker includes public recipes; control to show own/private only.
- Non-owners: view + plan + duplicate + personal rating/note; no edit form.
- Moderators: extra Settings section to change roles and unpublish.
