# Tasks: Keep planned days as calendar-day strings

**Input**: Design documents from `/specs/009-planner-day-strings/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Required for `YYYY-MM-DD` identity and match.

## Phase 1: Setup

- [x] T001 Add `specs/009-planner-day-strings/` artifacts and point `.specify/feature.json` at it
- [x] T002 [P] Record constitution VII (kitchen dates are day strings) in `.specify/memory/constitution.md`

## Phase 2: Foundational

- [x] T003 Write tests in `lib/plannerDate.test.ts` that `toDayIso` keeps `YYYY-MM-DD` and that `mealOnDate` matches that string
- [x] T004 Implement `toDayIso` in `lib/plannerDate.ts` (pass-through for day strings)

## Phase 3: User Story 1 — Dinners land on the planned day (P1)

- [x] T005 [US1] Map `planned_on` / `week_start` through `toDayIso` in `lib/db.ts` `mapMealPlanRow`

## Phase 4: User Story 2 — Day stays a day string (P1)

- [x] T006 [US2] Keep Postgres `DATE` as text via `types.setTypeParser(types.builtins.DATE)` in `lib/db.ts`
- [x] T007 [US2] `npm test`

## Dependencies

- T003 before T004. T004 before T005. T006 can follow T005. T007 last.

## Parallel opportunities

- T001 and T002.

## MVP

T003–T006: day strings in tests, mapper, and DATE parser. Already shipped on `main`.
