# Research: Kitchen day as YYYY-MM-DD text

## What is a planned day?

- **Decision**: The kitchen day is the `YYYY-MM-DD` string. Postgres `DATE` already serializes that way on the wire.
- **Rationale**: The cook said it is not a calculated ISO instant. Weekday labels and timestamps are the wrong type.
- **Alternatives considered**: Recover the day via `Date.toISOString().slice(0, 10)` (works but hides the model). `String(date).slice(0, 10)` (yields `"Mon Aug 24"`).

## How the dinners vanished

- **Decision**: `node-pg` default DATE parser returns a JS `Date` at UTC midnight. `String(date).slice(0, 10)` became `"Mon Aug 24"`. The planner matches `YYYY-MM-DD`, so every meal missed its cell. The database still had the rows.
- **Rationale**: Confirmed on production GET `/api/planner` — meals present, `planned_on` was a weekday phrase.
- **Alternatives considered**: “Empty DB after Neon password change” (recipes and meals still loaded). Timezone math (wrong diagnosis).

## How to keep DATE as text

- **Decision**: `types.setTypeParser(types.builtins.DATE, value => value)` so DATE stays `YYYY-MM-DD`. Mapper uses `toDayIso` only to pass that string through (and to accept an ISO timestamp if one still appears).
- **Rationale**: Matches the product type. No calendar conversion.
- **Alternatives considered**: SQL `::text` on every query (easy to miss). Only `toISOString` in the mapper (still a Date in memory).
