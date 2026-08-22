# Implementation Plan: Shared planner day sheet

**Branch**: `cursor/shared-day-sheet-4c97` | **Date**: 2026-08-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-shared-day-sheet/spec.md`

## Summary

Extract the Recipes **Add to planner** week/day chooser into a shared `PlannerDaySheet`. Recipes keeps a thin `AddToPlannerModal` wrapper. Planner Earlier/Later opens the same sheet to finish a move (no native `input type="date"`). Opening week/day for Earlier/Later and occupancy grouping live in `lib/plannerDaySheet.ts`. The rail marks the origin day with a **From** label.

## Technical Context

**Language/Version**: TypeScript 5 / React 18 / Next.js 14

**Primary Dependencies**: Existing `AddToPlannerModal` UI; `lib/plannerDays.ts`; planner hold-drag in `PlannerClient`

**Storage**: Existing `meal_plans` via current move (DELETE + POST). No schema change.

**Testing**: Vitest for sheet-anchor math, occupancy grouping, origin helper; component tests for shared sheet wording (add vs move)

**Target Platform**: Phone first; same modal overlay as Recipes

**Project Type**: Web application (Next.js app router)

**Performance Goals**: Fetch display-week dinners only while the sheet is open (same as Recipes)

**Constraints**: Constitution — extract testable math; no extra UI libraries. Do not change `formatWeekStart` week keys (AU storage). Household week-start setting applies.

**Scale/Scope**: Two call sites (Recipes add, planner rail pick) plus rail origin mark.

## Constitution Check

- Household-first: week list + large day rows instead of a tiny native calendar after a drag.
- Extract what you test: `sheetAnchorForRailPick`, `weekPlanFromMeals`, `isRailOrigin`.
- Test-first: failing tests for anchor week/day and From helper before wiring clients.
- Overlay honesty: reuse the existing planner-quick modal, not a new dimmer treatment.
- Simplicity: one presentational sheet; wrappers only change title/confirm copy.

Post-design: no constitution violations.

## Project Structure

### Documentation (this feature)

```text
specs/005-shared-day-sheet/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/requirements.md
├── contracts/planner-day-sheet.md
└── tasks.md
```

### Source Code

```text
lib/plannerDaySheet.ts
lib/plannerDaySheet.test.ts
components/PlannerDaySheet.tsx
components/PlannerDaySheet.test.tsx
components/AddToPlannerModal.tsx
components/AddToPlannerModal.test.tsx
app/recipes/RecipesClient.tsx
app/planner/PlannerClient.tsx
```

**Structure Decision**: New shared module + presentational sheet. AddToPlannerModal remains the Recipes import so existing tests keep a stable entry. PlannerClient drops the hidden date input.

## Phase 0 — Research

See [research.md](./research.md).

## Phase 1 — Design

- [data-model.md](./data-model.md)
- [contracts/planner-day-sheet.md](./contracts/planner-day-sheet.md)
- [quickstart.md](./quickstart.md)
