import { describe, expect, it } from 'vitest';
import {
  adjacentMonthKeys,
  inclusiveDayCount,
  missingMonths,
  monthCalendarCells,
  monthKeyOf,
  monthRange,
  monthTitle,
  monthsForDisplayWeek,
  parseWeekStartList,
  plannerQueryWindow,
  shiftMonthKey,
  storageWeeksForDateRange,
} from './plannerMonth';

describe('monthKeyOf / monthRange', () => {
  it('uses the local calendar month', () => {
    expect(monthKeyOf('2026-08-19')).toBe('2026-08');
    expect(monthRange('2026-08')).toEqual({ from: '2026-08-01', to: '2026-08-31' });
    expect(monthRange('2026-02')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
  });
});

describe('monthsForDisplayWeek', () => {
  it('is one month when the week stays inside August', () => {
    expect(monthsForDisplayWeek('2026-08-17')).toEqual(['2026-08']);
  });

  it('returns both months when the week crosses September', () => {
    expect(monthsForDisplayWeek('2026-08-31')).toEqual(['2026-08', '2026-09']);
  });
});

describe('storageWeeksForDateRange', () => {
  it('includes every Monday-canonical week that overlaps the month', () => {
    const weeks = storageWeeksForDateRange('2026-08-01', '2026-08-31');
    expect(weeks[0]).toBeTruthy();
    expect(weeks).toContain('2026-08-17');
    expect(new Set(weeks).size).toBe(weeks.length);
  });
});

describe('missingMonths / adjacentMonthKeys', () => {
  it('lists months not yet loaded and names neighbours', () => {
    expect(missingMonths(['2026-08', '2026-09'], new Set(['2026-08']))).toEqual(['2026-09']);
    expect(adjacentMonthKeys('2026-08')).toEqual(['2026-07', '2026-09']);
  });
});

describe('inclusiveDayCount', () => {
  it('counts both ends', () => {
    expect(inclusiveDayCount('2026-08-01', '2026-08-31')).toBe(31);
  });
});

describe('plannerQueryWindow', () => {
  it('pads the month so Sunday-stored AU weeks still match', () => {
    expect(plannerQueryWindow('2026-08-01', '2026-08-31')).toEqual({
      from: '2026-07-18',
      to: '2026-09-07',
    });
    const window = plannerQueryWindow('2026-08-01', '2026-08-31');
    expect('2026-08-16' >= window.from && '2026-08-16' <= window.to).toBe(true);
    expect('2026-08-17' >= window.from && '2026-08-17' <= window.to).toBe(true);
  });
});

describe('shiftMonthKey / monthTitle', () => {
  it('moves by calendar months and names them in en-AU', () => {
    expect(shiftMonthKey('2026-08', 1)).toBe('2026-09');
    expect(shiftMonthKey('2026-01', -1)).toBe('2025-12');
    expect(monthTitle('2026-09')).toBe('September 2026');
  });
});

describe('monthCalendarCells', () => {
  it('aligns August 2026 to a Monday-start grid including outside days', () => {
    const cells = monthCalendarCells('2026-08', 'monday');
    expect(cells[0]).toEqual({ iso: '2026-07-27', inMonth: false });
    expect(cells.find(c => c.iso === '2026-08-01')).toEqual({ iso: '2026-08-01', inMonth: true });
    expect(cells.at(-1)).toEqual({ iso: '2026-09-06', inMonth: false });
    expect(cells.length).toBe(42);
  });
});

describe('parseWeekStartList', () => {
  it('keeps valid unique YYYY-MM-DD keys', () => {
    expect(parseWeekStartList('2026-08-16,2026-08-17,2026-08-16,nope')).toEqual([
      '2026-08-16',
      '2026-08-17',
    ]);
    expect(parseWeekStartList(null)).toEqual([]);
  });
});
