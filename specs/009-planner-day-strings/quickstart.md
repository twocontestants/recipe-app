# Quickstart: Kitchen day strings

## Automated

```sh
npm test
```

Expected: `lib/plannerDate.test.ts` — `toDayIso('2026-08-24')` is `'2026-08-24'`; `mealOnDate` matches that string.

## Manual

1. Open the live planner. This week’s dinners (e.g. Pad Thai on Monday) are on the grid.
2. In the network panel, `GET /api/planner` `planned_on` values look like `2026-08-24`, not `Mon Aug 24`.
3. Refresh — same dinners on the same days.
