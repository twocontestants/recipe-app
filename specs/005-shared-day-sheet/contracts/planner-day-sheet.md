# Contract: Shared planner day sheet

Modules: `lib/plannerDaySheet.ts`, `components/PlannerDaySheet.tsx`

## `sheetAnchorForRailPick(direction, originIso, weekStartsOn)`

Returns `{ weekStart, selectedDay }` for opening the sheet after an Earlier/Later drop.

| direction | `weekStart` | `selectedDay` |
|-----------|-------------|---------------|
| `earlier` | Display week before the origin’s display week | `6` (last day) |
| `later` | Display week after the origin’s display week | `0` (first day) |

`weekStart` uses `formatWeekStart(startOfDisplayWeek(...))` then `shiftWeek`, matching Recipes.

### Required examples

- Origin `2026-08-19` (Wed), week starts Monday: earlier → week of `2026-08-10`, day `6`; later → week of `2026-08-24`, day `0`.
- Origin `2026-08-19`, week starts Sunday: earlier/later still adjacent display weeks; selectedDay 6 vs 0.

## `weekPlanFromMeals(plans, displayWeekStart, weekStartsOn)`

Maps planner rows to `Record<number, { title, meal_type }[]>`. Only dinners whose calendar date falls in that display week. Keys are display-day indexes, not weekday-name strings.

### Required examples

- A Monday-canonical dinner on Wednesday appears under the Wednesday display index.
- A dinner in another display week is omitted.

## `isRailOrigin(iso, originIso)`

True when both ISO dates are the same day.

### Required examples

- `isRailOrigin('2026-08-19', '2026-08-19')` true.
- `isRailOrigin('2026-08-20', '2026-08-19')` false.

## PlannerDaySheet (UI)

Props include `title`, `recipeTitle`, `confirmVerb`, `weekStart`, `selectedDay`, `weekPlan`, `confirming`, `onClose`, `onShiftWeek`, `onSelectDay`, `onConfirm`, `weekStartsOn`.

- Seven `role="option"` rows; no 7-column day grid.
- Confirm control label is `{confirmVerb} · {weekday} {date}`.
- AddToPlannerModal is a wrapper: title `Add to planner`, confirmVerb `Add dinner`.

## Planner rail

- Earlier/Later drop opens the sheet; no `input type="date"` / `showPicker`.
- Numbered origin day (`isRailOrigin`) is greyed out, has no **From** caption, and is omitted from drop hit-testing.
