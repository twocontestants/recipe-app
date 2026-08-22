# Tasks: Planner drag-to-move meals

**Input**: Design documents from `/specs/003-planner-drag-move/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/planner-drag.md, quickstart.md

**Tests**: Required (FR-009; constitution is test-first)

## Phase 1: Setup

- [x] T001 Confirm feature docs exist under `specs/003-planner-drag-move/`

## Phase 2: Foundational

- [x] T002 Create `lib/plannerDrag.ts` exporting types and functions from `specs/003-planner-drag-move/contracts/planner-drag.md` (stubs that fail tests are OK)

## Phase 3: User Story 1 - Drag onto another day (P1)

**Goal**: Drag a saved meal onto another day this week.

**Independent Test**: Threshold and day hit-test tests pass; card drag moves the meal.

### Tests

- [x] T003 [P] [US1] Write failing tests in `lib/plannerDrag.test.ts` for threshold, day hit-test, and `shouldAllowDrag`

### Implementation

- [x] T004 [US1] Implement threshold, day resolve, and `shouldAllowDrag` in `lib/plannerDrag.ts`
- [x] T005 [US1] Add pointer drag between days on cards in `app/planner/PlannerClient.tsx`

## Phase 4: User Story 2 - Week-edge strips (P1)

**Goal**: Top/bottom bands show Previous / Next week; drop keeps the same weekday and shows that week.

### Tests

- [x] T006 [P] [US2] Write failing tests in `lib/plannerDrag.test.ts` for edge-band priority and `adjacentWeekIso`

### Implementation

- [x] T007 [US2] Implement edge-band resolve and `adjacentWeekIso` in `lib/plannerDrag.ts`
- [x] T008 [US2] Show week strips and move across weeks in `app/planner/PlannerClient.tsx`

## Phase 5: User Story 3 - No fight with menu / failed save (P2)

- [x] T009 [US3] Skip drag from the meal-options button; cancel on no target; keep move rollback in `app/planner/PlannerClient.tsx`

## Phase 6: Polish

- [x] T010 Run `npm test`
- [x] T011 Mark completed tasks in this file

## Dependencies

- T001 → T002 → T003/T006 → T004/T007 → T005/T008/T009 → T010
