# Research: Analytics and Insights tab

## Dedicated insights payload, not planner GET

- **Decision**: Add `GET /api/insights?from=&to=` that returns already-summarised pulse, weekly cadence, protein mix, ranking, and insight cards for the signed-in cook. Do not load Insights by paging `GET /api/planner`.
- **Rationale**: Planner range is capped at 62 days and returns recipe cards. Last 12 weeks and All time would need many round trips and would ship method-level fields Insights never shows. One owner-scoped aggregate keeps SC-001 (readable in 15s) and FR-003 (no other cook’s rows).
- **Alternatives considered**: Client-side reduce of planner months (rejected — cap + payload). New warehouse tables (rejected — constitution V, FR-018 says summarise existing facts).

## Aggregation is a pure module

- **Decision**: `lib/insights.ts` takes a compact dinner list plus the cook’s week-start and window, and returns the view model (pulse, weeks, mix, ranking, cards). `lib/insightsWindow.ts` turns a preset + “today” + week-start into `{ from, to }` kitchen days. SQL in `lib/db.ts` only loads compact rows for that owner and day range.
- **Rationale**: Constitution II — counts, streaks, shares, and card rules are testable without Next. Constitution III — failing tests for those rules before UI.
- **Alternatives considered**: Inline reduce in the React page (untestable). SQL-only GROUP BY with cards in the query (harder to unit test card copy).

## Charts without a new library

- **Decision**: Draw cadence and protein mix with SVG (and CSS for layout/type) in the existing editorial palette. Scale/bar-width math lives in `lib/insightsChart.ts`. Reuse planner protein colours via a shared map moved to `lib/` if Insights and Planner would otherwise duplicate it.
- **Rationale**: Constitution V — do not add Recharts/Chart.js unless the stack cannot express the test. SVG bars and a stacked row are enough for FR-008/FR-009 and stay readable without hover (FR-010).
- **Alternatives considered**: Recharts (new dependency). CSS-only div bars (fine for cadence; SVG still needed for accessible `title`/`text` alignment). Canvas (worse for labels and tests).

## Dinner-only facts

- **Decision**: Treat `meal_type` empty or `'dinner'` as dinner. All pulse, cadence, mix, streak, ranking, and cards use dinners only. Other meal types return as `otherMealCount` so the UI can show a one-line note, not a second chart.
- **Rationale**: Spec FR-015. Planner already treats non-dinner as non-occupying a dinner cell.
- **Alternatives considered**: All meal types on cadence (rejected — inflates “nights”). Filter control in v1 (rejected — extra chrome on a phone).

## Window presets and kitchen days

- **Decision**: Presets resolve to inclusive `YYYY-MM-DD` ranges using existing `startOfDisplayWeek` / `localDateIso`. This week: current display week. Last N weeks: N display weeks ending this week. All time: `from` = oldest dinner `planned_on` for that owner (or this week if none), `to` = end of current display week. Cadence buckets are display weeks, not Monday-storage weeks.
- **Rationale**: Spec FR-004–FR-006 and constitution VII. Upcoming dinners in the current week stay inside `to`.
- **Alternatives considered**: Calendar months (disagrees with Planner). UTC timestamps (forbidden). Hard-coded Monday weeks (breaks Sunday week-start).

## Insight card rules

- **Decision**: Emit at most four cards, in this order, skipping any that do not qualify:
  1. Dominant protein — share ≥ 1/3 of labelled dinners (Unlabelled ignored in the denominator when at least three labelled dinners exist).
  2. Missing protein — a vocabulary protein the cook has used as a dinner main before this window, with zero dinners in-window and last occurrence ≥ 14 kitchen days before `to` (or before today if `to` is in the future).
  3. Repeat dish — a recipe planned ≥ 3 times in-window (or the unique maximum if that max is ≥ 2 and at least two recipes were planned).
  4. Neglected high rating — a recipe this cook rated 4 or 5 that has zero dinners in-window; prefer one that has been planned before over one never planned; stable tie-break by title.
- **Rationale**: Spec FR-013 wants factual, short, kitchen-actionable copy. Thresholds make tests binary. Missing-protein uses history outside the window so “you used to cook fish” is true.
- **Alternatives considered**: LLM-written insights (rejected — untestable, invents advice). Always show four cards with filler (rejected — FR-013 empty copy).

## Planner deep link

- **Decision**: Cadence tap goes to `/planner?week=YYYY-MM-DD` where the value is the display-week start. PlannerClient already holds `weekStart` as a Date; on mount it reads the query and `setWeekStart` if valid. Recipe taps use existing `recipeViewPath`.
- **Rationale**: Spec FR-011/FR-014. Planner has no week query today; one optional param is smaller than a new route.
- **Alternatives considered**: SessionStorage flag (fragile). `/planner/YYYY-MM-DD` (new routing). Notes-only hash (Planner ignores it).

## Access and empty states

- **Decision**: `/insights` uses the same `AuthGate` + Sidebar shell as Planner. Sidebar kitchen list inserts Insights after Shopping. Empty window: pulse zeros + empty-state copy + link to Planner; do not render zero-axis charts as if they were a successful mix. Failed fetch clears previous view model.
- **Rationale**: FR-001, FR-002, FR-016, FR-017. Household-first: one more tab, still five signed-in items — acceptable on the phone bar with the short label Insights.
- **Alternatives considered**: Insights inside Settings (buried). Guest teaser charts (leaks kitchen shape).

## No schema change

- **Decision**: No new tables or columns. Read `meal_plans.planned_on`, `meal_type`, `recipe_id`, `owner_id`; recipe `title`, `primary_protein`; `recipe_ratings.stars` for that user.
- **Rationale**: FR-018. Existing `idx_meal_plans_owner_planned_on` already serves the range filter.
- **Alternatives considered**: Nightly rollup table (premature). Materialized view (ops cost, setup complexity).
