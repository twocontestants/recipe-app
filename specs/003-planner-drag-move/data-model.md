# Data model: Planner drag session

No new database tables. Meals stay `(week_start, day_of_week)` Monday-canonical.

## Drag session (client-only)

| Field | Meaning |
|-------|---------|
| mealId | Real meal plan id (not `tmp-…`) |
| fromDisplayDay | Column index on the week being viewed when the drag started |
| startX, startY | Pointer position at down |
| pointerX, pointerY | Current pointer |
| dragging | True once movement ≥ threshold |
| target | Result of `resolveDragTarget` |

## Drop target

| Type | Payload | Persist as |
|------|---------|------------|
| `day` | display day index 0–6 | `storageCoords` of that date on the current display week |
| `prev-week` | — | same display day index on `shiftWeek(current, -1)` |
| `next-week` | — | same display day index on `shiftWeek(current, +1)` |
| `null` | — | cancel |

## Validation

- Same day on the same week → no write.
- Failed write → restore the pre-drag meal row.
