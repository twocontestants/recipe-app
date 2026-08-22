# Data model: Calendar-date dinners

No new tables. Additive columns on existing rows.

## `meal_plans`

| Column | Role |
|--------|------|
| `planned_on` | **Source of truth.** Calendar `DATE` the household meant. |
| `week_start` | Derived ISO Monday of `planned_on`. Kept so `WHERE week_start = ANY(...)` and shopping-list week fetches still work. |
| `day_of_week` | Derived 0–6 Monday-canonical of `planned_on`. |
| `recipe_id`, `meal_type`, `servings` | Unchanged. |

Index: `idx_meal_plans_planned_on` on `planned_on`. Keep `idx_meal_plans_week`.

### Backfill

```
if ISODOW(week_start) = 1:
  planned_on = week_start + day_of_week
else:
  planned_on = (week_start + (8 - ISODOW(week_start))) + day_of_week
```

Then set `week_start` / `day_of_week` from `planned_on`.

## `planner_notes`

| Column | Role |
|--------|------|
| `note_on` | Calendar date of the note. |
| `week_start`, `day_of_week` | Synced, same rules. Existing primary key remains; add unique `note_on` when present. |

## Write rule

On insert/update: if `planned_on` is provided, use it; else infer from `week_start` + `day_of_week`. Always persist all three so every query path hits the row.

## Read rule

- Range: `planned_on BETWEEN from AND to`.
- Week key `K`: meals with `planned_on` in `weekSpanForStoredKey(K)`.
- Display match: `planned_on === localDateIso(day)`.
