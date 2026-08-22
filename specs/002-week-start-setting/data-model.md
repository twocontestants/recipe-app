# Data model: Week start day

## WeekStartDay

Household preference for column one of every planning week.

| Field | Type | Rules |
|-------|------|--------|
| value | weekday name | One of `monday`, `tuesday`, `wednesday`, `thursday`, `friday`, `saturday`, `sunday` |
| default | `monday` | Used when missing or unreadable |
| storage | `app_settings.key = weekStartDay` | Same table as `categoryPrefMode` |

No other entities are added.

## Planned meal (unchanged rows)

| Field | Meaning (canonical) |
|-------|---------------------|
| `week_start` | Monday (ISO date) of the calendar week that contains the meal |
| `day_of_week` | 0 = Monday … 6 = Sunday |

Display mapping:

1. Calendar date of a stored meal = `week_start + day_of_week` days.
2. Display week start = most recent chosen weekday on or before “today” (or the week being viewed).
3. Column index = days from that display week start to the calendar date (0–6).

A meal never changes `week_start` / `day_of_week` when the preference changes.

## Day note (unchanged rows)

Same canonical pair `(week_start, day_of_week)` as meals. Notes follow the meal mapping so Friday’s note stays on Friday.

## Validation

- PUT body `weekStartDay` must be a weekday name (case-insensitive); otherwise 400.
- GET returns a normalised lowercase weekday name, never a raw invalid string.
