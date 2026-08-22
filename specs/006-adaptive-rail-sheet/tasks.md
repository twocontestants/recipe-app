# Tasks: Adaptive rail and honest day-sheet occupancy

**Input**: Design documents from `/specs/006-adaptive-rail-sheet/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Required (constitution)

## Phase 1: Setup

- [x] T001 Add `specs/006-adaptive-rail-sheet/` artifacts and point `.specify/feature.json` at them

---

## Phase 2: Foundational

- [x] T002 Write failing tests in `lib/plannerDays.test.ts` for local `shiftWeek` / `getThisDisplayWeek` / stable This-Next labels
- [x] T003 Write failing tests in `lib/plannerDrag.test.ts` for `railDayCount` and `surroundingRailDays` (±2 default)
- [x] T004 Write failing tests in `lib/plannerDaySheet.test.ts` for occupancy-by-calendar-date after a week shift
- [x] T005 Write failing tests in `lib/plannerWeekCache.test.ts` for miss / hit / invalidate
- [x] T006 Implement local display-week keys in `lib/plannerDays.ts` (`getThisDisplayWeek`, `shiftWeek` via `localDateIso`)
- [x] T007 Implement `railDayCount` and `surroundingRailDays` in `lib/plannerDrag.ts`
- [x] T008 Implement occupancy-by-`mealOnIso` in `lib/plannerDaySheet.ts` (`displayWeekOf` uses `localDateIso`)
- [x] T009 Implement `lib/plannerWeekCache.ts`

**Checkpoint**: Isolated Vitest files for days / drag / sheet / cache pass

---

## Phase 3: User Story 1 - Rail fits the screen (Priority: P1)

- [x] T010 [US1] Size the rail window from `visualViewport` / `innerHeight` minus `bottomNavReserve` in `app/planner/PlannerClient.tsx` and stop the rail above the phone tab bar

---

## Phase 4: User Story 2 - Honest sheet occupancy (Priority: P1)

- [x] T011 [US2] Use shared occupancy grouping in `app/recipes/RecipesClient.tsx` and `app/planner/PlannerClient.tsx`
- [x] T012 [US2] Align `components/GenerateListModal.tsx` display-week membership with local week keys

---

## Phase 5: User Story 3 - Cache (Priority: P2)

- [x] T013 [US3] Cache storage-week fetches in planner (rail + sheet) and Recipes add; invalidate on successful add/move

---

## Phase 6: Polish

- [x] T014 Run `npm test` and `npm run build`; mark spec implemented

## Dependencies

Foundational blocks US1–US3. US1 and US2 can land in parallel after T009. US3 uses the cache module and the two clients.

## MVP

T006–T010 (rail fits) plus T008/T011 (honest occupancy). Cache is the follow-on.
