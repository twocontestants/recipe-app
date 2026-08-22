import { describe, expect, it } from 'vitest';
import { shiftWeek } from './plannerDays';
import {
  displayWeekOf,
  isRailOrigin,
  sheetAnchorForRailPick,
  weekPlanFromMeals,
} from './plannerDaySheet';

describe('sheetAnchorForRailPick', () => {
  it('opens the previous display week on the last day for Earlier', () => {
    const origin = '2026-08-19';
    expect(sheetAnchorForRailPick('earlier', origin, 'monday')).toEqual({
      weekStart: shiftWeek(displayWeekOf(origin, 'monday'), -1),
      selectedDay: 6,
    });
  });

  it('opens the next display week on the first day for Later', () => {
    const origin = '2026-08-19';
    expect(sheetAnchorForRailPick('later', origin, 'monday')).toEqual({
      weekStart: shiftWeek(displayWeekOf(origin, 'monday'), 1),
      selectedDay: 0,
    });
  });

  it('uses adjacent Sunday-start display weeks when the household week starts Sunday', () => {
    const origin = '2026-08-19';
    expect(sheetAnchorForRailPick('earlier', origin, 'sunday')).toEqual({
      weekStart: shiftWeek(displayWeekOf(origin, 'sunday'), -1),
      selectedDay: 6,
    });
    expect(sheetAnchorForRailPick('later', origin, 'sunday').selectedDay).toBe(0);
  });
});

describe('weekPlanFromMeals', () => {
  const week = displayWeekOf('2026-08-19', 'monday');

  it('groups a Monday-canonical dinner under the display-day index', () => {
    const map = weekPlanFromMeals(
      [{
        week_start: '2026-08-17',
        day_of_week: 2,
        meal_type: 'dinner',
        recipe: { title: 'Pie' },
      }],
      week,
      'monday',
    );
    expect(map[2]).toEqual([{ title: 'Pie', meal_type: 'dinner' }]);
  });

  it('omits dinners that fall in another display week', () => {
    const map = weekPlanFromMeals(
      [{
        week_start: '2026-08-10',
        day_of_week: 2,
        meal_type: 'dinner',
        recipe: { title: 'Old pie' },
      }],
      week,
      'monday',
    );
    expect(map[2]).toBeUndefined();
  });

  it('does not use weekday-name keys', () => {
    const map = weekPlanFromMeals(
      [{
        week_start: '2026-08-17',
        day_of_week: 4,
        recipe: { title: 'Fish pie' },
      }],
      week,
      'monday',
    );
    expect(map[4]?.[0]?.title).toBe('Fish pie');
    expect(Object.keys(map)).toEqual(['4']);
  });
});

describe('isRailOrigin', () => {
  it('is true only for the dragged-from date', () => {
    expect(isRailOrigin('2026-08-19', '2026-08-19')).toBe(true);
    expect(isRailOrigin('2026-08-20', '2026-08-19')).toBe(false);
  });
});
