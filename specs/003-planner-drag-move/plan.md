# Implementation Plan: Planner drag-to-move meals

**Branch**: `cursor/planner-drag-move-4c97` | **Date**: 2026-08-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-planner-drag-move/spec.md`

## Summary

Let cooks drag a planned dinner onto another day of the current week, or onto Previous / Next week strips that appear when the pointer enters the top or bottom of the visible screen. Extract hit-test and threshold math into `lib/plannerDrag.ts` and cover it with Vitest. Wire pointer events on existing meal cards in `PlannerClient`; reuse `moveMeal` / `storageCoords` for persistence.

## Technical Context

**Language/Version**: TypeScript 5 / React 18 / Next.js 14

**Primary Dependencies**: Existing planner client; pointer events (no HTML5 DnD); Vitest

**Storage**: Existing `meal_plans` via DELETE + POST (same as today’s Move to menu)

**Testing**: Vitest unit tests for threshold, day rect hit-test, edge-band priority, same-weekday adjacent-week dates

**Target Platform**: Phone first (vertical day list), desktop pointer

**Project Type**: Web application (Next.js app router)

**Performance Goals**: Hit-test on pointer move without jank; no extra libraries

**Constraints**: Constitution — extract testable math; household-first (large edge strips must not swallow the first/last day as the only target). Temporary `tmp-*` meals are not draggable.

**Scale/Scope**: One planner view; existing kebab Move to remains.

## Constitution Check

- Household-first: drag threshold preserves tap-to-open; edge strips are viewport HUD, not the first/last day row.
- Extract what you test: `lib/plannerDrag.ts`.
- Test-first: failing geometry tests before wiring the client.
- Overlay honesty: N/A (no picker sheet).
- Simplicity: pointer capture, no dnd kit.

Post-design: no constitution violations.

## Project Structure

### Documentation (this feature)

```text
specs/003-planner-drag-move/
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

**Structure Decision**: Keep cards in PlannerClient; only the resolve-target rules are extracted.

## Phase 0 — Research

See [research.md](./research.md). Pointer drag; edge HUD; same weekday on adjacent week.

## Phase 1 — Design

- [data-model.md](./data-model.md)
- [contracts/planner-drag.md](./contracts/planner-drag.md)
- [quickstart.md](./quickstart.md)
