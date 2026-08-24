# Tasks: Faster planner load

**Input**: Design documents from `/specs/012-planner-load-speed/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included — constitution III (test-first) and plan.md.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [x] T001 Create `lib/plannerLoad.ts` with exported stubs (`sameDisplayWeek`, `notesByDisplayIndex`, `displayWeekDateRange`)

---

## Phase 2: Foundational (Blocking)

- [x] T002 [P] Write failing tests in `lib/plannerLoad.test.ts` for same-day week identity and notes mapping from `YYYY-MM-DD` keys
- [x] T003 Implement week identity and notes mapping in `lib/plannerLoad.ts`

**Checkpoint**: `npm test` covers week identity and notes mapping

---

## Phase 3: User Story 1 - The week appears in one meals trip (P1) 🎯 MVP

**Goal**: Browse is session + card meals SELECT. No schema migrate. No second load for the same week-start day. No extra weekStart GET on first paint.

**Independent Test**: Open Planner; one month-range meals GET; hydrating the same week-start day does not refetch.

- [x] T004 [US1] Add card vs full meal SELECT in `lib/db.ts`; `GET` in `app/api/planner/route.ts` uses cards and does not call `ensurePlannedOnColumns` / `ensureAccountsSchema`
- [x] T005 [US1] In `app/planner/PlannerClient.tsx`, key fetch on display-week iso; only `setWeekStart` when that iso changes; first paint uses `fetchMealsForMonths` only

**Checkpoint**: Week cards load once without migrate or duplicate week GETs

---

## Phase 4: User Story 2 - Opening the picker still has the cookbook (P2)

**Goal**: Cookbook loads when Add opens, not on first paint.

**Independent Test**: Open Planner without a cookbook GET; open Add and pick a recipe.

- [x] T006 [US2] Remove cookbook fetch from `fetchData` in `app/planner/PlannerClient.tsx`; load `/api/recipes?includePublic=1` when the picker opens if empty; recompute suggestions when recipes arrive

**Checkpoint**: Week shows without waiting on the cookbook

---

## Phase 5: User Story 3 - Notes still show for the week (P2)

**Goal**: One notes range GET for the display week.

**Independent Test**: Notes on two days appear from one from/to request.

- [x] T007 [US3] Add `getPlannerNotesInRange` in `lib/db.ts` (no schema ensure) and `from`/`to` on `GET` in `app/api/planner-notes/route.ts`
- [x] T008 [US3] Planner first paint uses one notes range GET and `notesByDisplayIndex` in `app/planner/PlannerClient.tsx`

**Checkpoint**: One notes request per visible week

---

## Phase 6: User Story 4 - Shopping still has the full method (P2)

**Goal**: Shopping POST still joins ingredients/steps.

**Independent Test**: Generate a list; ingredient lines present.

- [x] T009 [US4] Keep `includeMethod: true` on `getMealPlanForWeek` used in `app/api/shopping-lists/route.ts`

**Checkpoint**: Grid is cards; shopping generation is full

---

## Phase 7: User Story 5 - Owner lookups stay cheap (P3)

- [x] T010 [US5] Add `CREATE INDEX IF NOT EXISTS idx_meal_plans_owner_planned_on ON meal_plans (owner_id, planned_on)` in `ensurePlannedOnColumns` in `lib/db.ts`

**Checkpoint**: List filters have a matching index; planner GET still does not create it

---

## Phase 8: Polish

- [x] T011 Confirm generate-list and Recipes add-to-planner still work with week/range GETs; run `npm test` and gitleaks

---

## Dependencies & Execution Order

- Setup → Foundational → US1 (MVP) → US2 / US3 / US4 (US4 is mostly verifying T004’s full path) → US5 → Polish
- T002 before T003. T004 before T005 and T009.

## Implementation Strategy

1. Tests for `lib/plannerLoad.ts` then implementation
2. Card meals GET without schema ensure + client one-trip
3. Defer cookbook; notes range; index
4. `npm test` + secret scan
