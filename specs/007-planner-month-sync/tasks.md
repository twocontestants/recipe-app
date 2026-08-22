# Tasks: Month prefetch and live planner sync

**Input**: Design documents from `/specs/007-planner-month-sync/`

**Tests**: Required

## Phase 1: Setup

- [x] T001 Add `specs/007-planner-month-sync/` artifacts

## Phase 2: Foundational

- [x] T002 Write failing tests in `lib/plannerMonth.test.ts`
- [x] T003 Implement `lib/plannerMonth.ts`
- [x] T004 Add `getMealPlansForWeeks` in `lib/db.ts` and `GET ?from=&to=` in `app/api/planner/route.ts`

## Phase 3: User Story 1 - Month load (Priority: P1)

- [x] T005 [US1] Load months (not weeks) in `app/planner/PlannerClient.tsx` and `app/recipes/RecipesClient.tsx`; keep week display
- [x] T006 [US1] Point `components/GenerateListModal.tsx` at the range GET where it currently fans out by week

## Phase 4: User Story 2 - Socket sync (Priority: P1)

- [x] T007 [US2] Relay `join-planner` / `planner-changed` in `server.js`
- [x] T008 [US2] Add `components/usePlannerLive.ts` and broadcast/reload from planner + Recipes writes

## Phase 5: Polish

- [x] T009 Remove week-grain cache from the hot path (`lib/plannerWeekCache.ts` if unused); `npm test` and `npm run build`
