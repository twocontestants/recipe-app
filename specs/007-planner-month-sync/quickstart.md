# Quickstart: Month prefetch and live planner sync

## Automated

```sh
npm test
```

Expected: `lib/plannerMonth.test.ts` plus existing suites.

## Manual — month copy

1. Open planner on this week. Network: one planner range request for this month (not one per week).
2. Next week in the same month: no new meal download; dinners still correct.
3. Day sheet occupancy for other days this month is already filled.

## Manual — live sync

1. Two browsers on the planner (same household).
2. Add or move a dinner in A. B updates without refresh.
3. A’s own screen is not reset to an older week.
