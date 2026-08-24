# Implementation Plan: Faster recipe list

**Branch**: `cursor/recipe-list-speed-0508` | **Date**: 2026-08-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-recipe-list-speed/spec.md`

## Summary

Make opening Recipes a single light read: no kitchen schema work on browse, one list fetch keyed only by the include-public toggle (session cookie is the viewer), card fields on the list, full method on open/edit, local list patch after write, and owner/public recency indexes. No new libraries.

## Technical Context

**Language/Version**: TypeScript 5 / React 18 / Next.js 14 App Router

**Primary Dependencies**: Existing stack (`next`, `pg`, `react`). No new packages.

**Storage**: Postgres `recipes` (same table). New indexes only: `(owner_id, created_at DESC)` and `(visibility, created_at DESC)`. No new tables.

**Testing**: Vitest — pure helpers for list query string, card vs method presence, and in-place list insert/replace/remove. Constitution III: tests before behavior changes.

**Target Platform**: Household web app. Custom `server.js` + Socket.IO (unchanged).

**Project Type**: Web application

**Performance Goals**: Typical household cookbook (tens of recipes) draws cards after one list GET that does not ship ingredients or steps. Save does not re-download the cookbook.

**Constraints**: Constitution V — no new libraries (no Redis, no image CDN). VI — no secrets. VII — kitchen dates untouched. Schema migration stays on `/api/setup` and writes, not on list/detail GET.

**Scale/Scope**: Existing recipe APIs and Recipes / Planner / Shopping clients. Image download size is out of scope.

## Constitution Check

- I Household-first: Recipes grid still tappable; loading spinner at most once; no extra overlay chrome.
- II Extract what you test: list URL, card-vs-detail, and list patch helpers in `lib/recipeList.ts`.
- III Test-first: failing tests for “query string ignores client user”, “cards omit method”, “upsert/remove without a full reload” before wiring the client/API.
- V Simplicity: slimmer SELECT + local state merge. No cache service.
- VI Secrets: unchanged; no credentials in specs or source.
- VII Kitchen dates: unused by this feature.

Post-design: still passes. No complexity table.

## Project Structure

### Documentation (this feature)

```text
specs/011-recipe-list-speed/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── recipe-list.md
└── tasks.md
```

### Source Code (repository root)

```text
lib/recipeList.ts              # query string, hasRecipeMethod, upsert/remove
lib/recipeList.test.ts
lib/db.ts                      # listRecipeCards; drop schema ensure on read; indexes
app/api/recipes/route.ts       # GET: no setupDatabase; return cards
app/api/recipes/[id]/route.ts  # GET stays full recipe; no schema ensure
app/recipes/RecipesClient.tsx  # one list fetch; load detail on open/edit; patch on save
app/planner/PlannerClient.tsx  # unchanged consumer of card fields
app/shopping-list/ShoppingClient.tsx
app/api/ingredient-categories/route.ts  # still uses full listRecipes
app/api/recipes/retag/route.ts          # still uses full listRecipes
```

**Structure Decision**: Stay in the existing Next.js app. Extract list rules to `lib/`. Keep full-recipe `listRecipes` for Settings dictionary and retag.

## Complexity Tracking

No constitution violations.
