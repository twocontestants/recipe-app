# Implementation Plan: Analytics and Insights tab

**Branch**: `cursor/analytics-insights-7edc` | **Date**: 2026-09-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/016-analytics-insights/spec.md`

## Summary

Add a signed-in **Insights** kitchen tab that summarises the cook’s own dinners: a four-number pulse, a weekly cadence chart, a protein-mix chart, factual insight cards, and a most-cooked ranking. Windows follow the cook’s week-start. Charts are SVG in the existing editorial palette — no new chart library. Aggregation lives in `lib/` and is served as one `GET /api/insights` so the client does not page planner months.

## Technical Context

**Language/Version**: TypeScript 5 / React 18 / Next.js 14 App Router

**Primary Dependencies**: Existing stack (`next`, `pg`, `react`). No new packages. SVG + CSS for charts.

**Storage**: Postgres read-only over `meal_plans`, `recipes`, `recipe_ratings`, `app_settings` (week-start). No new tables or columns.

**Testing**: Vitest — window math, dinner filter, pulse/streak, cadence, mix, ranking, cards, chart scales, Sidebar visibility. Constitution III: tests before UI/API wiring.

**Target Platform**: Household web app (desktop sidebar + phone tab bar).

**Project Type**: Web application

**Performance Goals**: One insights GET returns the full view model. Pulse readable within 15s of tap (SC-001). Range cap 800 inclusive days.

**Constraints**: Constitution I — phone-readable charts, tab bar not covering labels. II — aggregation and chart math in `lib/`. V — no Recharts. VI — no secrets. VII — kitchen day strings only. Planner GET stays 62-day capped; Insights does not reuse it.

**Scale/Scope**: One new page (`/insights`), one GET route, Sidebar item, optional `?week=` on Planner, `lib/insights*.ts` (+ tests).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- I Household-first: Insights is a kitchen tab with large pulse numbers, tappable chart labels, no hover-only values, bottom nav reserved.
- II Extract what you test: window, aggregator, card rules, and bar-scale math in `lib/`.
- III Test-first: failing unit tests for those modules before API/page.
- IV Planner overlay: unchanged; cadence tap opens Planner rather than a new overlay.
- V Simplicity: SVG/CSS charts; no new library; no rollup table.
- VI Secrets: unchanged; session cookie only.
- VII Kitchen dates: `planned_on` / window bounds stay `YYYY-MM-DD`; week buckets use display-week start, not timestamps.

Post-design: still passes. No complexity table.

## Project Structure

### Documentation (this feature)

```text
specs/016-analytics-insights/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── insights.md
└── tasks.md
```

### Source Code (repository root)

```text
lib/insightsWindow.ts          # preset → { from, to } kitchen days
lib/insightsWindow.test.ts
lib/insights.ts                # dinners → pulse, cadence, mix, ranking, cards
lib/insights.test.ts
lib/insightsChart.ts           # bar heights, stacked widths, tick labels
lib/insightsChart.test.ts
lib/autotag.ts                 # ProteinType (existing); colour map may move here or lib/protein.ts
lib/db.ts                      # compact dinner query + getInsights helper
app/api/insights/route.ts      # GET
app/insights/page.tsx          # AuthGate shell
app/insights/InsightsClient.tsx
components/Sidebar.tsx         # Insights nav item
components/Sidebar.test.tsx
app/planner/PlannerClient.tsx  # read ?week= display-week start
app/globals.css                # insights layout, phone stacking
```

**Structure Decision**: Stay in the existing Next.js app. New route group matches Planner/Shopping. Pure modules under `lib/` hold every number the page displays.

## Complexity Tracking

No constitution violations.
