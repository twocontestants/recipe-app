# Research: Calendar-date dinners

## Why not only change `formatWeekStart`?

- **Decision**: Add a real calendar date column. Do not only switch `formatWeekStart` to `localDateIso`.
- **Rationale**: The cook asked to save a date. Week+weekday is still a pair that clients must reconstruct. A date is what they mean. Existing Sunday keys would still need a one-time conversion either way.
- **Alternatives considered**: Change `formatWeekStart` only (still no stored date). Drop week columns immediately (breaks shopping-list and `?weekStart=`).

## How to recover the kitchen date from old rows

- **Decision**:
  - If `week_start` is a Monday: `planned_on = week_start + day_of_week`.
  - Otherwise (typical AU Sunday key): `planned_on = next Monday after week_start + day_of_week`.
- **Rationale**: UTC writes stored Monday via `toISOString()`. AU writes stored Sunday (local Monday midnight in UTC). `day_of_week` is always Monday-canonical 0–6.
- **Examples**:
  - AU: `(2026-08-16, 0)` → Monday 17 Aug.
  - UTC: `(2026-08-17, 0)` → Monday 17 Aug.
  - AU Wednesday: `(2026-08-16, 2)` → 19 Aug.

## How week queries keep working

- **Decision**: After backfill, rewrite `week_start` / `day_of_week` from `planned_on` using ISO Monday (`planned_on - (isodow-1)`). `GET ?weekStart=` resolves a **span**: Monday key → that Monday…+6; Sunday key → next day…+6 (old AU key). Range GET filters `planned_on`.
- **Rationale**: Shopping lists and notes still pass week keys. Old Sunday keys must not 404 the week.
- **Alternatives considered**: Dual-read old and new keys in the client only (server would still miss). Pad `week_start` forever (hides the model).

## Notes and shopping lists

- **Decision**: `planner_notes` get `note_on` with the same inference and synced week columns. Shopping-list `week_starts` on already-saved lists stay as labels. New generation reads meals by `planned_on`.
- **Rationale**: Notes are per kitchen day. Old lists are snapshots.

## Client matching

- **Decision**: A dinner belongs on a day when `planned_on` (or inferred date if an old payload lacks it) equals `localDateIso(that day)`. Stop comparing `week_start` via `toISOString()`.
- **Rationale**: Display already uses local dates. Storage now matches.
