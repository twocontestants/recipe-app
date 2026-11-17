# Tasks: Remove public recipes

**Input**: Design documents from `/specs/017-remove-public-recipes/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Phase 1: Setup

- [x] T001 Create feature artifacts under `specs/017-remove-public-recipes/` and branch `cursor/remove-public-recipes-87a2`

## Phase 2: Foundational (lib + schema)

- [x] T002 [P] Rewrite `lib/visibility.ts` + `lib/visibility.test.ts` for owner-only access (no public / publish helpers as product APIs)
- [x] T003 [P] Simplify `lib/roles.ts` + `lib/roles.test.ts` to `cook` | `moderator`; drop `canPublishOwn`
- [x] T004 Migrate in `lib/db.ts`: force `visibility` private; demote publishers; tighten role CHECK; simplify `recipeListFilter` to owner-only; drop public backfill
- [x] T005 Simplify `lib/recipeList.ts` + tests (no `includePublic` query string)

## Phase 3: User Story 1+2 — APIs & Recipes UI (P1)

- [x] T006 Require auth on `GET /api/recipes`; remove includePublic/`can_publish` from `app/api/recipes/route.ts` and detail routes
- [x] T007 Delete `app/api/recipes/[id]/publish/route.ts` and `app/api/recipes/[id]/unpublish/route.ts`
- [x] T008 Update `app/recipes/RecipesClient.tsx` (+ tests): sign-in gate, no public toggle, “My Recipes” only
- [x] T009 Update `app/recipes/[id]/RecipePageClient.tsx` (+ tests) and `components/RecipeDetail.tsx` (+ tests): remove publish UI and public labeling

## Phase 4: Planner + Settings (P1/P2)

- [x] T010 Planner fetches owned recipes only (`app/planner/PlannerClient.tsx` and related tests)
- [x] T011 Settings role UI + `app/api/auth/users/[id]/role/route.ts`: cook/moderator only; rewrite intro copy

## Phase 5: Polish

- [x] T012 Update `README.md` for private kitchens / no guest public library
- [x] T013 Run `npm test` and fix remaining call sites
