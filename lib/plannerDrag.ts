import { isoDate, localDateIso, parseLocalIso, storageCoords } from './plannerDays';

export const HOLD_MS = 400;
export const MOVE_CANCEL_PX = 8;
export const RAIL_DAYS = 8;
export const RAIL_DAYS_BEFORE = 2;

export interface HitRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface WeekHit extends HitRect {
  index: number;
  iso: string;
}

export interface RailHit extends HitRect {
  iso?: string;
  pick?: 'earlier' | 'later';
}

export type DragTarget =
  | { type: 'week-day'; index: number; iso: string }
  | { type: 'rail-day'; iso: string }
  | { type: 'rail-pick'; direction: 'earlier' | 'later' }
  | null;

export interface OccupancyMeal {
  week_start: string | Date;
  day_of_week: number;
  meal_type?: string;
  recipe?: { title?: string | null } | null;
}

export function holdArmed(elapsedMs: number, holdMs = HOLD_MS): boolean {
  return elapsedMs >= holdMs;
}

export function movementExceededThreshold(
  dx: number,
  dy: number,
  threshold = MOVE_CANCEL_PX,
): boolean {
  return Math.hypot(dx, dy) >= threshold;
}

export function addCalendarDays(iso: string, days: number): string {
  const d = parseLocalIso(iso);
  d.setDate(d.getDate() + days);
  return localDateIso(d);
}

export function surroundingTenDays(originIso: string): string[] {
  return Array.from({ length: RAIL_DAYS }, (_, i) =>
    addCalendarDays(originIso, i - RAIL_DAYS_BEFORE),
  );
}

export function storageWeeksForIsos(isos: string[]): string[] {
  const seen = new Set<string>();
  const weeks: string[] = [];
  for (const iso of isos) {
    const { weekStart } = storageCoords(parseLocalIso(iso));
    if (!seen.has(weekStart)) {
      seen.add(weekStart);
      weeks.push(weekStart);
    }
  }
  return weeks;
}

export function pointInRect(x: number, y: number, rect: HitRect): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

export function resolveDragTarget(
  x: number,
  y: number,
  weekHits: WeekHit[],
  railHits: RailHit[],
): DragTarget {
  const railLeft = railHits.reduce((min, hit) => Math.min(min, hit.left), Infinity);
  const weeks = Number.isFinite(railLeft)
    ? weekHits.map(hit => ({ ...hit, right: Math.min(hit.right, railLeft) }))
    : weekHits;
  const week = weeks.find(hit => pointInRect(x, y, hit));
  if (week) return { type: 'week-day', index: week.index, iso: week.iso };
  const rail = railHits.find(hit => pointInRect(x, y, hit));
  if (rail?.pick) return { type: 'rail-pick', direction: rail.pick };
  if (rail?.iso) return { type: 'rail-day', iso: rail.iso };
  return null;
}

export function mealOnIso(meal: OccupancyMeal, iso: string): boolean {
  if (meal.meal_type && meal.meal_type !== 'dinner') return false;
  const coords = storageCoords(parseLocalIso(iso));
  return isoDate(meal.week_start) === coords.weekStart && meal.day_of_week === coords.dayOfWeek;
}

export function dayOccupied(meals: OccupancyMeal[], iso: string): boolean {
  return meals.some(meal => mealOnIso(meal, iso));
}

export function titlesOnDay(meals: OccupancyMeal[], iso: string): string[] {
  return meals
    .filter(meal => mealOnIso(meal, iso))
    .map(meal => meal.recipe?.title?.trim() ?? '')
    .filter(Boolean);
}

export function shouldAllowDrag(mealId: string): boolean {
  return Boolean(mealId) && !mealId.startsWith('tmp-');
}
