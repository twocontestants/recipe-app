# Quickstart: Per-user accounts

## Prerequisites

- Postgres (`POSTGRES_URL`)
- `npm install`

## Setup

```bash
# visit /api/setup once
```

Setup migrates kitchen tables. It does not create accounts. Sign in with an existing account, or register from the login page. Change password from Settings.

`npm run db:setup` only creates legacy kitchen tables — use `/api/setup` for owner columns.

## Checks

1. Signed out: Recipes shows public recipes. Planner/Shopping/Settings are absent. Nav has Sign in. Add-to-planner asks to sign in.
2. Register a new account: role is Cook; new recipe cannot be marked public. Nav does not show name or role.
3. As a Moderator, grant Publisher to that account. They can publish a recipe. Guest can open it.
4. As the second cook, add a public recipe to the planner. Edit is blocked. Duplicate creates a private copy they can edit.
5. Sign out from Settings, restart the Node process, sign in again — still signed in on the same browser (cookie still valid) because the session is in Postgres.
6. Second cook’s planner does not show the first cook’s private dinners.

## Tests

```bash
npm test
```

Expect coverage of roles, visibility, password hash round-trip, and session-store helpers (no live Postgres required for those units).
