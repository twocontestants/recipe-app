import { describe, expect, it } from 'vitest';
import {
  dayOccupied,
  holdArmed,
  movementExceededThreshold,
  resolveDragTarget,
  shouldAllowDrag,
  surroundingTenDays,
  titlesOnDay,
  type RailHit,
  type WeekHit,
} from './plannerDrag';

describe('holdArmed', () => {
  it('stays a tap under 400ms and arms at 400ms', () => {
    expect(holdArmed(399)).toBe(false);
    expect(holdArmed(400)).toBe(true);
  });
});

describe('movementExceededThreshold', () => {
  it('cancels an unarmed hold at 8px and stays put under that', () => {
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

describe('surroundingTenDays', () => {
  it('is four days before the origin, the origin, and five days after', () => {
    expect(surroundingTenDays('2026-08-19')).toEqual([
      '2026-08-15',
      '2026-08-16',
      '2026-08-17',
      '2026-08-18',
      '2026-08-19',
      '2026-08-20',
      '2026-08-21',
      '2026-08-22',
      '2026-08-23',
      '2026-08-24',
    ]);
  });
});

const weekHits: WeekHit[] = [
  { index: 2, iso: '2026-08-19', left: 0, right: 300, top: 200, bottom: 300 },
];

const railHits: RailHit[] = [
  { iso: '2026-08-22', left: 310, right: 400, top: 200, bottom: 300 },
];

describe('resolveDragTarget', () => {
  it('prefers a rail day when the pointer is over the rail even if a week row shares that Y', () => {
    expect(resolveDragTarget(340, 250, weekHits, railHits)).toEqual({
      type: 'rail-day',
      iso: '2026-08-22',
    });
  });

  it('returns the week day when the pointer is over the week list and left of the rail', () => {
    expect(resolveDragTarget(120, 250, weekHits, railHits)).toEqual({
      type: 'week-day',
      index: 2,
      iso: '2026-08-19',
    });
  });

  it('returns null over empty space', () => {
    expect(resolveDragTarget(120, 40, weekHits, railHits)).toBeNull();
  });
});

const meals = [
  { week_start: '2026-08-17', day_of_week: 2, meal_type: 'dinner', recipe: { title: 'Tacos' } },
];

describe('dayOccupied / titlesOnDay', () => {
  it('treats a date with no dinners as empty', () => {
    expect(dayOccupied(meals, '2026-08-20')).toBe(false);
    expect(titlesOnDay(meals, '2026-08-20')).toEqual([]);
  });

  it('treats a date with a dinner as occupied and lists the title', () => {
    expect(dayOccupied(meals, '2026-08-19')).toBe(true);
    expect(titlesOnDay(meals, '2026-08-19')).toEqual(['Tacos']);
  });
});
