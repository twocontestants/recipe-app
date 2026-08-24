# Implementation Plan: Faster planner load

**Branch**: `cursor/planner-load-speed-0508` | **Date**: 2026-08-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-planner-load-speed/spec.md`

## Summary

Make opening Planner a single light meals read plus one notes range: no kitchen schema work on browse, no second load when week-start preference hydrates to the same day, no extra week-by-week meals GET on first paint, card-shaped nested recipes, cookbook deferred until the picker opens, and an owner+planned-day index. Shopping list generation keeps a full-recipe join. No new libraries.

## Technical Context

**Language/Version**: TypeScript 5 / React 18 / Next.js 14 App Router

**Primary Dependencies**: Existing stack (`next`, `pg`, `react`). No new packages.

**Storage**: Postgres `meal_plans` / `planner_notes` (same tables). New index only: `(owner_id, planned_on)`. No new tables.

**Testing**: Vitest — helpers for week-start identity, notes mapping, and card vs full meal recipe. Constitution III: tests before behavior changes.

**Target Platform**: Household web app. Custom `server.js` + Socket.IO (unchanged).

**Project Type**: Web application

**Performance Goals**: Typical week draws cards after one month-range meals GET that does not ship ingredients or steps, and does not wait on the cookbook.

**Constraints**: Constitution V — no new libraries. VI — no secrets. VII — kitchen dates stay `YYYY-MM-DD`. Schema migration stays on `/api/setup` and writes, not on planner/notes GET.

**Scale/Scope**: Planner client, planner/notes GET, shopping POST (full join). Generate-list and Recipes add-to-planner may still use week GETs.

## Constitution Check

- I Household-first: week grid still tappable; loading spinner at most once for an unchanged week-start day.
- II Extract what you test: week-key comparison, notes-by-display-day, card vs method on nested recipes in `lib/`.
- III Test-first: failing tests for those rules before wiring the client/API.
- V Simplicity: slimmer SELECT + fewer fetches. No cache service.
- VI Secrets: unchanged.
- VII Kitchen dates: notes and meals stay keyed by `YYYY-MM-DD`.

Post-design: still passes. No complexity table.

## Project Structure

### Documentation (this feature)

```text
specs/012-planner-load-speed/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── planner-load.md
└── tasks.md
```

### Source Code (repository root)

```text
lib/plannerLoad.ts             # week identity, notes mapping
lib/plannerLoad.test.ts
lib/db.ts                      # card vs full meal select; drop schema ensure on GET; index
lib/loadPlannerMonth.ts        # optional notes range helper
app/api/planner/route.ts       # GET: card meals
app/api/planner-notes/route.ts # GET from/to range
app/api/shopping-lists/route.ts # still full meals
app/planner/PlannerClient.tsx  # one month fetch; defer cookbook; one notes GET
```

**Structure Decision**: Stay in the existing Next.js app. Extract load rules to `lib/`. Keep full meal join for shopping generation.

## Complexity Tracking

No constitution violations.
