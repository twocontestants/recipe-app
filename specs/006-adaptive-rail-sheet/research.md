# Research: Adaptive rail and honest day-sheet occupancy

## Why Later is cut off

- **Decision**: Default numbered window is origin ±2 (5 days). Count grows from viewport height minus Earlier/Later slots. Numbered days stay flex-distributed only after the count fits.
- **Rationale**: Eight fixed days plus titles overflow phone height. The cook asked for ±2, then more on taller screens.
- **Alternatives considered**: Scroll the rail (easy to lose Later). Shrink circles (harder to hit). Keep 8 and clip (current bug).

## Why labels and occupancy glitch

- **Decision**: Display-week keys (`getThisDisplayWeek`, `shiftWeek`, `displayWeekOf`) use `localDateIso` of local midnight. Occupancy for a sheet day uses `storageCoords` of that calendar date (same as the planner list). `formatWeekStart` / `isoDate(Date)` stay the storage key.
- **Rationale**: `shiftWeek` currently returns `toISOString()` of local midnight, which east of UTC becomes the previous calendar day. After one arrow, the key no longer equals “this/next week”, so the header flips to a date range, and `weekPlanFromMeals` (which rebuilds dates from `week_start` + index) misses rows.
- **Alternatives considered**: Change `formatWeekStart` globally (would desync existing AU `week_start` rows). Native date popup (already rejected).

## Cache

- **Decision**: In-memory map storage-week → meals. Fetch only missing weeks. Invalidate storage weeks touched by a successful add or move.
- **Rationale**: Week arrows re-requested the same week every time; a write must not leave a stale list.
- **Alternatives considered**: Always refetch (slow, flickered empty). Persist to sessionStorage (stale across tabs, more code).
