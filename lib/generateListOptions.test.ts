import { describe, expect, it } from 'vitest';
import {
  defaultSelectedMealKeys,
  generateListDateRange,
  generateListWeekTag,
  generateListWeeks,
  mealDayLabel,
  mealEntryKey,
  shouldDefaultSelectMeal,
  visibleGenerateListWeeks,
} from './generateListOptions';

const now = new Date(2026, 8, 12); // Saturday 12 Sep 2026
const thisWeek = '2026-09-07'; // Monday-start week containing Saturday
const lastWeek = '2026-08-31';
const nextWeek = '2026-09-14';

describe('generateListWeeks', () => {
  it('lists last, this, and next week for Monday start', () => {
    expect(generateListWeeks('monday', undefined, now)).toEqual([lastWeek, thisWeek, nextWeek]);
  });

  it('uses the household start day so Sunday weeks match the planner', () => {
    expect(generateListWeeks('sunday', undefined, now)).toEqual([
      '2026-08-30',
      '2026-09-06',
      '2026-09-13',
    ]);
  });

  it('includes a planner week that sits outside last/this/next', () => {
    expect(generateListWeeks('monday', '2026-09-28', now)).toEqual([
      lastWeek,
      thisWeek,
      nextWeek,
      '2026-09-28',
    ]);
  });
});

describe('generateListDateRange', () => {
  it('spans the first week start through the last day’s date', () => {
    expect(generateListDateRange([lastWeek, thisWeek, nextWeek])).toEqual({
      from: lastWeek,
      to: '2026-09-20',
    });
  });
});

describe('visibleGenerateListWeeks', () => {
  it('always shows this week, even when empty', () => {
    expect(visibleGenerateListWeeks(
      [lastWeek, thisWeek, nextWeek],
      { [lastWeek]: [], [thisWeek]: [], [nextWeek]: [] },
      thisWeek,
    )).toEqual([thisWeek]);
  });

  it('hides empty last and next weeks', () => {
    expect(visibleGenerateListWeeks(
      [lastWeek, thisWeek, nextWeek],
      { [lastWeek]: [], [thisWeek]: [{ length: 1 }], [nextWeek]: [] },
      thisWeek,
    )).toEqual([thisWeek]);
  });

  it('keeps last or next when they have dinners', () => {
    expect(visibleGenerateListWeeks(
      [lastWeek, thisWeek, nextWeek],
      { [lastWeek]: [{}, {}], [thisWeek]: [], [nextWeek]: [{}] },
      thisWeek,
    )).toEqual([lastWeek, thisWeek, nextWeek]);
  });

  it('always shows the planner week the cook opened from', () => {
    expect(visibleGenerateListWeeks(
      [lastWeek, thisWeek, nextWeek],
      { [lastWeek]: [], [thisWeek]: [], [nextWeek]: [] },
      thisWeek,
      nextWeek,
    )).toEqual([thisWeek, nextWeek]);
  });
});

describe('shouldDefaultSelectMeal', () => {
  it('ticks remaining dinners of this week, including today', () => {
    expect(shouldDefaultSelectMeal(thisWeek, '2026-09-11', thisWeek, thisWeek, '2026-09-12')).toBe(false);
    expect(shouldDefaultSelectMeal(thisWeek, '2026-09-12', thisWeek, thisWeek, '2026-09-12')).toBe(true);
    expect(shouldDefaultSelectMeal(thisWeek, '2026-09-13', thisWeek, thisWeek, '2026-09-12')).toBe(true);
  });

  it('ticks every dinner when the planner week is not this week', () => {
    expect(shouldDefaultSelectMeal(nextWeek, '2026-09-14', nextWeek, thisWeek, '2026-09-12')).toBe(true);
    expect(shouldDefaultSelectMeal(lastWeek, '2026-09-02', lastWeek, thisWeek, '2026-09-12')).toBe(true);
  });

  it('does not tick dinners in unfocused weeks', () => {
    expect(shouldDefaultSelectMeal(lastWeek, '2026-09-02', thisWeek, thisWeek, '2026-09-12')).toBe(false);
    expect(shouldDefaultSelectMeal(nextWeek, '2026-09-16', thisWeek, thisWeek, '2026-09-12')).toBe(false);
  });
});

describe('defaultSelectedMealKeys', () => {
  it('returns remaining this-week keys', () => {
    expect(defaultSelectedMealKeys(
      {
        [thisWeek]: [
          { key: 'past', planned_on: '2026-09-09' },
          { key: 'today', planned_on: '2026-09-12' },
        ],
        [lastWeek]: [{ key: 'last', planned_on: '2026-09-02' }],
      },
      thisWeek,
      thisWeek,
      '2026-09-12',
    )).toEqual(['today']);
  });
});

describe('mealEntryKey', () => {
  it('prefers the meal plan id so two same-day recipes stay distinct', () => {
    const a = { id: 'mp-a', planned_on: '2026-09-12', recipe_id: 'r-pie' };
    const b = { id: 'mp-b', planned_on: '2026-09-12', recipe_id: 'r-pie' };
    expect(mealEntryKey(a, 0)).toBe('mp-a');
    expect(mealEntryKey(b, 1)).toBe('mp-b');
  });

  it('falls back to date, recipe, and index when there is no id', () => {
    expect(mealEntryKey({ planned_on: '2026-09-12', recipe_id: 'r-pie' }, 2))
      .toBe('2026-09-12::r-pie::2');
  });
});

describe('labels', () => {
  it('shows weekday and calendar date', () => {
    expect(mealDayLabel('2026-09-12')).toMatch(/sat/i);
    expect(mealDayLabel('2026-09-12')).toMatch(/12/);
    expect(mealDayLabel('2026-09-12')).toMatch(/sep/i);
  });

  it('tags last / this / next week', () => {
    expect(generateListWeekTag(thisWeek, 'monday', lastWeek, now)).toBe('this week');
    expect(generateListWeekTag(nextWeek, 'monday', lastWeek, now)).toBe('next week');
    expect(generateListWeekTag(lastWeek, 'monday', lastWeek, now)).toBe('last week');
  });
});
