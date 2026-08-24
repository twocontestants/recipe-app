# Research: Faster planner load

## Stop schema work on browse

- **Decision**: `GET /api/planner` and `GET /api/planner-notes` must not call `ensurePlannedOnColumns()` or `ensureAccountsSchema()`. Writes and `/api/setup` keep ensuring schema. The owner+planned-on index is created in `ensurePlannedOnColumns` / `setupDatabase` after `planned_on` exists.
- **Rationale**: First planner GET in a process currently `ALTER`s and backfills `planned_on`. Same class of hang as `setupDatabase()` on recipe GET. Production already has columns.
- **Alternatives considered**: Keep the in-process `_plannedOnReady` flag on GET (still pays first-request ALTER).

## Week-start hydrate must not refetch the same week

- **Decision**: Compare display week as `YYYY-MM-DD`. Preferences `setWeekStart` only when that string changes. `fetchData` depends on the iso string, not a new `Date` object.
- **Rationale**: Today preferences always constructs a new `Date`, which recreates `fetchData` even when the household already uses Monday.
- **Alternatives considered**: Wait for preferences before any meals GET (adds latency for the default Monday week).

## One meals request on first paint

- **Decision**: First paint uses `fetchMealsForMonths` only (range GET already sends `weeks=` for leftover `week_start` rows). Do not also call `fetchMealsForWeeks`. Socket reload and month ensure stay on the month path. Recipes add-to-planner and generate-list may still use week GETs.
- **Rationale**: The extra `?weekStart=` calls duplicate the month payload.
- **Alternatives considered**: Drop `weeks=` from the month GET (would miss legacy rows). A single combined endpoint (more API churn than needed).

## Card-shaped nested recipes

- **Decision**: Planner GET selects meal columns plus recipe card columns (no `ingredients` / `steps`). `getMealPlanForWeek` used by shopping POST keeps the full join (`includeMethod: true`).
- **Rationale**: Week cards need title, image, protein, times, tags, `can_edit`. Shopping generation is the only browse-adjacent consumer of method bodies, and it already re-reads meals on POST.
- **Alternatives considered**: Always return full recipes (status quo). A `?full=1` flag on GET (unused if shopping stays on POST).

## Defer the cookbook until Add

- **Decision**: Do not fetch `/api/recipes?includePublic=1` in `fetchData`. Fetch it when the picker opens if the list is empty. Recompute empty-day suggestions when recipes arrive.
- **Rationale**: First paint does not need the picker. Cards already match the recipe-list contract.
- **Alternatives considered**: Prefetch cookbook after first paint (extra bandwidth on every open). Keep blocking (rejected).

## One notes request

- **Decision**: `GET /api/planner-notes?from=&to=` returns `{ "YYYY-MM-DD": "note" }`. Planner maps those keys onto display-day indexes. PUT with `weekStart` is unchanged. Keep `?weekStart=` GET for compatibility.
- **Rationale**: A week that spans two storage Mondays currently issues two notes GETs. Calendar-day keys match constitution VII.
- **Alternatives considered**: Fold notes into planner GET (would bloat generate-list and Recipes callers). One GET per day (worse).

## Index

- **Decision**: `CREATE INDEX IF NOT EXISTS idx_meal_plans_owner_planned_on ON meal_plans (owner_id, planned_on)`. Create it where `planned_on` is ensured, not on the initial `CREATE TABLE` (that table has no `planned_on` yet).
- **Rationale**: Queries are `owner_id = $1 AND planned_on BETWEEN`. Existing indexes are date-only or `week_start`.
- **Alternatives considered**: Partial indexes; application cache.
