# Tasks: Planner picker search polish

**Input**: Design documents from `/specs/001-picker-search-polish/`

**Prerequisites**: plan.md, spec.md, research.md, contracts/picker-viewport.md, quickstart.md

**Tests**: Required (user asked for tests; constitution is test-first)

## Phase 1: Setup

- [x] T001 Add Vitest (and jsdom) with `npm test` in `package.json` and `vitest.config.ts`

## Phase 2: Foundational

- [x] T002 Create `lib/pickerViewport.ts` exporting types and `computePickerSheetBox` per `specs/001-picker-search-polish/contracts/picker-viewport.md` (stub that fails tests is OK)

## Phase 3: User Story 1 - Typed search text stays clear of the icon (P1)

**Goal**: Magnifying glass never covers typed characters.

**Independent Test**: Type in the picker search field; first character is fully visible beside the icon.

### Tests

- [x] T003 [P] [US1] Write failing tests in `components/PickerSearchField.test.tsx`: input is not `type="search"`; icon is a flex sibling (not `position: absolute` over the input)

### Implementation

- [x] T004 [US1] Implement `components/PickerSearchField.tsx` as a flex row (icon + text input) and use it from `app/planner/PlannerClient.tsx`

## Phase 4: User Story 2 - Keyboard sits flush with the picker (P1)

**Goal**: No page content visible between sheet and keyboard.

**Independent Test**: Keyboard-sized visual viewport; sheet bottom equals visible-area bottom; dimmer covers the full layout viewport.

### Tests

- [x] T005 [P] [US2] Write failing tests in `lib/pickerViewport.test.ts` for overlay-keyboard, layout-resized (small gap fill), no-keyboard, and pan+keyboard cases from the contract

### Implementation

- [x] T006 [US2] Implement `computePickerSheetBox` in `lib/pickerViewport.ts` to satisfy the contract
- [x] T007 [US2] In `app/planner/PlannerClient.tsx`, split full-screen dimmer from the sheet; apply `computePickerSheetBox` on visualViewport sync; drop leftover sheet padding when `keyboardOpen`

## Phase 5: Polish

- [x] T008 Run `npm test` and confirm both suites pass
- [x] T009 Mark completed tasks in this file

## Dependencies

- T001 → T002 → T003/T005 (tests) → T004/T006 → T007 → T008

## Parallel

- T003 and T005 can be written in parallel after T002
- T004 and T006 can proceed in parallel after their tests exist
