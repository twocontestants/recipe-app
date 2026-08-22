# Tasks: Store planned dinners as calendar dates

**Input**: Design documents from `/specs/008-calendar-date-meals/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Required for inference, week spans, and date matching.

## Phase 1: Setup

- [x] T001 Add `specs/008-calendar-date-meals/` artifacts and point `.specify/feature.json` at it

## Phase 2: Foundational

- [x] T002 Write failing tests in `lib/plannerDate.test.ts` for `inferPlannedOn`, `coordsFromPlannedOn`, `weekSpanForStoredKey`, `mealOnDate`
- [x] T003 Implement `lib/plannerDate.ts`

## Phase 3: User Story 1 — Dinners sit on a real date (P1)

- [x] T004 [US1] Add/backfill `planned_on` (and rewrite week columns) in `lib/db.ts` and `scripts/setup-db.js`
- [x] T005 [US1] `addToMealPlan` / mapper persist and return `planned_on`; POST accepts date or week+day in `app/api/planner/route.ts`
- [x] T006 [US1] Planner and Recipes match and write `planned_on` (`PlannerClient.tsx`, `RecipesClient.tsx`, `lib/plannerDrag.ts`, `lib/plannerDaySheet.ts`, `lib/plannerDays.ts`)

## Phase 4: User Story 2 — Existing queries still work (P1)

- [x] T007 [US2] `getMealPlansForWeeks` / `getMealPlansInDateWindow` filter `planned_on` with `weekSpanForStoredKey` so Monday and Sunday keys both hit
- [x] T008 [US2] Migrate `planner_notes` to `note_on`; week-key note GET/POST still work (`lib/db.ts`, `app/api/planner-notes/route.ts`, PlannerClient notes)
- [x] T009 [US2] Shopping list generation uses date-matched meals (`app/api/shopping-lists/route.ts`, `GenerateListModal.tsx`)

## Phase 5: User Story 3 — Today is local (P2)

- [x] T010 [US3] Display “today” / this week stay on `localDateIso`; no `toISOString()` in match or write paths
- [x] T011 `npm test` (and typecheck)

## Parallel opportunities

- T002 then T003 (ordered).
- T007–T009 after T004.
