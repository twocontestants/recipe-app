# Implementation Plan: Remove public recipes

**Branch**: `017-remove-public-recipes` | **Date**: 2026-10-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/017-remove-public-recipes/spec.md`

## Summary

Remove the public recipe library and all publish/share flows. Every recipe is private to its owner. Guests must sign in to use Recipes. Publisher-for-sharing goes away; migrate existing `public` rows to `private`. Starter recipes are deferred.

## Technical Context

**Language/Version**: TypeScript / Node.js (Next.js 14 App Router)

**Primary Dependencies**: Next.js, React, Vitest, `@vercel/postgres`

**Storage**: PostgreSQL (`recipes.visibility`, `users.role`)

**Testing**: Vitest unit/component tests (`npm test`)

**Target Platform**: Web (Vercel / Node server)

**Project Type**: Full-stack web application

**Performance Goals**: Same as today; list queries simplify to owner-only

**Constraints**: Constitution VI (no secrets); test-first for behavior changes; kitchen dates unchanged

**Scale/Scope**: Touch visibility helpers, recipe APIs, Recipes/Planner/Settings UI, roles, schema migration, README

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- I Household-first UX: Removing public toggle and publish buttons reduces chrome — pass
- II Extract what you test: Keep rules in `lib/visibility.ts` / `lib/roles.ts` — pass
- III Test-first: Update failing tests for private-only access before/with code — pass
- IV Planner overlay: Unchanged — pass
- V Simplicity: Drop includePublic / publish routes rather than feature-flag — pass
- VI No secrets: No credential changes — pass
- VII Kitchen dates: Unchanged — pass

## Project Structure

### Documentation (this feature)

```text
specs/017-remove-public-recipes/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── private-recipes.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
app/
├── api/recipes/                 # Drop includePublic; require auth for list
├── api/recipes/[id]/publish/    # Remove
├── api/recipes/[id]/unpublish/  # Remove
├── api/auth/users/[id]/role/    # cook | moderator only
├── recipes/                     # No public toggle; sign-in gate
├── recipes/[id]/                # No publish UI
├── planner/                     # Picker: owned recipes only
└── settings/                    # No Publisher grant copy
components/RecipeDetail.tsx
lib/visibility.ts
lib/roles.ts
lib/db.ts                        # Migration: public → private; role cleanup
lib/recipeList.ts
```

## Complexity Tracking

No constitution violations. Complexity decreases by removing dual list modes and publish paths.
