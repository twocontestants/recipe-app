# Contract: Planner drag hit-testing

Module: `lib/plannerDrag.ts`

## Constants

| Name | Value | Role |
|------|-------|------|
| `DRAG_THRESHOLD_PX` | `8` | Movement from pointer-down before a drag starts |
| `EDGE_BAND_PX` | `56` | Viewport top/bottom band that reveals week strips |

## Types

```ts
type DayRect = { index: number; top: number; bottom: number }

type DragTarget =
  | { type: 'day'; index: number }
  | { type: 'prev-week' }
  | { type: 'next-week' }
  | null
```

## Functions

### `movementExceededThreshold(dx, dy, threshold = DRAG_THRESHOLD_PX): boolean`

True when `hypot(dx, dy) >= threshold`.

### `resolveDragTarget(pointerY, viewportHeight, days, edgeBand = EDGE_BAND_PX): DragTarget`

Priority:

1. If `pointerY <= edgeBand` → `{ type: 'prev-week' }` (even if a day rect overlaps that Y).
2. If `pointerY >= viewportHeight - edgeBand` → `{ type: 'next-week' }`.
3. Else the last day rect where `top <= pointerY < bottom` (or `<= bottom` on the last day). If none, `null`.

Days are the current week’s column rects in viewport coordinates (already includes scroll).

### `adjacentWeekIso(displayWeekStartIso, direction): string`

`direction` is `-1` (previous) or `1` (next). Returns `shiftWeek(displayWeekStartIso, direction)` — the display-week start, not a Monday unless the household week starts Monday.

### `shouldAllowDrag(mealId): boolean`

False when `mealId` is empty or starts with `tmp-`.

## Required examples (tests)

- Threshold: 7 px diagonal false; 8 px true.
- `pointerY = 20`, `viewportHeight = 700`, days covering 0–700 → `prev-week`, not a day.
- `pointerY = 680`, same viewport → `next-week`.
- `pointerY = 200` over day index 2’s rect → `{ type: 'day', index: 2 }`.
- `pointerY = 50` with no days → `prev-week` still (edge wins).
- `adjacentWeekIso('2026-08-17', 1)` → `'2026-08-24'`; `-1` → `'2026-08-10'`.
- `shouldAllowDrag('tmp-1')` false; `shouldAllowDrag('uuid')` true.
