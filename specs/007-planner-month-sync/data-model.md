# Data model: Month copy and planner events

No new tables.

## Calendar month

| Field | Meaning |
|-------|---------|
| `key` | `YYYY-MM` local |
| `from`, `to` | First and last local dates of that month |
| `storageWeeks` | Distinct `storageCoords().weekStart` for days in `[from, to]` |

A display week that spans two months requires both month keys to be loaded.

## Local copy

| Field | Meaning |
|-------|---------|
| `mealsById` | All dinners from loaded months |
| `loadedMonths` | Month keys already fetched this visit |

On remote `planner-changed`: clear both, reload months needed for the week on screen.

## Planner change event

No payload required. Receivers re-read. Sender has already updated locally.

## Validation

- Range GET rejects missing/inverted dates and ranges longer than 62 days.
- Existing `?weekStart=` GET remains.
