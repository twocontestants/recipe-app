# Contract: Week start math and preferences

## Preference API

`GET /api/preferences` returns:

```json
{ "categoryPrefMode": "ask", "weekStartDay": "monday" }
```

`weekStartDay` is always one of the seven lowercase weekday names. Missing or junk stored values become `"monday"`.

`PUT /api/preferences` accepts either or both of:

```json
{ "categoryPrefMode": "ask", "weekStartDay": "sunday" }
```

- Valid `weekStartDay` is persisted (normalised to lowercase).
- Invalid `weekStartDay` → `400` `{ "error": "invalid weekStartDay" }`; stored value unchanged.
- Omitting `weekStartDay` leaves it unchanged (category-only updates still work).

## Math (`lib/plannerDays.ts`)

Inputs use `DayKey` (`monday`…`sunday`). Indexes 0–6 remain Monday-canonical unless named `display*`.

| Function | Rule |
|----------|------|
| `parseWeekStartDay(value)` | Weekday name or 0–6 → `DayKey`. Anything else → `monday`. |
| `startOfDisplayWeek(date, weekStartsOn)` | Local midnight of the most recent `weekStartsOn` on or before `date`. |
| `displayDays(weekStartsOn)` | Seven `DayKey`s starting at `weekStartsOn` (e.g. Sunday → Sun…Sat). |
| `displayDayIndex(date, weekStartsOn)` | 0–6 offset of `date` from `startOfDisplayWeek`. |
| `storageCoords(date)` | `{ weekStart, dayOfWeek }` Monday-canonical for that calendar date. |
| `storageWeeksForDisplayWeek(displayWeekStartIso, weekStartsOn)` | Unique Monday `week_start` strings that overlap that display week (1 or 2). |
| `calendarDateOf(weekStart, dayOfWeek)` | Date of a stored meal (`week_start` Monday + `day_of_week`). |

### Required examples (tests)

- `startOfDisplayWeek(Wed 19 Aug 2026, sunday)` → Sun 16 Aug 2026.
- `startOfDisplayWeek(Wed 19 Aug 2026, monday)` → Mon 17 Aug 2026.
- `startOfDisplayWeek(Wed 19 Aug 2026, wednesday)` → Wed 19 Aug 2026.
- `displayDays('thursday')` → Thu, Fri, Sat, Sun, Mon, Tue, Wed.
- `parseWeekStartDay('nope')` → `monday`.
- A meal stored as `week_start=2026-08-17`, `day_of_week=2` (Wednesday) has calendar date 19 Aug after the start day changes to Sunday; `displayDayIndex` for that date with Sunday start is 3.

## Writes from the UI

When the cook picks a display column `i` in a display week starting `displayWeekStart`:

1. Calendar date = `displayWeekStart + i` days.
2. POST `/api/planner` with `storageCoords(that date)` — never the display index as `day_of_week` unless the start day is Monday.
