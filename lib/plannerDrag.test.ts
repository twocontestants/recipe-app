import { describe, expect, it } from 'vitest';
import {
  adjacentWeekIso,
  movementExceededThreshold,
  resolveDragTarget,
  shouldAllowDrag,
  type DayRect,
} from './plannerDrag';

const days: DayRect[] = [
  { index: 0, top: 0, bottom: 100 },
  { index: 1, top: 100, bottom: 200 },
  { index: 2, top: 200, bottom: 300 },
  { index: 3, top: 300, bottom: 700 },
];

describe('movementExceededThreshold', () => {
  it('stays a tap under 8px and becomes a drag at 8px', () => {
    expect(movementExceededThreshold(0, 7)).toBe(false);
    expect(movementExceededThreshold(5, 5)).toBe(false);
    expect(movementExceededThreshold(0, 8)).toBe(true);
    expect(movementExceededThreshold(8, 0)).toBe(true);
  });
});

describe('shouldAllowDrag', () => {
  it('rejects empty and optimistic temp ids', () => {
    expect(shouldAllowDrag('')).toBe(false);
    expect(shouldAllowDrag('tmp-1')).toBe(false);
    expect(shouldAllowDrag('a1b2c3')).toBe(true);
  });
});

describe('resolveDragTarget', () => {
  it('prefers the top edge band over a day that occupies that Y', () => {
    expect(resolveDragTarget(20, 700, days)).toEqual({ type: 'prev-week' });
  });

  it('prefers the bottom edge band over a day that occupies that Y', () => {
    expect(resolveDragTarget(680, 700, days)).toEqual({ type: 'next-week' });
  });

  it('hits a mid-list day when the pointer is not in an edge band', () => {
    expect(resolveDragTarget(220, 700, days)).toEqual({ type: 'day', index: 2 });
  });

  it('still returns prev-week at the top when there are no day rects', () => {
    expect(resolveDragTarget(50, 700, [])).toEqual({ type: 'prev-week' });
  });

  it('returns null over empty space between edge bands', () => {
    expect(resolveDragTarget(400, 700, [{ index: 0, top: 80, bottom: 160 }])).toBeNull();
  });
});

describe('adjacentWeekIso', () => {
  it('shifts a display week by seven days', () => {
    expect(adjacentWeekIso('2026-08-17', 1)).toBe('2026-08-24');
    expect(adjacentWeekIso('2026-08-17', -1)).toBe('2026-08-10');
  });
});
