# Implementation Plan: Flexible week start setting

**Branch**: `cursor/week-start-setting-4c97` | **Date**: 2026-08-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-week-start-setting/spec.md`

## Summary

Households pick any weekday as column one of the planning week. Persist the choice in existing `app_settings`. Keep stored meals on Monday-canonical `(week_start, day_of_week)` so existing dinners and notes stay on their calendar dates. Display weeks, labels, and add-to-plan lists rotate from the saved start day.

Extract start-of-week math into `lib/plannerDays.ts` and cover it with Vitest (constitution: extract what you test, test-first).

## Technical Context

**Language/Version**: TypeScript 5 / React 18 / Next.js 14

**Primary Dependencies**: Existing Settings + preferences API; planner / Recipes clients; Vitest

**Storage**: `app_settings` key `weekStartDay` (weekday name). `meal_plans` and `planner_notes` stay Monday-canonical (`week_start` = that week’s Monday, `day_of_week` 0 = Monday).

**Testing**: Vitest for start-of-week math, weekday rotation, Monday fallback, and calendar-date stability

**Target Platform**: Mobile and desktop web (kitchen phone first)

**Project Type**: Web application (Next.js app router)

**Performance Goals**: Preference read once per page; planner may fetch at most two stored Monday weeks per display week

**Constraints**: No new libraries. No migration of existing meal rows. Invalid setting → Monday.

**Scale/Scope**: One household setting; planner, Recipes add-to-plan, shopping-list week chips.

## Constitution Check

- Household-first UX: seven-weekday control must stay tappable on a phone (reuse Settings preference row).
- Extract what you test: start-of-week and storage-coordinate math live in `lib/plannerDays.ts`.
- Test-first: failing math tests before production changes.
- Overlay honesty: N/A (no planner overlay geometry).
- Simplicity: weekday name in `app_settings`; no schema change; no extra UI kit.

Post-design: no constitution violations.

## Project Structure

### Documentation (this feature)

```text
specs/002-week-start-setting/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/requirements.md
├── contracts/week-start.md
└── tasks.md
```

### Source Code

```text
lib/plannerDays.ts
lib/plannerDays.test.ts
app/api/preferences/route.ts
app/settings/SettingsClient.tsx
app/planner/PlannerClient.tsx
app/recipes/RecipesClient.tsx
components/AddToPlannerModal.tsx
components/AddToPlannerModal.test.tsx
components/GenerateListModal.tsx
```

**Structure Decision**: Single Next.js app. Extend the existing day helper rather than a second module.

## Phase 0 — Research

See [research.md](./research.md). Decision: persist a weekday name; display weeks remap to Monday-canonical storage.

## Phase 1 — Design

- Data: [data-model.md](./data-model.md)
- Contract: [contracts/week-start.md](./contracts/week-start.md)
- Validation: [quickstart.md](./quickstart.md)
