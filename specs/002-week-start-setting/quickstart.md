# Quickstart: Week start setting

## Prerequisites

- App dependencies installed (`npm install`)
- `npm test` available (Vitest)

## Automated checks

```bash
npm test
```

Expect the new cases in `lib/plannerDays.test.ts` (and any Settings/modal updates) to pass, including:

- Sunday / Wednesday / Thursday start-of-week dates for 19 Aug 2026
- Thursday-first day list
- Invalid value → Monday
- Stored Wednesday stays 19 Aug when the start day is Sunday

## Manual check (optional)

1. Open Settings. Confirm **Week starts on** shows Monday.
2. Choose Sunday. Confirm a success toast.
3. Open the planner: first day is Sunday; today is still highlighted; existing dinners sit on the same dates.
4. From Recipes, add a meal to a day in this week. Open the planner and confirm it landed on that calendar date.
5. Set the start day back to Monday. The same meals remain on the same dates; columns are Mon–Sun again.

## Failure

If PUT is rejected, Settings must keep the previous weekday and show an error toast. The planner must still load (Monday fallback if the stored value is unreadable).
