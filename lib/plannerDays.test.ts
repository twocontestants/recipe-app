import { describe, expect, it } from 'vitest';
import {
  buildPlannerPostBody,
  calendarDateOf,
  dayDateOf,
  displayDayIndex,
  displayDays,
  formatWeekLabel,
  indexToDayKey,
  parseDayOfWeek,
  parseWeekStartDay,
  shiftWeek,
  startOfDisplayWeek,
  storageCoords,
  storageWeeksForDisplayWeek,
  todayDayIndex,
} from './plannerDays';

describe('parseDayOfWeek', () => {
  it('accepts integer indexes used by the planner page', () => {
    expect(parseDayOfWeek(0)).toBe(0);
    expect(parseDayOfWeek(6)).toBe(6);
  });

  it('accepts weekday names the Recipes modal used to send', () => {
    expect(parseDayOfWeek('monday')).toBe(0);
    expect(parseDayOfWeek('Wednesday')).toBe(2);
    expect(parseDayOfWeek('SUN')).toBe(6);
  });

  it('rejects values Postgres would reject', () => {
    expect(parseDayOfWeek('monday ')).toBe(0);
    expect(parseDayOfWeek(7)).toBeNull();
    expect(parseDayOfWeek(-1)).toBeNull();
    expect(parseDayOfWeek(1.5)).toBeNull();
    expect(parseDayOfWeek('octember')).toBeNull();
    expect(parseDayOfWeek(undefined)).toBeNull();
    expect(parseDayOfWeek(null)).toBeNull();
  });
});

describe('buildPlannerPostBody', () => {
  it('always posts an integer day_of_week, even when given a weekday name', () => {
    const body = buildPlannerPostBody({
      weekStart: '2026-08-17',
      dayOfWeek: 'thursday',
      recipeId: 'recipe-1',
      servings: 3,
    });
    expect(body).toEqual({
      week_start: '2026-08-17',
      recipe_id: 'recipe-1',
      day_of_week: 3,
      meal_type: 'dinner',
      servings: 3,
    });
    expect(typeof body.day_of_week).toBe('number');
  });

  it('defaults servings and dinner when those are omitted', () => {
    const body = buildPlannerPostBody({
      weekStart: '2026-08-17',
      dayOfWeek: 1,
      recipeId: 'recipe-2',
    });
    expect(body.servings).toBe(4);
    expect(body.meal_type).toBe('dinner');
    expect(body.day_of_week).toBe(1);
  });

  it('throws instead of sending a string the database cannot store', () => {
    expect(() =>
      buildPlannerPostBody({
        weekStart: '2026-08-17',
        dayOfWeek: 'not-a-day',
        recipeId: 'recipe-1',
      }),
    ).toThrow(/day_of_week/);
  });
});

describe('week helpers', () => {
  it('shifts a week by seven local days', () => {
    expect(shiftWeek('2026-08-17', 1)).toBe('2026-08-24');
    expect(shiftWeek('2026-08-17', -1)).toBe('2026-08-10');
  });

  it('labels this week and next week from a fixed now', () => {
    const now = new Date('2026-08-19T10:00:00');
    expect(formatWeekLabel('2026-08-17', now)).toBe('This week');
    expect(formatWeekLabel('2026-08-24', now)).toBe('Next week');
    expect(formatWeekLabel('2026-08-31', now)).toMatch(/31/);
  });

  it('maps today and day dates from a Monday week start', () => {
    expect(todayDayIndex(new Date('2026-08-19T10:00:00'))).toBe(2);
    expect(indexToDayKey(2)).toBe('wednesday');
    expect(dayDateOf('2026-08-17', 2).getDate()).toBe(19);
  });
});

describe('parseWeekStartDay', () => {
  it('accepts any weekday name or Monday-canonical index', () => {
    expect(parseWeekStartDay('sunday')).toBe('sunday');
    expect(parseWeekStartDay('Thursday')).toBe('thursday');
    expect(parseWeekStartDay(0)).toBe('monday');
    expect(parseWeekStartDay(6)).toBe('sunday');
  });

  it('falls back to monday for junk values', () => {
    expect(parseWeekStartDay('nope')).toBe('monday');
    expect(parseWeekStartDay(undefined)).toBe('monday');
    expect(parseWeekStartDay(9)).toBe('monday');
  });
});

describe('display week math', () => {
  const wed = new Date('2026-08-19T10:00:00');

  it('finds the start of the display week for any weekday', () => {
    expect(startOfDisplayWeek(wed, 'sunday').getDate()).toBe(16);
    expect(startOfDisplayWeek(wed, 'monday').getDate()).toBe(17);
    expect(startOfDisplayWeek(wed, 'wednesday').getDate()).toBe(19);
  });

  it('rotates the seven days from the chosen start', () => {
    expect(displayDays('thursday')).toEqual([
      'thursday', 'friday', 'saturday', 'sunday', 'monday', 'tuesday', 'wednesday',
    ]);
  });

  it('keeps a stored Wednesday on 19 Aug when the start day changes', () => {
    const stored = { weekStart: '2026-08-17', dayOfWeek: 2 };
    const cal = calendarDateOf(stored.weekStart, stored.dayOfWeek);
    expect(cal.getDate()).toBe(19);
    expect(displayDayIndex(cal, 'sunday')).toBe(3);
    expect(displayDayIndex(cal, 'thursday')).toBe(6);
    expect(calendarDateOf(stored.weekStart, stored.dayOfWeek).getDate()).toBe(19);
  });

  it('loads one or two Monday storage weeks for a display week', () => {
    expect(storageWeeksForDisplayWeek('2026-08-17', 'monday')).toEqual(['2026-08-17']);
    expect(storageWeeksForDisplayWeek('2026-08-16', 'sunday')).toEqual(['2026-08-10', '2026-08-17']);
  });

  it('writes Monday-canonical coords for a Sunday calendar date', () => {
    const sun = new Date('2026-08-16T00:00:00');
    expect(storageCoords(sun)).toEqual({ weekStart: '2026-08-10', dayOfWeek: 6 });
  });
});
