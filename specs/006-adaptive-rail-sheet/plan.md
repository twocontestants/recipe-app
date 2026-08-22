# Implementation Plan: Adaptive rail and honest day-sheet occupancy

**Branch**: `cursor/adaptive-rail-sheet-4c97` | **Date**: 2026-08-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-adaptive-rail-sheet/spec.md`

## Summary

Fit the hold-drag rail to the viewport (default origin ±2; grow when tall; usable height excludes the phone tab bar so Later stays above it). Fix day-sheet occupancy and This/Next week flicker by using **local** display-week keys (`localDateIso` + local `shiftWeek`) while leaving `formatWeekStart` as the **storage** key. Match dinners to sheet days via `storageCoords` of each calendar date. Cache storage-week fetches in memory and invalidate on add/move.

## Technical Context

**Language/Version**: TypeScript 5 / React 18 / Next.js 14

**Primary Dependencies**: Existing `lib/plannerDays.ts`, `lib/plannerDrag.ts`, `lib/plannerDaySheet.ts`, `PlannerDaySheet`

**Storage**: Unchanged `meal_plans` API (`week_start` Monday-canonical via `formatWeekStart`)

**Testing**: Vitest for rail count/window, local shift/label stability, occupancy-by-calendar-date, cache miss/hit/invalidate

**Target Platform**: Phone first; taller viewports show more rail days

**Project Type**: Web application (Next.js app router)

**Performance Goals**: Second view of a week in the same visit uses cache; writes refresh only affected storage weeks

**Constraints**: Constitution — extract testable math. Do not change `formatWeekStart` (existing AU rows). No new libraries.

**Scale/Scope**: Rail + shared sheet + Recipes add fetch + Generate List week filter if it shares the same week-key helpers.

## Constitution Check

- Household-first: Later stays on screen; sheet occupancy matches what the cook already planned.
- Extract what you test: rail window math, local week keys, occupancy match, cache helpers.
- Test-first: failing tests for ±2 window, label-after-shift, occupancy-by-date, cache invalidate.
- Overlay honesty: N/A (existing sheet).
- Simplicity: in-memory Map, no extra store library.

Post-design: no constitution violations.

## Project Structure

```text
specs/006-adaptive-rail-sheet/
lib/plannerDrag.ts
lib/plannerDrag.test.ts
lib/plannerDays.ts
lib/plannerDays.test.ts
lib/plannerDaySheet.ts
lib/plannerDaySheet.test.ts
lib/plannerWeekCache.ts
lib/plannerWeekCache.test.ts
app/planner/PlannerClient.tsx
app/recipes/RecipesClient.tsx
components/GenerateListModal.tsx
```

**Structure Decision**: Keep display-week helpers in `plannerDays`. Rail window in `plannerDrag`. Occupancy grouping in `plannerDaySheet` (match via `mealOnIso`). New small `plannerWeekCache` for miss/merge/invalidate.

## Phase 0 — Research

See [research.md](./research.md).

## Phase 1 — Design

- [data-model.md](./data-model.md)
- [contracts/adaptive-rail-sheet.md](./contracts/adaptive-rail-sheet.md)
- [quickstart.md](./quickstart.md)
