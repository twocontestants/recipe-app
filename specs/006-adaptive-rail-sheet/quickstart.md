# Quickstart: Adaptive rail and honest day-sheet occupancy

## Automated

```sh
npm test
```

Expected: existing suites plus `lib/plannerWeekCache.test.ts`, updated rail/week/sheet tests.

## Manual — rail

1. Phone-width portrait: hold a dinner. Five numbered days (origin ±2), Earlier at top, Later fully visible at the bottom.
2. Desktop or tall phone: more numbered days around the origin; Later still fully visible.
3. Drop on a numbered day still moves; Earlier/Later still open the shared sheet.

## Manual — sheet occupancy

1. Plan a named dinner on Wednesday this week.
2. Recipes → Add to planner, or planner Earlier/Later sheet: Wednesday lists that dinner; header says **This week**.
3. Tap next week: header **Next week**; Wednesday this week’s dinner is gone.
4. Tap previous: **This week** again; Wednesday still lists the dinner.
5. Move or add, reopen: the new date shows it.
