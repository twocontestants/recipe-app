# Tasks: Planner add-landing animation

**Input**: Design documents from `/specs/016-planner-add-landing/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/planner-add-landing.md

**Tests**: Required (constitution: picker behavior needs automated coverage; FR-009)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- `lib/` for landing rules
- `app/planner/` for planner client

## Phase 1: Setup

**Purpose**: Feature docs are already in `specs/016-planner-add-landing/`; no new packages.

- [x] T001 Confirm ignore files already cover `node_modules/`, `dist/`, `.env*` in `.gitignore`

---

## Phase 2: Foundational

**Purpose**: Landing helpers every story uses

- [x] T002 Add failing unit tests for landing class, week reveal, persist-id swap, and scroll options in `lib/plannerAddLanding.test.ts`
- [x] T003 Implement `lib/plannerAddLanding.ts` until T002 passes

**Checkpoint**: Landing rules can be imported by the planner

---

## Phase 3: User Story 1 - Picker closes and the new dinner lands (Priority: P1) 🎯 MVP

**Goal**: Tap a recipe; selector gone immediately; destination card plays the landing cue and is scrolled into view

**Independent Test**: Open Add dinner, tap a recipe, selector gone before POST, card has `is-landing`

- [x] T004 [US1] Add a PlannerClient test in `app/planner/PlannerClient.test.tsx` that opens Add dinner, taps a recipe while POST hangs, and expects the picker gone plus `is-landing` on the new card
- [x] T005 [US1] Close the picker before awaiting save, set landing on the optimistic meal, apply `ADD_LANDING_CLASS`, add the CSS settle, and scroll the day into view in `app/planner/PlannerClient.tsx`

---

## Phase 4: User Story 2 - Adding to another day still shows the landing (Priority: P1)

**Goal**: Add-to menu and replace land on the destination (or replacement) card only

**Independent Test**: Add to another weekday from the menu; that day’s new card lands

- [x] T006 [US2] Extend `app/planner/PlannerClient.test.tsx` so Add to another weekday closes the picker and lands on that day, not the open day
- [x] T007 [US2] Ensure `pickRecipeForDay` / replace in `app/planner/PlannerClient.tsx` attaches landing to the destination meal id only

---

## Phase 5: User Story 3 - Adding to a week they are not viewing (Priority: P2)

**Goal**: Off-week adds show that week and land there; reduced motion still marks the card

**Independent Test**: Another date in a later week closes the picker and shows that week’s new dinner with landing

- [x] T008 [US3] Add tests in `lib/plannerAddLanding.test.ts` and `app/planner/PlannerClient.test.tsx` for revealing another week and for reduced-motion scroll options
- [x] T009 [US3] When the destination week differs, navigate with existing week shift in `app/planner/PlannerClient.tsx`, wait to start the landing timeout until that week is on screen, and honor reduced motion in CSS

---

## Phase 6: Polish

- [x] T010 Run `npm test` and gitleaks on the working tree
- [x] T011 Verify the selector close and landing on `/planner` in a browser (same-week add and, if reachable, another day)

This environment has no Postgres, so T011 was covered by the PlannerClient jsdom flow (selector close, same-week landing, rest-of-week landing, other-week reveal) rather than a logged-in `/planner` session.

---

## Dependencies

- T001 → T002 → T003 → US1 (T004–T005) → US2 (T006–T007) → US3 (T008–T009) → T010–T011
- US1 is MVP. US2 reuses the same pick path. US3 needs US1’s landing session.

## Parallel opportunities

- T002 can be written fully before T003
- T004 can be written against the current client (expect fail) in parallel with T003 once the helper API is sketched

## Implementation strategy

1. Landing helpers + unit tests
2. Immediate close + same-week landing (MVP)
3. Other-day / replace
4. Other-week reveal + reduced motion
5. `npm test`, secret scan, browser check
