# Tasks: Faster recipe list

**Input**: Design documents from `/specs/011-recipe-list-speed/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included — constitution III (test-first) and plan.md.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

**Purpose**: Helper module the stories will fill. No new packages.

- [x] T001 Create `lib/recipeList.ts` with exported stubs (`recipeListQueryString`, `hasRecipeMethod`, `upsertRecipeInList`, `removeRecipeFromList`)

---

## Phase 2: Foundational (Blocking)

**Purpose**: Testable list rules before API or UI changes.

**⚠️ CRITICAL**: No user story work until this phase is complete

- [x] T002 [P] Write failing tests in `lib/recipeList.test.ts` for query string from include-public only (no user/auth in the URL)
- [x] T003 [P] Write failing tests in `lib/recipeList.test.ts` for `hasRecipeMethod` (missing keys vs empty arrays)
- [x] T004 [P] Write failing tests in `lib/recipeList.test.ts` for `upsertRecipeInList` (prepend new, replace existing) and `removeRecipeFromList`
- [x] T005 Implement query string, method gate, upsert, and remove in `lib/recipeList.ts`

**Checkpoint**: `npm test` covers list URL, card-vs-detail, and in-place list edits

---

## Phase 3: User Story 1 - Cookbook appears in one trip (P1) 🎯 MVP

**Goal**: Browse is session + SELECT of card fields. No schema migrate. Client fetches once per include-public toggle.

**Independent Test**: Open Recipes signed in; one list GET; payload has no ingredients/steps; hydrating auth does not refetch.

- [x] T006 [US1] Add `listRecipeCards` in `lib/db.ts` (card columns only; no `ensureAccountsSchema`; same viewer filters as `listRecipes`)
- [x] T007 [US1] Change `GET` in `app/api/recipes/route.ts` to call `listRecipeCards` and stop calling `setupDatabase`
- [x] T008 [US1] Point Recipes list fetch at `recipeListQueryString({ includePublic })` with deps `[includePublic]` only in `app/recipes/RecipesClient.tsx`

**Checkpoint**: Cards load once; browse does not migrate; Settings/retag still use full `listRecipes`

---

## Phase 4: User Story 2 - Opening a recipe still has the full method (P2)

**Goal**: View/edit load `GET /api/recipes/:id` when the card has no method arrays.

**Independent Test**: Open a card and Edit; ingredients and steps are present; save still persists the full recipe.

- [x] T009 [US2] Remove `ensureAccountsSchema` from `getRecipeById` in `lib/db.ts`; keep returning full rows including ingredients and steps
- [x] T010 [US2] In `app/recipes/RecipesClient.tsx`, load detail via `GET /api/recipes/:id` before view, edit, and `?open=` / `?edit=` deep links; toast and abort if that GET fails

**Checkpoint**: Grid stays slim; method appears only after detail load

---

## Phase 5: User Story 3 - Saving does not reload the whole cookbook (P2)

**Goal**: Create, update, delete, duplicate, and publish patch local list state.

**Independent Test**: Save a title; card updates; no second cookbook GET.

- [x] T011 [US3] Replace post-write `fetchRecipes()` in `app/recipes/RecipesClient.tsx` with `upsertRecipeInList` / `removeRecipeFromList` for create, update, delete, duplicate, and publish/unpublish

**Checkpoint**: Writes update the grid from the action response

---

## Phase 6: User Story 4 - Owner and public lookups stay cheap (P3)

**Goal**: Indexes for owner+recency and visibility+recency.

**Independent Test**: Schema ensure/setup creates `idx_recipes_owner_created` and `idx_recipes_visibility_created`.

- [x] T012 [US4] Add `CREATE INDEX IF NOT EXISTS` for `(owner_id, created_at DESC)` and `(visibility, created_at DESC)` in `setupDatabase` and `ensureAccountsSchema` in `lib/db.ts`

**Checkpoint**: List filters have matching indexes; list GET still does not create them

---

## Phase 7: Polish

- [x] T013 Confirm Planner (`app/planner/PlannerClient.tsx`) and shopping (`app/shopping-list/ShoppingClient.tsx`) still consume card fields; ingredient-categories and retag still use full `listRecipes`
- [x] T014 Run `npm test` and gitleaks on the working tree per constitution workflow

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Immediate
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **US1 (Phase 3)**: After Foundational — MVP
- **US2 (Phase 4)**: After US1 (detail fetch assumes card list)
- **US3 (Phase 5)**: After US1 (patch assumes local list)
- **US4 (Phase 6)**: Independent of US2/US3 after Foundational; can follow US1
- **Polish**: After desired stories

### User Story Dependencies

- **US1 (P1)**: No dependency on other stories
- **US2 (P2)**: Needs card-shaped list from US1
- **US3 (P2)**: Needs local list from US1
- **US4 (P3)**: Independent indexes

### Parallel Opportunities

- T002, T003, T004 can be written together in `lib/recipeList.test.ts`
- US4 (T012) can proceed in parallel with US2/US3 once T006 exists

### MVP

Phases 1–3 (helpers + card list + single fetch). Then US2 (open still works), US3 (save patch), US4 (indexes).

## Implementation Strategy

1. Tests for `lib/recipeList.ts` then implementation
2. `listRecipeCards` + GET without setup + client query string
3. Detail fetch on open/edit
4. Patch on write
5. Indexes
6. `npm test` + secret scan
