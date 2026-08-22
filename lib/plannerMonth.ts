import { dayDateOf, localDateIso, parseLocalIso, storageCoords } from './plannerDays';

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

export const PLANNER_RANGE_MAX_DAYS = 62;
