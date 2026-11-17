# Contract: Private recipes only

## `GET /api/recipes`

- Requires session. Missing/expired → `401`.
- Returns only recipes where `owner_id` = session user.
- Query flags `includePublic` / `ownedOnly` are ignored or removed (no public expansion).
- Response does not need `can_publish`.

## `GET /api/recipes/:id`

- Requires ability to view: session user must be owner. Else `403` / `404`.
- Guests: not allowed to read.

## `POST /api/recipes/:id/publish` / `.../unpublish`

- Removed (404) or permanently disabled.

## `POST /api/auth/users/:id/role`

- Body `role` must be `cook` or `moderator` only.

## Client

- Recipes page: no include-public toggle; guests redirected to login.
- Recipe detail: no Make public / Make private.
- Planner: loads owned recipes only.
- Settings: no Publisher option / public-library moderator copy.
