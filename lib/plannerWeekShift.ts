export const WEEK_SHIFT_MS = 640;
export const WEEK_CROSSFADE_MS = 320;
export const WEEK_SHIFT_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';

export type WeekShiftDirection = 'next' | 'prev';
export type WeekShiftAxis = 'x' | 'y';
export type WeekShiftMotion = 'slide' | 'crossfade';

export function weekJumpMotion(
  weekOffset: number,
): { direction: WeekShiftDirection; motion: WeekShiftMotion } | null {
  if (!Number.isFinite(weekOffset) || weekOffset === 0) return null;
  const direction: WeekShiftDirection = weekOffset > 0 ? 'next' : 'prev';
  if (Math.abs(weekOffset) === 1) return { direction, motion: 'slide' };
  return { direction, motion: 'crossfade' };
}

/** One-week slide, or null for same week / a multi-week jump. */
export function weekSlideDirection(weekOffset: number): WeekShiftDirection | null {
  const jump = weekJumpMotion(weekOffset);
  return jump?.motion === 'slide' ? jump.direction : null;
}

export function incomingWeekAnchor(
  direction: WeekShiftDirection,
  axis: WeekShiftAxis,
): { top: string; left?: string } {
  const start = direction === 'next' ? '100%' : '-100%';
  if (axis === 'y') return { top: start };
  return { top: '0', left: start };
}

export function incomingWeekFadeAnchor(): { top: string; left: string; opacity: number } {
  return { top: '0', left: '0', opacity: 0 };
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

export function weekCrossfadeKeyframes(outgoing: boolean): Array<{ opacity: number }> {
  return outgoing ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 0 }, { opacity: 1 }];
}

export function weekCrossfadeAnimationOptions(): KeyframeAnimationOptions {
  return {
    duration: WEEK_CROSSFADE_MS,
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

export function playSyncedCrossfade(outgoing: HTMLElement[], incoming: HTMLElement[]): Animation[] {
  const options = weekCrossfadeAnimationOptions();
  return [
    ...outgoing.map(el => el.animate(weekCrossfadeKeyframes(true), options)),
    ...incoming.map(el => el.animate(weekCrossfadeKeyframes(false), options)),
  ];
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
