# Implementation Plan: Planner picker search polish

**Branch**: `cursor/picker-fill-and-add-to-day-ffdc` | **Date**: 2026-08-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-picker-search-polish/spec.md`

## Summary

Stop the picker search icon covering typed text. Size the white sheet to leftover chrome / body-lock space (and to the visual viewport when a keyboard overlays) so the planner never shows through a gap and more recipes stay visible. Tapping a result adds it to the open day; a kebab menu adds it to the rest of this week or to another calendar date.

Extract viewport-box math, search-field structure, and result-row add-to behavior into testable modules; cover them with Vitest.

## Technical Context

**Language/Version**: TypeScript 5 / React 18 / Next.js 14

**Primary Dependencies**: Existing planner client; Vitest for unit tests

**Storage**: Existing `meal_plans` rows (`week_start` + `day_of_week`); another-date adds use the Monday of the picked date

**Testing**: Vitest (jsdom for search field and recipe row, pure unit tests for viewport math)

**Target Platform**: Mobile web (iOS/Android keyboards) and desktop

**Project Type**: Web application (Next.js app router)

**Performance Goals**: Viewport sync on `visualViewport` resize/scroll without visible jank

**Constraints**: No new UI libraries. Keep the picker in `PlannerClient` plus small extracted modules.

**Scale/Scope**: One modal: search polish, sheet fill, add-to-day / another-date.

## Constitution Check

- Household-first UX: icon cannot cover text; sheet fills leftover space; add-to targets are tappable.
- Extract what you test: `lib/pickerViewport.ts`, `components/PickerSearchField.tsx`, `components/PickerRecipeRow.tsx`.
- Test-first: Vitest cases for geometry, search layout, and add-to menu.
- Overlay honesty: the white sheet occupies leftover visible space; a dimmer is not the gap-hider.
- Simplicity: flex row for the icon; native date input for Another date; no extra dependencies beyond Vitest.

Post-design: no constitution violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-picker-search-polish/
├── spec.md
├── plan.md
├── research.md
├── quickstart.md
├── checklists/requirements.md
├── contracts/picker-viewport.md
└── tasks.md
```

### Source Code

```text
lib/pickerViewport.ts
lib/pickerViewport.test.ts
components/PickerSearchField.tsx
components/PickerSearchField.test.tsx
components/PickerRecipeRow.tsx
components/PickerRecipeRow.test.tsx
app/planner/PlannerClient.tsx
package.json          # npm test → vitest
vitest.config.ts
```

**Structure Decision**: Keep Next.js app layout. Extract only the rules that tests need to own.

## Phase 0 — Research

See [research.md](./research.md). Decisions: flex sibling icon; fill leftover layout/baseline height with the sheet unless a keyboard is overlaying; rest-of-week days plus native date picker for Another date.

## Phase 1 — Design

- Viewport contract: [contracts/picker-viewport.md](./contracts/picker-viewport.md)
- Quickstart / test recipe: [quickstart.md](./quickstart.md)
- No new persisted entities (reuse meal plans)

## Complexity Tracking

None. Extraction is the constitution-required simpler path.
