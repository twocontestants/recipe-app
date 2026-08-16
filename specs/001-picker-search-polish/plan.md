# Implementation Plan: Planner picker search polish

**Branch**: `cursor/planner-picker-polish-ffdc` | **Date**: 2026-08-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-picker-search-polish/spec.md`

## Summary

Stop the picker search icon covering typed text, and close the strip of planner that shows between the sheet and the on-screen keyboard. Extract viewport-box math and search-field structure into testable modules; cover both with Vitest before wiring them into `PlannerClient`.

## Technical Context

**Language/Version**: TypeScript 5 / React 18 / Next.js 14

**Primary Dependencies**: Existing planner client; new Vitest runner for unit tests

**Storage**: N/A

**Testing**: Vitest (jsdom for the search field, pure unit tests for viewport math)

**Target Platform**: Mobile web (iOS/Android keyboards) and desktop

**Project Type**: Web application (Next.js app router)

**Performance Goals**: Viewport sync on `visualViewport` resize/scroll without visible jank

**Constraints**: No new UI libraries. Keep the picker in `PlannerClient` plus small extracted modules.

**Scale/Scope**: One modal, two bugs, automated tests for both.

## Constitution Check

- Household-first UX: icon cannot cover text; sheet stays flush with the keyboard.
- Extract what you test: `lib/pickerViewport.ts` and `components/PickerSearchField.tsx`.
- Test-first: Vitest cases land and fail before production changes.
- Overlay honesty: full-screen dimmer + sheet sized to the visible viewport, filling small layout/visual mismatches.
- Simplicity: flex row for the icon; no extra dependencies beyond Vitest.

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
app/planner/PlannerClient.tsx
package.json          # npm test → vitest
vitest.config.ts
```

**Structure Decision**: Keep Next.js app layout. Extract only the rules that tests need to own.

## Phase 0 — Research

See [research.md](./research.md). Decisions: flex sibling icon (not absolute overlay), split dimmer vs sheet, fill sub-keyboard gaps when layout viewport already excludes the keyboard.

## Phase 1 — Design

- Viewport contract: [contracts/picker-viewport.md](./contracts/picker-viewport.md)
- Quickstart / test recipe: [quickstart.md](./quickstart.md)
- No data-model (no persisted entities)

## Complexity Tracking

None. Extraction is the constitution-required simpler path.
