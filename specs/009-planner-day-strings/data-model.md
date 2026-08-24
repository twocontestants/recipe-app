# Data model: Kitchen day strings

No schema change. 008 already added `planned_on` / `note_on` as calendar `DATE`.

## Kitchen day

| Form | Allowed |
|------|---------|
| `YYYY-MM-DD` | Yes — this is the type |
| Weekday label (`Mon Aug 24`) | No |
| Timestamp (`2026-08-24T00:00:00.000Z`) | Normalize back to `YYYY-MM-DD` if it appears; do not store as the planner match key |

## Columns

| Column | Type on the wire | After load |
|--------|------------------|------------|
| `meal_plans.planned_on` | Postgres `DATE` → `YYYY-MM-DD` text | Same string |
| `meal_plans.week_start` | Postgres `DATE` → `YYYY-MM-DD` text | Same string |
| `planner_notes.note_on` | Postgres `DATE` → `YYYY-MM-DD` text | Same string |

## Match rule

A dinner belongs on a display day when `planned_on ===` that day’s `YYYY-MM-DD` (see `mealOnDate`).
