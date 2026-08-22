# Tasks: Flexible week start setting

**Input**: Design documents from `/specs/002-week-start-setting/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/week-start.md, quickstart.md

**Tests**: Required (FR-009; constitution is test-first)

## Phase 1: Setup

- [x] T001 Confirm feature docs exist under `specs/002-week-start-setting/` (spec, plan, research, data-model, contracts, quickstart)

## Phase 2: Foundational

- [x] T002 Extend `lib/plannerDays.ts` with `parseWeekStartDay`, `startOfDisplayWeek`, `displayDays`, `displayDayIndex`, `storageCoords`, `storageWeeksForDisplayWeek` per `specs/002-week-start-setting/contracts/week-start.md` (stubs that fail tests are OK)

## Phase 3: User Story 1 - Choose any weekday (P1)

**Goal**: Settings persists any of seven weekdays; default and invalid values are Monday.

**Independent Test**: PUT/GET `weekStartDay`; junk reads as Monday.

### Tests

- [x] T003 [P] [US1] Write failing tests in `lib/plannerDays.test.ts` for `parseWeekStartDay` (seven names, 0–6, junk → monday)

### Implementation

- [x] T004 [US1] Implement `parseWeekStartDay` in `lib/plannerDays.ts`
- [x] T005 [US1] Add `weekStartDay` to GET/PUT in `app/api/preferences/route.ts`
- [x] T006 [US1] Add a Week starts on control in `app/settings/SettingsClient.tsx`

## Phase 4: User Story 2 - Planner and add-to-plan follow the setting (P1)

**Goal**: Display weeks, labels, and writes use the saved start day; stored Wednesday stays Wednesday.

**Independent Test**: Sunday start on 19 Aug 2026 begins 16 Aug; stored day 2 is still 19 Aug.

### Tests

- [x] T007 [P] [US2] Write failing tests in `lib/plannerDays.test.ts` for start-of-week, `displayDays`, storage overlap, and calendar-date stability from the contract

### Implementation

- [x] T008 [US2] Implement display/storage helpers in `lib/plannerDays.ts`
- [x] T009 [US2] Load the setting and remap days/writes in `app/planner/PlannerClient.tsx`
- [x] T010 [US2] Pass `weekStartsOn` through `app/recipes/RecipesClient.tsx` and `components/AddToPlannerModal.tsx`
- [x] T011 [US2] Use display weeks for this/next/last in `components/GenerateListModal.tsx`

## Phase 5: User Story 3 - Change again without losing meals (P2)

**Goal**: Failed saves keep the old value; math stays stable across two start-day flips.

### Tests

- [x] T012 [P] [US3] Assert in `lib/plannerDays.test.ts` that one stored Wednesday maps to the same calendar date under Sunday and Thursday starts

### Implementation

- [x] T013 [US3] Keep Settings rollback + error toast on failed PUT in `app/settings/SettingsClient.tsx`

## Phase 6: Polish

- [x] T014 Run `npm test` and confirm suites pass
- [x] T015 Mark completed tasks in this file

## Dependencies

- T001 → T002 → T003/T007/T012 (tests) → T004/T008 → T005/T006/T009/T010/T011/T013 → T014

## Parallel

- T003, T007, and T012 can be written together after T002
- T005/T006 and T009–T011 can proceed after T004/T008
