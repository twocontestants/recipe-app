# Quickstart: Shared planner day sheet

## Automated

```sh
npm test
```

Expected: Vitest passes `lib/plannerDaySheet.test.ts`, `components/PlannerDaySheet.test.tsx`, and existing `components/AddToPlannerModal.test.tsx`.

## Manual — Recipes add (no regression)

1. Open Recipes → a recipe → Add to planner.
2. Week arrows still change the week label; seven full-width days list occupancy.
3. Confirm still adds dinner on the selected day.

## Manual — Earlier / Later move

1. Planner: hold the left grip on a dinner until the rail appears.
2. The dinner’s date shows **From**.
3. Drop on **Earlier**. The shared sheet opens on the previous week (last day selected). No system date popup.
4. Pick a day → confirm. The meal is there.
5. Repeat with **Later**, then close the sheet without confirming. The meal stays put.
6. Drop on a numbered rail day — immediate move, no sheet.

## Manual — shared updates

Change the sheet title spacing or day-row layout once in `PlannerDaySheet`. Both Recipes add and planner move show the change.
