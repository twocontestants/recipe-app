# Contract: Calendar-date dinners

## `lib/plannerDate.ts`

### `inferPlannedOn(weekStart, dayOfWeek) → YYYY-MM-DD`

| week_start | day_of_week | planned_on |
|------------|-------------|------------|
| `2026-08-16` (Sun) | 0 | `2026-08-17` |
| `2026-08-16` | 2 | `2026-08-19` |
| `2026-08-17` (Mon) | 0 | `2026-08-17` |
| `2026-08-17` | 2 | `2026-08-19` |

### `coordsFromPlannedOn(plannedOn) → { weekStart, dayOfWeek }`

ISO Monday, not `toISOString()`.

| planned_on | weekStart | dayOfWeek |
|------------|-----------|-----------|
| `2026-08-17` | `2026-08-17` | 0 |
| `2026-08-19` | `2026-08-17` | 2 |
| `2026-08-16` | `2026-08-10` | 6 |

### `weekSpanForStoredKey(key) → { from, to }`

| key | from | to |
|-----|------|----|
| `2026-08-17` (Mon) | `2026-08-17` | `2026-08-23` |
| `2026-08-16` (Sun) | `2026-08-17` | `2026-08-23` |

### `mealOnDate(meal, iso)`

True when `planned_on` (or inferred date) equals `iso`.

## SQL

- `getMealPlansInDateWindow(from, to)` → `planned_on >= from AND planned_on <= to` (keep the function name).
- `getMealPlansForWeeks(keys)` → `planned_on` in the union of `weekSpanForStoredKey` for each key. Still used by `?weekStart=` and shopping lists.
- `addToMealPlan` writes `planned_on`, `week_start`, `day_of_week`.
- Notes: same span on `note_on`; `setPlannerNote` writes all three.

## HTTP

### `POST /api/planner`

Accepts `planned_on` **or** `week_start` + `day_of_week`. Response includes all three.

### `GET /api/planner?weekStart=`

Unchanged URL. Returns dinners in that key’s week span.

### `GET /api/planner?from=&to=`

Returns dinners with `planned_on` in range (plus optional `weeks=` union via week spans).

`GET/POST /api/planner-notes?weekStart=` unchanged URLs; storage uses `note_on`.
