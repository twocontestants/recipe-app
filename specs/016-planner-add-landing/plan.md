# Implementation Plan: Planner add-landing animation

**Branch**: `cursor/planner-add-landing-0972` | **Date**: 2026-09-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/016-planner-add-landing/spec.md`

## Summary

Close the planner recipe selector as soon as a recipe is chosen, then mark the new dinner with a short landing cue on the destination day. If that day is off-screen or in another week, bring it into view first.

Extract landing rules (class name, duration, destination-week reveal, id swap after persist) into a small testable module. Cover immediate close and landing with Vitest.

## Technical Context

**Language/Version**: TypeScript 5 / React 18 / Next.js 14

**Primary Dependencies**: Existing planner client; Vitest for unit and component tests

**Storage**: Existing `meal_plans` rows; no schema change

**Testing**: Vitest (pure unit tests for landing rules; jsdom for selector close + landing class on `PlannerClient`)

**Target Platform**: Mobile web (kitchen phone) and desktop

**Project Type**: Web application (Next.js app router)

**Performance Goals**: Selector gone on the next paint after tap; landing cue ≤ 1s and non-blocking

**Constraints**: No new UI libraries. CSS animation in the planner stylesheet. Respect `prefers-reduced-motion`. Keep landing math out of JSX.

**Scale/Scope**: One add path: planner recipe selector (row tap, rest-of-week menu, another date).

## Constitution Check

- Household-first UX: selector must not stay up after a choice; the new dinner must be visible and tappable.
- Extract what you test: `lib/plannerAddLanding.ts` owns duration, class, week-reveal, and persist-id swap.
- Test-first: failing landing-rule tests and a PlannerClient close-on-select test before wiring the client.
- Overlay honesty: unchanged picker sheet sizing; this feature only dismisses the overlay after a choice.
- Simplicity: CSS class + timeout; no animation library.
- Kitchen dates are day strings: destination week compare uses `YYYY-MM-DD` week starts, not weekday names.

Post-design: no constitution violations.

## Project Structure

### Documentation (this feature)

```text
specs/016-planner-add-landing/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/requirements.md
├── contracts/planner-add-landing.md
└── tasks.md
```

### Source Code

```text
lib/plannerAddLanding.ts
lib/plannerAddLanding.test.ts
app/planner/PlannerClient.tsx
app/planner/PlannerClient.test.tsx
```

**Structure Decision**: Keep Next.js app layout. Extract only the landing rules tests need to own.

## Phase 0 — Research

See [research.md](./research.md). Decisions: close before save; CSS settle on the card; reveal destination week; migrate landing id when the temp meal becomes real.

## Phase 1 — Design

- Landing contract: [contracts/planner-add-landing.md](./contracts/planner-add-landing.md)
- Client-only landing session: [data-model.md](./data-model.md)
- Validation: [quickstart.md](./quickstart.md)
