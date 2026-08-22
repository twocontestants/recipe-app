# Implementation Plan: Planner hold-to-drag with day rail

**Branch**: `cursor/planner-hold-drag-4c97` | **Date**: 2026-08-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-planner-hold-drag/spec.md`

## Summary

Replace instant pointer-drag and the Previous/Next week edge strips with **hold-to-lift**, then drop onto the current week or a **right-hand ten-day rail**. Extract hold timing, the ten-day window, occupancy, and hit-testing into `lib/plannerDrag.ts` (rewrite). Wire hold + rail UI in `PlannerClient`. Reuse `moveMealToDate` / `storageCoords` for persistence.

## Technical Context

**Language/Version**: TypeScript 5 / React 18 / Next.js 14

**Primary Dependencies**: Existing planner client; pointer events (no HTML5 DnD); Vitest

**Storage**: Existing `meal_plans` via DELETE + POST (same as Move to menu)

**Testing**: Vitest for hold vs movement, ten-day window, occupancy, rail-vs-week hit-test

**Target Platform**: Phone first (vertical day list), desktop pointer

**Project Type**: Web application (Next.js app router)

**Performance Goals**: Hold timer + hit-test on move without jank; fetch extra storage weeks only when a hold starts

**Constraints**: Constitution — extract testable math; household-first (scroll and tap must survive). No new libraries. `tmp-*` meals are not holdable.

**Scale/Scope**: One planner view; existing kebab Move to remains.

## Constitution Check

- Household-first: hold (not instant drag) so a card can still scroll and tap; rail is a dated strip, not an accidental edge band.
- Extract what you test: `lib/plannerDrag.ts`.
- Test-first: failing geometry/window tests before wiring the client.
- Overlay honesty: N/A (rail is a side strip, not a picker sheet).
- Simplicity: pointer hold + capture after arming; no dnd kit.

Post-design: no constitution violations.

## Project Structure

### Documentation (this feature)

```text
specs/004-planner-hold-drag/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/requirements.md
├── contracts/planner-drag.md
└── tasks.md
```

### Source Code

```text
lib/plannerDrag.ts
lib/plannerDrag.test.ts
app/planner/PlannerClient.tsx
```

**Structure Decision**: Rewrite the existing drag module in place. Cards and rail stay in PlannerClient; only hold/window/hit-test rules are extracted.

## Phase 0 — Research

See [research.md](./research.md).

## Phase 1 — Design

- [data-model.md](./data-model.md)
- [contracts/planner-drag.md](./contracts/planner-drag.md)
- [quickstart.md](./quickstart.md)
