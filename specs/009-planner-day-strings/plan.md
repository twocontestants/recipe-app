# Implementation Plan: Keep planned days as calendar-day strings

**Branch**: `cursor/spec-day-strings-4c97` | **Date**: 2026-08-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-planner-day-strings/spec.md`

## Summary

A kitchen day is the `YYYY-MM-DD` text Postgres already stores for `DATE`. Leave it as that string. Do not wrap it in a JS `Date` (that stringifies as `"Mon Aug 24"` and blanks the planner). Normalize only if a leftover timestamp or Date appears. Matching stays string equality on that day label.

## Technical Context

**Language/Version**: TypeScript 5 / React 18 / Next.js 14

**Primary Dependencies**: `pg`, `lib/plannerDate.ts`, planner GET mapper

**Storage**: Existing `meal_plans.planned_on` and `planner_notes.note_on` (`DATE`). No schema change.

**Testing**: Vitest — `toDayIso` / `mealOnDate` keep `YYYY-MM-DD` identity.

**Target Platform**: Household web app (AU phones, UTC host)

**Project Type**: Web application

**Performance Goals**: Same planner load as today.

**Constraints**: Constitution VII — day strings; II — extract testable normalize in `lib/plannerDate.ts`. No new libraries.

**Scale/Scope**: Mapper + driver parser; tens of meal rows.

## Constitution Check

- I Household-first: dinners must show on the grid.
- II Extract what you test: `toDayIso` in `lib/plannerDate.ts`.
- III Test-first: YYYY-MM-DD identity tests before mapper/parser change.
- V Simplicity: one driver parser for DATE; no extra conversion layer.
- VI Secrets: unchanged.
- VII Kitchen dates are day strings: DATE stays text; match compares `YYYY-MM-DD`.

Post-design: still passes. No complexity table.

## Project Structure

### Documentation (this feature)

```text
specs/009-planner-day-strings/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

### Source Code (repository root)

```text
lib/db.ts
lib/plannerDate.ts
lib/plannerDate.test.ts
```

**Structure Decision**: Existing Next.js app. Driver parser in `lib/db.ts`; day-string helper in `lib/plannerDate.ts`.

## Complexity Tracking

No constitution violations.
