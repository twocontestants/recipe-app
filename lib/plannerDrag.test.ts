import { describe, expect, it } from 'vitest';
import {
  dayOccupied,
  holdArmed,
  movementExceededThreshold,
  shouldArmFromMovement,
  edgeScrollDelta,
  bottomNavReserve,
  railDayCount,
  resolveDragTarget,
  shouldAllowDrag,
  surroundingRailDays,
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

describe('shouldArmFromMovement', () => {
  it('arms a mouse or touch handle-drag once movement passes 8px', () => {
    expect(shouldArmFromMovement(false, 0, 7)).toBe(false);
    expect(shouldArmFromMovement(false, 0, 8)).toBe(true);
    expect(shouldArmFromMovement(false, 8, 0)).toBe(true);
    expect(shouldArmFromMovement(true, 0, 20)).toBe(false);
  });
});

describe('edgeScrollDelta', () => {
  it('scrolls up in the top band and down in the bottom band', () => {
    expect(edgeScrollDelta(0, 800)).toBeLessThan(0);
    expect(edgeScrollDelta(400, 800)).toBe(0);
    expect(edgeScrollDelta(800, 800)).toBeGreaterThan(0);
  });

  it('scrolls faster closer to the edge', () => {
    expect(Math.abs(edgeScrollDelta(0, 800))).toBeGreaterThan(Math.abs(edgeScrollDelta(40, 800)));
  });

  it('keeps the bottom tab bar out of the downward scroll zone', () => {
    expect(edgeScrollDelta(640, 800, 80)).toBe(0);
    expect(edgeScrollDelta(799, 800, 80)).toBeGreaterThan(0);
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
  it('is the origin plus two days before and two after', () => {
    expect(surroundingTenDays('2026-08-19')).toEqual([
      '2026-08-17',
      '2026-08-18',
      '2026-08-19',
      '2026-08-20',
      '2026-08-21',
    ]);
  });
});

describe('bottomNavReserve', () => {
  it('uses the measured tab bar on a phone and ignores the desktop sidebar height', () => {
    expect(bottomNavReserve(390, 72)).toBe(72);
    expect(bottomNavReserve(600, 68)).toBe(68);
    expect(bottomNavReserve(901, 800)).toBe(0);
  });
});

describe('railDayCount / surroundingRailDays', () => {
  it('uses five numbered days on a phone-height screen', () => {
    expect(railDayCount(667)).toBe(5);
    expect(railDayCount(400)).toBe(5);
    expect(railDayCount(667, 72)).toBe(5);
  });

  it('grows to more odd-length windows on a taller screen', () => {
    expect(railDayCount(900)).toBeGreaterThanOrEqual(7);
    expect(railDayCount(900) % 2).toBe(1);
    expect(railDayCount(1400)).toBeLessThanOrEqual(11);
  });

  it('keeps Later on-screen by using less height when the tab bar is reserved', () => {
    expect(railDayCount(900, 0)).toBeGreaterThan(railDayCount(900, 220));
    expect(railDayCount(900, 220)).toBe(5);
  });

  it('keeps the origin in the middle of a longer window', () => {
    expect(surroundingRailDays('2026-08-19', 7)).toEqual([
      '2026-08-16',
      '2026-08-17',
      '2026-08-18',
      '2026-08-19',
      '2026-08-20',
      '2026-08-21',
      '2026-08-22',
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

  it('does not let a full-width first day steal a rail drop, or the rail steal a first-day drop', () => {
    const firstDay: WeekHit[] = [
      { index: 0, iso: '2026-08-17', left: 0, right: 400, top: 0, bottom: 120 },
    ];
    const topRail: RailHit[] = [
      { iso: '2026-08-16', left: 310, right: 400, top: 0, bottom: 120 },
    ];
    expect(resolveDragTarget(80, 60, firstDay, topRail)).toEqual({
      type: 'week-day',
      index: 0,
      iso: '2026-08-17',
    });
    expect(resolveDragTarget(340, 60, firstDay, topRail)).toEqual({
      type: 'rail-day',
      iso: '2026-08-16',
    });
  });

  it('returns null over empty space', () => {
    expect(resolveDragTarget(120, 40, weekHits, railHits)).toBeNull();
  });

  it('hits earlier and later picker slots on the rail', () => {
    const picks: RailHit[] = [
      { pick: 'earlier', left: 310, right: 400, top: 0, bottom: 50 },
      { pick: 'later', left: 310, right: 400, top: 650, bottom: 700 },
    ];
    expect(resolveDragTarget(340, 20, [], picks)).toEqual({
      type: 'rail-pick',
      direction: 'earlier',
    });
    expect(resolveDragTarget(340, 680, [], picks)).toEqual({
      type: 'rail-pick',
      direction: 'later',
    });
  });
});

const meals = [
  { planned_on: '2026-08-19', week_start: '2026-08-17', day_of_week: 2, meal_type: 'dinner', recipe: { title: 'Tacos' } },
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
