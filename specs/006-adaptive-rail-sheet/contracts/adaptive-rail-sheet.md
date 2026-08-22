# Contract: Adaptive rail and day-sheet occupancy

## `railDayCount(viewportHeight)` — `lib/plannerDrag.ts`

| Input | Output |
|-------|--------|
| Phone-like height (~640–720 usable) | `5` |
| Extra height | `7`, `9`, or `11` (odd, cap 11) |
| Very short | still `5` |

Constants: `RAIL_MIN_DAYS = 5`, `RAIL_MAX_DAYS = 11`, pick-slot and day-slot heights documented in the module.

## `surroundingRailDays(originIso, count)` 

`count` consecutive local dates, origin in the middle (`before = floor((count-1)/2)`).

`surroundingTenDays(origin)` remains as `surroundingRailDays(origin, 5)` or is replaced; tests must expect ±2 by default.

## Display week keys — `lib/plannerDays.ts`

- `getThisDisplayWeek` → `localDateIso(startOfDisplayWeek(now))`
- `shiftWeek(iso, n)` → parse local, add `n * 7` local days, `localDateIso`
- `formatWeekLabel(shiftWeek(thisWeek, 1), now)` → `Next week`
- `formatWeekStart` **unchanged** (storage only)

## `weekPlanFromMeals(plans, displayWeekStart, weekStartsOn)`

For each display index `0…6`, include dinners where `mealOnIso(meal, localDateIso(dayDateOf(displayWeekStart, i)))`.

Do **not** rebuild the calendar date from `week_start` + `day_of_week` via UTC `isoDate`.

Required: Wednesday dinner stored as Monday-canonical `{ week_start, day_of_week: 2 }` still appears under Wednesday after `shiftWeek` away and back.

## `plannerWeekCache`

- `missingStorageWeeks(needed, cache)` — keys not present
- `writeStorageWeek(cache, week, meals)`
- `readStorageWeeks(cache, weeks)` — concat, skip missing
- `invalidateStorageWeeks(cache, weeks)`

Required: second read of the same week does not appear in `missingStorageWeeks`; after invalidate it does.
