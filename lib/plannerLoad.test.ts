import { describe, expect, it } from 'vitest';
import {
  countPlannedDays,
  displayWeekDateRange,
  hasMealRecipeMethod,
  notesByDisplayIndex,
  sameDisplayWeek,
} from './plannerLoad';

describe('sameDisplayWeek', () => {
  it('treats identical YYYY-MM-DD labels as the same week', () => {
    expect(sameDisplayWeek('2026-08-24', '2026-08-24')).toBe(true);
    expect(sameDisplayWeek('2026-08-24', '2026-08-17')).toBe(false);
  });
});

describe('displayWeekDateRange', () => {
  it('covers seven calendar days from the display week start', () => {
    expect(displayWeekDateRange('2026-08-24')).toEqual({ from: '2026-08-24', to: '2026-08-30' });
  });
});

describe('notesByDisplayIndex', () => {
  it('maps calendar-day notes onto display-day indexes', () => {
    expect(notesByDisplayIndex(
      { '2026-08-24': 'Mon', '2026-08-26': 'Wed', '2026-08-31': 'next' },
      '2026-08-24',
    )).toEqual({ 0: 'Mon', 2: 'Wed' });
  });
});

describe('hasMealRecipeMethod', () => {
  it('treats missing method arrays as a card', () => {
    expect(hasMealRecipeMethod({ recipe: {} })).toBe(false);
    expect(hasMealRecipeMethod({ recipe: { ingredients: [], steps: [] } })).toBe(true);
  });
});

describe('countPlannedDays', () => {
  const weekStart = '2026-08-24';

  it('is 0 when nothing is planned this week', () => {
    expect(countPlannedDays([], weekStart)).toBe(0);
    expect(countPlannedDays(
      [{ planned_on: '2026-08-20', meal_type: 'dinner' }],
      weekStart,
    )).toBe(0);
  });

  it('counts unique days, not meals, so two dinners on Monday stay 1 of 7', () => {
    expect(countPlannedDays([
      { planned_on: '2026-08-24', meal_type: 'dinner' },
      { planned_on: '2026-08-24', meal_type: 'dinner' },
      { planned_on: '2026-08-26', meal_type: 'dinner' },
    ], weekStart)).toBe(2);
  });

  it('ignores meals outside the display week so the counter cannot exceed 7', () => {
    const thisWeek = Array.from({ length: 7 }, (_, i) => ({
      planned_on: `2026-08-${24 + i}`,
      meal_type: 'dinner' as const,
    }));
    const extras = [
      { planned_on: '2026-08-17', meal_type: 'dinner' },
      { planned_on: '2026-08-23', meal_type: 'dinner' },
      { planned_on: '2026-08-31', meal_type: 'dinner' },
      { planned_on: '2026-09-02', meal_type: 'dinner' },
    ];
    expect(countPlannedDays([...thisWeek, ...extras], weekStart)).toBe(7);
  });

  it('does not count non-dinner meals', () => {
    expect(countPlannedDays([
      { planned_on: '2026-08-24', meal_type: 'lunch' },
      { planned_on: '2026-08-25', meal_type: 'dinner' },
    ], weekStart)).toBe(1);
  });
});
