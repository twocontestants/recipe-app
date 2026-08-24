# Quickstart: Per-user accounts

## Prerequisites

- Postgres (`POSTGRES_URL`)
- Host env `BOOTSTRAP_OWNER_PASSWORD` set (not in git)
- `npm install`

## Setup

```bash
npm run db:setup
# or visit /api/setup once
```

Setup fails if `BOOTSTRAP_OWNER_PASSWORD` is missing. After success, sign in as **Jessica** with that password. Existing recipes appear as Jessica’s public library; planner and settings are hers alone.

## Checks

1. Signed out: Recipes shows public recipes. Planner/Shopping/Settings are absent. Add-to-planner asks to sign in.
2. Register a new account: role is Cook; new recipe cannot be marked public.
3. As Jessica (Moderator), grant Publisher to that account. They can publish a recipe. Guest can open it.
4. As the second cook, add Jessica’s public recipe to the planner. Edit is blocked. Duplicate creates a private copy they can edit.
5. Sign out, restart the Node process, sign in again — still Jessica or the second cook without re-entering a password on the same browser (cookie still valid). After restart, a still-valid cookie works because the session is in Postgres.
6. Second cook’s planner is empty of Jessica’s dinners (except the public recipe they added themselves).

## Tests

```bash
npm test
```

Expect coverage of roles, visibility, password hash round-trip, and session-store helpers (no live Postgres required for those units).
