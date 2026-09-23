# Data model: Planner add landing

No new database tables. Dinners stay `planned_on` day strings.

## Landing session (client-only)

| Field | Meaning |
|-------|---------|
| mealId | Id of the dinner that just appeared (`tmp-…` until POST returns) |
| dayIndex | Display-week column 0–6 of the destination day |
| weekStartIso | Display week start `YYYY-MM-DD` that contains the destination day |

## Transitions

1. Cook chooses a recipe → selector session cleared; landing session created with the optimistic meal id.
2. POST succeeds → `mealId` becomes the server id if it still matched the temp id.
3. `ADD_LANDING_MS` after the destination week is the week on screen (and any week motion has finished) → landing session cleared.
4. POST fails → meal removed; landing session cleared.

## Validation

- Landing class applies only when `meal.id === landing.mealId`.
- Destination week is revealed when `weekStartIso` ≠ the week currently shown.
- Dismissing the selector with no choice creates no landing session.
