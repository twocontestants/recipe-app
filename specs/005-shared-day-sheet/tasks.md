# Tasks: Shared planner day sheet

**Input**: Design documents from `/specs/005-shared-day-sheet/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/planner-day-sheet.md

**Tests**: Required (constitution: extract and test math; test-first for behavior changes)

**Organization**: Tasks are grouped by user story.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

**Purpose**: Point Speckit at this feature

- [x] T001 Persist feature directory in `.specify/feature.json` and add `specs/005-shared-day-sheet/` artifacts

---

## Phase 2: Foundational

**Purpose**: Testable sheet-open and occupancy rules before any UI

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Write failing tests in `lib/plannerDaySheet.test.ts` for `sheetAnchorForRailPick`, `weekPlanFromMeals`, and `isRailOrigin`
- [x] T003 Implement `sheetAnchorForRailPick`, `weekPlanFromMeals`, and `isRailOrigin` in `lib/plannerDaySheet.ts`

**Checkpoint**: `npx vitest run lib/plannerDaySheet.test.ts` passes

---

## Phase 3: User Story 1 - One week-and-day sheet (Priority: P1) 🎯 MVP

**Goal**: Shared presentational sheet; Recipes Add to planner is a wrapper

**Independent Test**: AddToPlannerModal tests still pass; PlannerDaySheet can render move wording

### Tests for User Story 1

- [x] T004 [P] [US1] Write `components/PlannerDaySheet.test.tsx`: seven day options, confirm verb + date label, week-start Sunday order
- [x] T005 [US1] Keep `components/AddToPlannerModal.test.tsx` covering the Recipes wrapper

### Implementation for User Story 1

- [x] T006 [US1] Extract UI into `components/PlannerDaySheet.tsx` (title, confirmVerb, existing pqm markup/CSS)
- [x] T007 [US1] Make `components/AddToPlannerModal.tsx` a thin wrapper (Add to planner / Add dinner)
- [x] T008 [US1] Use `weekPlanFromMeals` from `app/recipes/RecipesClient.tsx` when loading the add sheet

**Checkpoint**: Recipes add looks and behaves as before; both test files pass

---

## Phase 4: User Story 2 - Earlier / Later opens the sheet (Priority: P1)

**Goal**: Rail Earlier/Later opens the shared sheet to move; no native date input

**Independent Test**: Drop on Earlier opens previous week; confirm moves; dismiss does not

- [x] T009 [US2] Remove the hidden date input and `openRailDatePicker` from `app/planner/PlannerClient.tsx`
- [x] T010 [US2] Open `PlannerDaySheet` on Earlier/Later using `sheetAnchorForRailPick`, fetch occupancy via `weekPlanFromMeals`, confirm with `moveMealToDate`

**Checkpoint**: Numbered rail / week-list drops unchanged; Earlier/Later use the sheet

---

## Phase 5: User Story 3 - Rail marks the origin date (Priority: P2)

**Goal**: Visible From label on the dragged-from rail day

**Independent Test**: Origin day shows From; others do not

- [x] T011 [US3] Render a From label on the numbered rail day when `isRailOrigin` in `app/planner/PlannerClient.tsx`

**Checkpoint**: Hold a meal — source date is obvious on the rail

---

## Phase 6: Polish

- [x] T012 Run `npm test` and `npm run build`; update `specs/005-shared-day-sheet/quickstart.md` if commands differ

---

## Dependencies & Execution Order

- Setup → Foundational (blocks stories) → US1 → US2 → US3 → Polish
- US2 depends on US1 (imports PlannerDaySheet)
- US3 only needs `isRailOrigin` from Foundational and can land with US2 in PlannerClient

## Parallel opportunities

- T004 can start once T006’s public props are known
- T005 stays valid in parallel with T007 if the wrapper props are unchanged

## Implementation strategy

MVP is US1 (shared sheet + Recipes wrapper). US2 is the user-visible planner fix. US3 is the rail From mark.
