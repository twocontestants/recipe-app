# Implementation Plan: Store planned dinners as calendar dates

**Branch**: `cursor/calendar-date-meals-4c97` | **Date**: 2026-08-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-calendar-date-meals/spec.md`

## Summary

Add `planned_on` (and `note_on`) as the calendar-date source of truth. Backfill from existing `week_start` + `day_of_week` so Australian Sunday keys and UTC Monday keys land on the same kitchen day. Keep `week_start` / `day_of_week` populated from the date using ISO Monday arithmetic (not `toISOString()`). Week and range SQL keep working: week reads accept Monday keys and old Sunday keys; range reads filter `planned_on`.

## Technical Context

**Language/Version**: TypeScript 5 / React 18 / Next.js 14

**Primary Dependencies**: Existing `pg`, `lib/plannerDays.ts`, planner/shopping HTTP routes

**Storage**: Postgres `meal_plans`, `planner_notes`. Additive columns + backfill in `setupDatabase` / ensure helpers (same pattern as other ALTERs).

**Testing**: Vitest for date inference, week-span compatibility, meal-on-date matching; existing planner/sheet tests updated to `planned_on`.

**Target Platform**: Household web app (AU phones, UTC host)

**Project Type**: Web application

**Performance Goals**: Same as today — one month range query, week shopping query.

**Constraints**: Constitution — extract testable math. Every existing query path must still return rows. No data loss. No new libraries.

**Scale/Scope**: One household planner; tens to hundreds of meal rows.

## Constitution Check

- Household-first: planner must not go blank; dinners stay on the day the cook planned.
- Extract what you test: inference, ISO Monday, week-span, match-by-date in `lib/plannerDate.ts`.
- Test-first for the conversion rules before touching SQL or clients.
- Simplicity: keep week columns in sync rather than a second API or a hard cutover.

## Project Structure

### Documentation (this feature)

```text
specs/008-calendar-date-meals/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

### Source Code (repository root)

```text
lib/plannerDate.ts
lib/plannerDate.test.ts
lib/db.ts
lib/plannerDays.ts
lib/plannerDrag.ts
lib/plannerDaySheet.ts
app/api/planner/route.ts
app/api/planner-notes/route.ts
app/api/shopping-lists/route.ts
app/planner/PlannerClient.tsx
app/recipes/RecipesClient.tsx
components/GenerateListModal.tsx
scripts/setup-db.js
```

## Complexity Tracking

No constitution violations. Week columns remain so shopping-list and `?weekStart=` callers do not break.
