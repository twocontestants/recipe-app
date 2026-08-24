# Tasks: Planner week dock and day tones

**Input**: Design documents from `/specs/010-planner-week-dock/`

**Prerequisites**: plan.md, spec.md

**Tests**: Required for `plannerDayTone`.

## Phase 1: Setup

- [x] T001 Add `specs/010-planner-week-dock/` artifacts

## Phase 2: Foundational

- [x] T002 Write failing tests for `plannerDayTone` in `lib/plannerDays.test.ts`
- [x] T003 Implement `plannerDayTone` in `lib/plannerDays.ts`

## Phase 3: User Story 1 — Bottom week picker (P1)

- [x] T004 [US1] Sticky week dock in `app/planner/PlannerClient.tsx` (prev / label / next / Today) above `--bottom-nav-height`

## Phase 4: User Stories 2–3 — Card tones (P1/P2)

- [x] T005 [US2] [US3] Accent today’s cards and grey this week’s past cards; stop fading the whole past day in `app/planner/PlannerClient.tsx`
- [ ] T006 `npm test`

## MVP

T002–T005.
