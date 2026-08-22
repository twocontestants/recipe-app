import { shiftWeek } from './plannerDays';

export const DRAG_THRESHOLD_PX = 8;
export const EDGE_BAND_PX = 56;

export interface DayRect {
  index: number;
  top: number;
  bottom: number;
}

export type DragTarget =
  | { type: 'day'; index: number }
  | { type: 'prev-week' }
  | { type: 'next-week' }
  | null;

export function movementExceededThreshold(
  dx: number,
  dy: number,
  threshold = DRAG_THRESHOLD_PX,
): boolean {
  return Math.hypot(dx, dy) >= threshold;
}

export function resolveDragTarget(
  pointerY: number,
  viewportHeight: number,
  days: DayRect[],
  edgeBand = EDGE_BAND_PX,
): DragTarget {
  if (pointerY <= edgeBand) return { type: 'prev-week' };
  if (pointerY >= viewportHeight - edgeBand) return { type: 'next-week' };

  const sorted = [...days].sort((a, b) => a.top - b.top);
  for (let i = 0; i < sorted.length; i++) {
    const day = sorted[i];
    const last = i === sorted.length - 1;
    if (pointerY >= day.top && (last ? pointerY <= day.bottom : pointerY < day.bottom)) {
      return { type: 'day', index: day.index };
    }
  }
  return null;
}

export function adjacentWeekIso(displayWeekStartIso: string, direction: -1 | 1): string {
  return shiftWeek(displayWeekStartIso, direction);
}

export function shouldAllowDrag(mealId: string): boolean {
  return Boolean(mealId) && !mealId.startsWith('tmp-');
}
