export const WEEK_SHIFT_MS = 520;
export const WEEK_SHIFT_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';

export type WeekShiftDirection = 'next' | 'prev';

/** Incoming week sits just below (next) or above (prev) the visible clip. */
export function incomingWeekOffset(direction: WeekShiftDirection): string {
  return direction === 'next' ? '100%' : '-100%';
}

/**
 * Both the recipe list and the week-chip strip use this transform so they
 * start and finish together. Percentages are of each element's own height.
 */
export function weekShiftTranslateY(direction: WeekShiftDirection, edge: 'start' | 'end'): string {
  if (edge === 'start') return 'translateY(0%)';
  return direction === 'next' ? 'translateY(-100%)' : 'translateY(100%)';
}

export function weekShiftKeyframes(direction: WeekShiftDirection): Array<{ transform: string }> {
  return [
    { transform: weekShiftTranslateY(direction, 'start') },
    { transform: weekShiftTranslateY(direction, 'end') },
  ];
}

export function weekShiftAnimationOptions(): KeyframeAnimationOptions {
  return {
    duration: WEEK_SHIFT_MS,
    easing: WEEK_SHIFT_EASING,
    fill: 'forwards',
  };
}

export function playSyncedTranslateY(elements: HTMLElement[], direction: WeekShiftDirection): Animation[] {
  const keyframes = weekShiftKeyframes(direction);
  const options = weekShiftAnimationOptions();
  return elements.map(el => el.animate(keyframes, options));
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
