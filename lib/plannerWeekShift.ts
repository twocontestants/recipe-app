export const WEEK_SHIFT_MS = 640;
export const WEEK_SHIFT_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';

export type WeekShiftDirection = 'next' | 'prev';
export type WeekShiftAxis = 'x' | 'y';

/** One-week slide, or null for same week / a multi-week jump. */
export function weekSlideDirection(weekOffset: number): WeekShiftDirection | null {
  if (weekOffset === 1) return 'next';
  if (weekOffset === -1) return 'prev';
  return null;
}

export function incomingWeekAnchor(
  direction: WeekShiftDirection,
  axis: WeekShiftAxis,
): { top: string; left?: string } {
  const start = direction === 'next' ? '100%' : '-100%';
  if (axis === 'y') return { top: start };
  return { top: '0', left: start };
}

export function weekShiftDelta(direction: WeekShiftDirection, distancePx: number): number {
  return (direction === 'next' ? -1 : 1) * distancePx;
}

export function weekShiftKeyframes(
  axis: WeekShiftAxis,
  direction: WeekShiftDirection,
  distancePx: number,
): Array<{ transform: string }> {
  const delta = weekShiftDelta(direction, distancePx);
  const from = axis === 'y' ? 'translateY(0px)' : 'translateX(0px)';
  const to = axis === 'y' ? `translateY(${delta}px)` : `translateX(${delta}px)`;
  return [{ transform: from }, { transform: to }];
}

export function weekShiftAnimationOptions(): KeyframeAnimationOptions {
  return {
    duration: WEEK_SHIFT_MS,
    easing: WEEK_SHIFT_EASING,
    fill: 'forwards',
  };
}

export function playSyncedShift(
  groups: Array<{ elements: HTMLElement[]; axis: WeekShiftAxis; distance: number }>,
  direction: WeekShiftDirection,
): Animation[] {
  const options = weekShiftAnimationOptions();
  return groups.flatMap(group => {
    const keyframes = weekShiftKeyframes(group.axis, direction, group.distance);
    return group.elements.map(el => el.animate(keyframes, options));
  });
}

export function prefersReducedWeekShift(
  matchMedia?: (query: string) => { matches: boolean } | null,
): boolean {
  return Boolean(matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
}

/** Skip week slides in jsdom and when the user asks for reduced motion. */
export function shouldAnimateWeekShift(win: {
  matchMedia?: (query: string) => { matches: boolean } | null;
  navigator?: { userAgent?: string };
} = typeof window === 'undefined' ? {} : window): boolean {
  if (prefersReducedWeekShift(win.matchMedia?.bind(win))) return false;
  if (/jsdom/i.test(win.navigator?.userAgent ?? '')) return false;
  return true;
}
