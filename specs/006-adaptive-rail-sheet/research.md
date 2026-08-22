# Research: Adaptive rail and honest day-sheet occupancy

## Why Later is cut off

- **Decision**: Default numbered window is origin ±2 (5 days). Count grows from viewport height minus Earlier/Later slots **and** the phone tab bar. The rail’s bottom edge is `--bottom-nav-height` (measured `.sidebar` on a phone). Numbered days stay flex-distributed only after the count fits.
- **Rationale**: Eight fixed days plus titles overflow phone height. After ±2 landed, Later still sat under the bottom nav (`z-index` above the rail). The cook asked for the rail height to account for that bar.
- **Alternatives considered**: Scroll the rail (easy to lose Later). Shrink circles (harder to hit). Keep 8 and clip (old bug). Raise the rail above the nav (covers the tabs).

## Why labels and occupancy glitch

- **Decision**: Display-week keys (`getThisDisplayWeek`, `shiftWeek`, `displayWeekOf`) use `localDateIso` of local midnight. Occupancy for a sheet day uses `storageCoords` of that calendar date (same as the planner list). `formatWeekStart` / `isoDate(Date)` stay the storage key.
- **Rationale**: `shiftWeek` currently returns `toISOString()` of local midnight, which east of UTC becomes the previous calendar day. After one arrow, the key no longer equals “this/next week”, so the header flips to a date range, and `weekPlanFromMeals` (which rebuilds dates from `week_start` + index) misses rows.
- **Alternatives considered**: Change `formatWeekStart` globally (would desync existing AU `week_start` rows). Native date popup (already rejected).

## Cache

- **Decision**: In-memory map storage-week → meals. Fetch only missing weeks. Invalidate storage weeks touched by a successful add or move.
- **Rationale**: Week arrows re-requested the same week every time; a write must not leave a stale list.
- **Alternatives considered**: Always refetch (slow, flickered empty). Persist to sessionStorage (stale across tabs, more code).
