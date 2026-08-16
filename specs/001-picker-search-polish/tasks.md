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

## Phase 4: User Story 2 - Sheet fills leftover space (P1)

**Goal**: White sheet occupies leftover chrome/keyboard space; planner does not show through a dimmed gap.

**Independent Test**: Keyboard-sized visual viewport; sheet bottom equals visible-area bottom. Chrome/body-lock leftover space is filled by the sheet, not a tall dimmer.

### Tests

- [x] T005 [P] [US2] Write failing tests in `lib/pickerViewport.test.ts` for overlay-keyboard, layout-resized, chrome-gap fill, body-lock shrink fill, no-keyboard, and pan+keyboard cases from the contract

### Implementation

- [x] T006 [US2] Implement `computePickerSheetBox` in `lib/pickerViewport.ts` to satisfy the contract
- [x] T007 [US2] In `app/planner/PlannerClient.tsx`, size the sheet from `computePickerSheetBox`; use a normal inset dimmer; stretch the white sheet (`is-sheet`) instead of a `200vh` gap-hider

## Phase 5: User Story 3 - Add to this day, rest of week, or another date (P1)

**Goal**: Row tap adds to the open day; kebab lists the rest of this week plus Another date.

**Independent Test**: Row click selects the open day; menu omits that day; Another date reports a calendar ISO date.

### Tests

- [x] T010 [P] [US3] Write tests in `components/PickerRecipeRow.test.tsx`: row click calls `onSelect` only; menu lists other weekdays not the open day; Another date calls `onAddToDate`

### Implementation

- [x] T011 [US3] Implement `components/PickerRecipeRow.tsx` (row tap, rest-of-week menu, native date picker) and wire it from `app/planner/PlannerClient.tsx` including other-week POST

## Phase 6: Polish

- [x] T008 Run `npm test` and confirm suites pass
- [x] T009 Mark completed tasks in this file

## Dependencies

- T001 → T002 → T003/T005/T010 (tests) → T004/T006/T011 → T007 → T008

## Parallel

- T003, T005, and T010 can be written in parallel after T002
- T004, T006, and T011 can proceed in parallel after their tests exist
