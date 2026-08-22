# Contract: Planner hold-drag + day rail

Module: `lib/plannerDrag.ts`

## Constants

| Name | Value | Role |
|------|-------|------|
| `HOLD_MS` | `400` | Press duration before a drag arms |
| `MOVE_CANCEL_PX` | `8` | Movement before hold that cancels the hold |
| `RAIL_DAYS` | `8` | Numbered dates on the rail (plus earlier/later pickers) |
| `RAIL_DAYS_BEFORE` | `2` | Days before the origin in the numbered window |

## Types

```ts
type HitRect = { left: number; right: number; top: number; bottom: number }

type WeekHit = HitRect & { index: number; iso: string }

type RailHit = HitRect & { iso: string }

type DragTarget =
  | { type: 'week-day'; index: number; iso: string }
  | { type: 'rail-day'; iso: string }
  | { type: 'rail-pick'; direction: 'earlier' | 'later' }
  | null
```

## Functions

### `holdArmed(elapsedMs, holdMs = HOLD_MS): boolean`

True when `elapsedMs >= holdMs`.

### `movementExceededThreshold(dx, dy, threshold = MOVE_CANCEL_PX): boolean`

True when `hypot(dx, dy) >= threshold`. Used both to cancel an unarmed hold and (after arming) as “they are dragging.”

### `surroundingTenDays(originIso: string): string[]`

Eight ISO dates: `origin - 2` … `origin + 5`, inclusive, in order. Earlier/later picker slots sit above and below.

### `storageWeeksForIsos(isos: string[]): string[]`

Unique Monday-canonical `week_start` values needed to load dinners for those dates (stable order, first-seen).

### `pointInRect(x, y, rect): boolean`

Inclusive box test.

### `resolveDragTarget(x, y, weekHits, railHits): DragTarget`

1. First rail hit that contains `(x, y)` → `{ type: 'rail-day', iso }`.
2. Else first week hit that contains `(x, y)` → `{ type: 'week-day', index, iso }`.
3. Else `null`.

### `dayOccupied(meals, iso): boolean`

True when any dinner in `meals` falls on that calendar date (via `storageCoords`).

### `titlesOnDay(meals, iso): string[]`

Dinner titles on that date, skipping blanks.

### `shouldAllowDrag(mealId): boolean`

False when `mealId` is empty or starts with `tmp-`.

## Required examples (tests)

- `holdArmed(399)` false; `holdArmed(400)` true.
- Movement `0,7` false; `0,8` true.
- `surroundingTenDays('2026-08-19')` is ten dates from `2026-08-15` through `2026-08-24` and includes `2026-08-19`.
- Pointer over a rail box returns `rail-day` even if a week row shares that Y.
- Pointer over a week row but left of the rail returns `week-day`.
- Empty meals → not occupied; a dinner on that ISO → occupied.
- `shouldAllowDrag('tmp-1')` false.
