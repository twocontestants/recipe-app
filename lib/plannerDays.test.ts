import { describe, expect, it } from 'vitest';
import {
  buildPlannerPostBody,
  dayDateOf,
  formatWeekLabel,
  indexToDayKey,
  parseDayOfWeek,
  shiftWeek,
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
