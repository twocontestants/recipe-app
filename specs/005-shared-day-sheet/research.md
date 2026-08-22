# Research: Shared planner day sheet

## One sheet vs two copies

- **Decision**: Extract the existing Add to planner markup/CSS into `PlannerDaySheet`. Recipes keeps `AddToPlannerModal` as a thin wrapper (`title` / `confirmVerb` / `onAdd`). Planner imports the sheet directly for moves.
- **Rationale**: The user asked to modularise so updates apply once. A wrapper avoids churning every Recipes import and keeps the existing test file meaningful.
- **Alternatives considered**: Duplicate the modal in PlannerClient (will drift). Delete AddToPlannerModal and point Recipes at the new name only (more import churn, same result).

## Earlier / Later default week

- **Decision**: Earlier opens the display week **before** the meal’s display week, last day selected. Later opens the display week **after**, first day selected. Week keys use the same `formatWeekStart(startOfDisplayWeek)` / `shiftWeek` pair as Recipes.
- **Rationale**: “Beyond the numbered rail” maps cleanly to the adjacent week; the cook can arrow further. Matching Recipes week keys avoids a second date-key scheme (including the known UTC `formatWeekStart` behaviour).
- **Alternatives considered**: Native `input type="date"` (rejected by the user). Anchor to the first date outside the eight-day rail window (more accurate to the rail edges, harder to explain). Always open the current week (does not help “go to previous days”).

## Occupancy on the sheet

- **Decision**: Extract `weekPlanFromMeals` from the Recipes fetch mapper. Both clients fetch storage weeks for the display week, then group dinners by display-day index.
- **Rationale**: Constitution: extract the rule. Recipes already had the mapping inline.
- **Alternatives considered**: Planner-only occupancy from `mealPlans` already on screen (lies for other weeks).

## Origin mark

- **Decision**: Grey out the numbered rail day whose ISO equals `originIso`. No **From** caption. That day is not a drop target.
- **Rationale**: The cook asked to de-emphasise the source instead of a label. The caption stole height on the phone rail (Later already sits tight above the tab bar).
- **Alternatives considered**: A From label plus rust ring (shipped, then rejected — extra space). Thicker ring only (too subtle on an occupied rust circle).
