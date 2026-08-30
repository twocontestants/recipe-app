import { localDateIso, parseLocalIso, storageCoords } from './plannerDays';
import { mealOnDate } from './plannerDate';

export const HOLD_MS = 400;
export const MOVE_CANCEL_PX = 8;
export const EDGE_SCROLL_BAND_PX = 72;
export const EDGE_SCROLL_MAX_PX = 24;
export const RAIL_MIN_DAYS = 5;
export const RAIL_MAX_DAYS = 11;
export const RAIL_DAYS = RAIL_MIN_DAYS;
export const RAIL_DAYS_BEFORE = 2;
export const RAIL_PICK_HEIGHT = 52;
export const RAIL_DAY_SLOT = 88;
export const RAIL_CHROME = 16;
/** Matches the mobile tab-bar breakpoint in app/globals.css. */
export const BOTTOM_NAV_MAX_WIDTH = 600;

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
  planned_on?: string | Date | null;
  week_start?: string | Date;
  day_of_week?: number;
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

/** On the dedicated handle, movement past the threshold starts a drag (desktop click-drag). */
export function shouldArmFromMovement(
  armed: boolean,
  dx: number,
  dy: number,
  threshold = MOVE_CANCEL_PX,
): boolean {
  return !armed && movementExceededThreshold(dx, dy, threshold);
}

/** Pixels to scroll this frame when the pointer sits in a viewport edge band. */
export function edgeScrollDelta(
  clientY: number,
  viewportHeight: number,
  reservedBottom = 0,
  bandPx = EDGE_SCROLL_BAND_PX,
  maxPx = EDGE_SCROLL_MAX_PX,
): number {
  if (viewportHeight <= 0 || bandPx <= 0 || maxPx <= 0) return 0;
  const topLimit = bandPx;
  const bottomLimit = viewportHeight - Math.max(0, reservedBottom) - bandPx;
  if (clientY < topLimit) {
    const t = Math.min(1, (topLimit - clientY) / bandPx);
    return -Math.max(1, Math.round(t * maxPx));
  }
  if (clientY > bottomLimit) {
    const t = Math.min(1, (clientY - bottomLimit) / bandPx);
    return Math.max(1, Math.round(t * maxPx));
  }
  return 0;
}

export function addCalendarDays(iso: string, days: number): string {
  const d = parseLocalIso(iso);
  d.setDate(d.getDate() + days);
  return localDateIso(d);
}

/** How much of the viewport the bottom tab bar covers. Zero on desktop. */
export function bottomNavReserve(viewportWidth: number, navHeight: number): number {
  if (viewportWidth > BOTTOM_NAV_MAX_WIDTH) return 0;
  return Math.max(0, navHeight);
}

export function railDayCount(viewportHeight: number, reservedBottom = 0): number {
  const avail = viewportHeight - Math.max(0, reservedBottom) - RAIL_CHROME - 2 * RAIL_PICK_HEIGHT;
  const raw = Math.floor(avail / RAIL_DAY_SLOT);
  const odd = raw % 2 === 0 ? raw - 1 : raw;
  return Math.min(RAIL_MAX_DAYS, Math.max(RAIL_MIN_DAYS, odd));
}

export function surroundingRailDays(originIso: string, count = RAIL_MIN_DAYS): string[] {
  const n = Math.max(1, count);
  const before = Math.floor((n - 1) / 2);
  return Array.from({ length: n }, (_, i) => addCalendarDays(originIso, i - before));
}

/** Default rail window: origin ± 2. */
export function surroundingTenDays(originIso: string): string[] {
  return surroundingRailDays(originIso, RAIL_MIN_DAYS);
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

export function sameDragTarget(a: DragTarget, b: DragTarget): boolean {
  if (a === b) return true;
  if (!a || !b || a.type !== b.type) return false;
  if (a.type === 'week-day' && b.type === 'week-day') return a.index === b.index && a.iso === b.iso;
  if (a.type === 'rail-day' && b.type === 'rail-day') return a.iso === b.iso;
  if (a.type === 'rail-pick' && b.type === 'rail-pick') return a.direction === b.direction;
  return false;
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
  return mealOnDate(meal, iso);
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
