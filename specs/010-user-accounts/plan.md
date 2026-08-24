# Implementation Plan: Per-user accounts and public recipe library

**Branch**: `cursor/user-accounts-0508` | **Date**: 2026-08-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-user-accounts/spec.md`

## Summary

Turn the shared household kitchen into per-account kitchens. Sign-in uses email (or the seeded Jessica name) plus password. Sessions live in Postgres, not process memory. Recipes, planner, shopping lists, and settings are scoped to the signed-in account. Guests may browse public recipes. Publishers may mark their own recipes public. Anyone can plan a public recipe as a live reference and must duplicate it to edit. Moderators grant publish rights and can unpublish. Existing rows belong to a seeded Jessica Moderator account; her password comes from the host environment.

## Technical Context

**Language/Version**: TypeScript 5 / React 18 / Next.js 14 App Router

**Primary Dependencies**: Existing stack (`next`, `pg`, `react`). Node `crypto` (scrypt) for password hashes. No new auth libraries.

**Storage**: Vercel/Neon Postgres. New tables: `users`, `sessions`, `recipe_ratings`, `recipe_notes`. Owner/visibility columns on existing kitchen tables. Session rows in Postgres (not an in-memory map).

**Testing**: Vitest — pure helpers for roles, visibility, password hashing, session cookie parsing, and recipe-list filters. Constitution III: tests before behavior changes.

**Target Platform**: Household web app (AU phones, UTC host). Custom `server.js` + Socket.IO.

**Project Type**: Web application

**Performance Goals**: Same library/planner load as today for a single kitchen.

**Constraints**: Constitution V — no new libraries. VI — Jessica’s password and session secrets from env; fail closed; never commit. VII — kitchen days stay `YYYY-MM-DD`. Sessions must survive process restart.

**Scale/Scope**: Small number of cooks; one public library; all current API routes become auth-aware.

## Constitution Check

- I Household-first: sign-in, publish toggle, and planner picker stay tappable on a phone; keyboard must not cover password fields.
- II Extract what you test: role/visibility/session helpers in `lib/` (no Next runtime in unit tests).
- III Test-first: failing tests for “guest cannot plan”, “cook cannot publish”, “foreign private recipe hidden”, “session survives restart (store is Postgres)” before wiring routes.
- V Simplicity: cookie + Postgres session table + scrypt. No Passport/NextAuth.
- VI Secrets: `BOOTSTRAP_OWNER_PASSWORD` and `SESSION_SECRET` from env; missing → fail closed; no hardcoded password fallback. Password from the cook is not written into specs or examples.
- VII Kitchen dates: planner still stores `planned_on` as `YYYY-MM-DD`.

Post-design: still passes. No complexity table.

## Project Structure

### Documentation (this feature)

```text
specs/010-user-accounts/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── user-accounts.md
└── tasks.md
```

### Source Code (repository root)

```text
lib/auth.ts                 # password hash, session token, cookie name
lib/auth.test.ts
lib/roles.ts                # Cook / Publisher / Moderator rules
lib/roles.test.ts
lib/visibility.ts           # who may see / edit / publish a recipe
lib/visibility.test.ts
lib/db.ts                   # users, sessions, owner columns, ratings, notes
app/api/auth/register/route.ts
app/api/auth/login/route.ts
app/api/auth/logout/route.ts
app/api/auth/me/route.ts
app/api/recipes/...         # scoped list, public flag, duplicate
app/api/recipes/[id]/rating/route.ts
app/api/recipes/[id]/notes/route.ts
app/api/planner/...         # per-user
app/login/page.tsx
components/Sidebar.tsx      # hide Planner/Shopping/Settings when signed out
components/AddToPlannerModal.tsx
server.js                   # planner socket rooms per user
.env.local.example          # SESSION_SECRET, BOOTSTRAP_OWNER_PASSWORD placeholders
```

**Structure Decision**: Stay in the existing Next.js app. Auth helpers in `lib/`. HTTP-only session cookie. Postgres is the session store.

## Complexity Tracking

No constitution violations.
