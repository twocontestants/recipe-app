import { dayDateOf, localDateIso, parseLocalIso, startOfDisplayWeek, storageCoords, type DayKey } from './plannerDays';

const MONTH_KEY = /^(\d{4})-(\d{2})$/;
const DAY_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function monthKeyOf(iso: string): string {
  return iso.slice(0, 7);
}

export function monthRange(key: string): { from: string; to: string } {
  const match = MONTH_KEY.exec(key);
  if (!match) throw new Error(`invalid month key ${key}`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  return {
    from: localDateIso(new Date(year, month - 1, 1)),
    to: localDateIso(new Date(year, month, 0)),
  };
}

export function monthsForDisplayWeek(weekStartIso: string): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < 7; i++) {
    const key = monthKeyOf(localDateIso(dayDateOf(weekStartIso, i)));
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
  }
  return keys;
}

export function storageWeeksForDateRange(from: string, to: string): string[] {
  const seen = new Set<string>();
  const weeks: string[] = [];
  const cursor = parseLocalIso(from);
  const end = parseLocalIso(to);
  while (cursor.getTime() <= end.getTime()) {
    const { weekStart } = storageCoords(new Date(cursor.getTime()));
    if (!seen.has(weekStart)) {
      seen.add(weekStart);
      weeks.push(weekStart);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return weeks;
}

export function missingMonths(needed: string[], loaded: Iterable<string>): string[] {
  const have = loaded instanceof Set ? loaded : new Set(loaded);
  return needed.filter(key => !have.has(key));
}

export function shiftMonthKey(key: string, months: number): string {
  const { from } = monthRange(key);
  const start = parseLocalIso(from);
  return monthKeyOf(localDateIso(new Date(start.getFullYear(), start.getMonth() + months, 1)));
}

export function monthTitle(key: string): string {
  const { from } = monthRange(key);
  return parseLocalIso(from).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
}

/** Display-week-aligned cells for a month grid, including leading/trailing days. */
export function monthCalendarCells(
  monthKey: string,
  weekStartsOn: DayKey = 'monday',
): Array<{ iso: string; inMonth: boolean }> {
  const { from, to } = monthRange(monthKey);
  const gridStart = startOfDisplayWeek(parseLocalIso(from), weekStartsOn);
  const lastWeekStart = startOfDisplayWeek(parseLocalIso(to), weekStartsOn);
  const endIso = localDateIso(dayDateOf(localDateIso(lastWeekStart), 6));
  const cells: Array<{ iso: string; inMonth: boolean }> = [];
  const cursor = new Date(gridStart.getTime());
  while (true) {
    const iso = localDateIso(cursor);
    cells.push({ iso, inMonth: iso >= from && iso <= to });
    if (iso === endIso) break;
    cursor.setDate(cursor.getDate() + 1);
    if (cells.length > 42) break;
  }
  return cells;
}

export function adjacentMonthKeys(key: string): string[] {
  const { from } = monthRange(key);
  const start = parseLocalIso(from);
  const prev = monthKeyOf(localDateIso(new Date(start.getFullYear(), start.getMonth() - 1, 1)));
  const next = monthKeyOf(localDateIso(new Date(start.getFullYear(), start.getMonth() + 1, 1)));
  return [prev, next];
}

export function inclusiveDayCount(from: string, to: string): number {
  const start = parseLocalIso(from);
  const end = parseLocalIso(to);
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

export function isDayIso(value: string): boolean {
  return DAY_ISO.test(value);
}

/** Shift a YYYY-MM-DD calendar date without going through UTC. */
export function addCalendarDays(iso: string, days: number): string {
  const date = parseLocalIso(iso);
  date.setDate(date.getDate() + days);
  return localDateIso(date);
}

/**
 * Inclusive SQL window for meal_plans.week_start.
 * Existing AU rows are stored as the UTC date of local Monday midnight
 * (often the previous Sunday). Do not key that window with server-local
 * mondayOf() — Vercel/Render UTC Mondays miss those Sunday keys.
 */
export function plannerQueryWindow(from: string, to: string): { from: string; to: string } {
  return {
    from: addCalendarDays(from, -14),
    to: addCalendarDays(to, 7),
  };
}

export function parseWeekStartList(value: string | null | undefined): string[] {
  if (!value) return [];
  const seen = new Set<string>();
  const weeks: string[] = [];
  for (const part of value.split(',')) {
    const week = part.trim();
    if (!isDayIso(week) || seen.has(week)) continue;
    seen.add(week);
    weeks.push(week);
  }
  return weeks;
}

export const PLANNER_RANGE_MAX_DAYS = 62;
