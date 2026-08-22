# Tasks: Planner hold-to-drag with day rail

**Input**: Design documents from `/specs/004-planner-hold-drag/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/planner-drag.md, quickstart.md

**Tests**: Required (FR-010; constitution is test-first)

## Phase 1: Setup

- [x] T001 Confirm feature docs exist under `specs/004-planner-hold-drag/`

## Phase 2: Foundational

- [x] T002 Rewrite `lib/plannerDrag.ts` to export the hold/rail contract in `specs/004-planner-hold-drag/contracts/planner-drag.md` (stubs that fail tests are OK)

## Phase 3: User Story 1 - Hold then drop on this week (P1)

**Goal**: Hold to lift; tap and early-slide do not move; drop onto another day this week.

**Independent Test**: Hold/movement tests pass; week-day hit-test passes; card hold moves the meal.

### Tests

- [x] T003 [P] [US1] Write failing tests in `lib/plannerDrag.test.ts` for `holdArmed`, movement threshold, `shouldAllowDrag`, and week-day hit-test

### Implementation

- [x] T004 [US1] Implement hold, movement, and week-day resolve in `lib/plannerDrag.ts`
- [x] T005 [US1] Replace instant drag in `app/planner/PlannerClient.tsx` with hold-to-arm (no pointer capture until armed; no `touch-action: none` until armed)

## Phase 4: User Story 2 - Ten-day rail (P1)

**Goal**: Rail of ten surrounding days; dotted/solid occupancy; drop onto rail or week list; remove edge strips.

### Tests

- [x] T006 [P] [US2] Write failing tests in `lib/plannerDrag.test.ts` for `surroundingTenDays`, occupancy/titles, and rail-over-week hit-test

### Implementation

- [x] T007 [US2] Implement window, occupancy, titles, storage-week helper, and rail resolve in `lib/plannerDrag.ts`
- [x] T008 [US2] Show the right-hand rail on hold and drop onto rail dates in `app/planner/PlannerClient.tsx`; remove Previous/Next week strips

## Phase 5: User Story 3 - Menu / failed save (P2)

- [x] T009 [US3] Skip hold from the meal-options button and `tmp-*` ids; cancel on no target; keep move rollback in `app/planner/PlannerClient.tsx`

## Phase 6: Polish

- [x] T010 Run `npm test` and `npm run build`
- [x] T011 Mark completed tasks in this file

## Dependencies

- T001 → T002 → T003/T006 → T004/T007 → T005/T008/T009 → T010
