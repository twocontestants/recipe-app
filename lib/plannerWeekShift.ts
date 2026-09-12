export const WEEK_SHIFT_MS = 460;
export const WEEK_SHIFT_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';

export type WeekShiftDirection = 'next' | 'prev';
export type WeekShiftPhase = 'start' | 'end';

/** Incoming week sits just below (next) or above (prev) the visible clip. */
export function incomingWeekOffset(direction: WeekShiftDirection): string {
  return direction === 'next' ? '100%' : '-100%';
}

/**
 * Both the recipe list and the week-chip strip use this transform so they
 * start and finish together. Percentages are of each element's own height.
 */
export function weekShiftTranslateY(
  direction: WeekShiftDirection,
  phase: WeekShiftPhase,
): string {
  if (phase === 'start') return 'translateY(0%)';
  return direction === 'next' ? 'translateY(-100%)' : 'translateY(100%)';
}

export function weekShiftMotionStyle(
  direction: WeekShiftDirection,
  phase: WeekShiftPhase,
): { transform: string; transition: string } {
  return {
    transform: weekShiftTranslateY(direction, phase),
    transition: phase === 'end'
      ? `transform ${WEEK_SHIFT_MS}ms ${WEEK_SHIFT_EASING}`
      : 'none',
  };
}

export function incomingWeekStyle(
  direction: WeekShiftDirection,
  phase: WeekShiftPhase,
): { top: string; transform: string; transition: string } {
  return {
    top: incomingWeekOffset(direction),
    ...weekShiftMotionStyle(direction, phase),
  };
}

/** Parse a CSS `transition-duration` value (first item if a list) into ms. */
export function weekShiftDurationMs(style: { transitionDuration: string }): number {
  const raw = style.transitionDuration.split(',')[0]?.trim() ?? '';
  if (!raw) return 0;
  if (raw.endsWith('ms')) return parseFloat(raw) || 0;
  if (raw.endsWith('s')) return (parseFloat(raw) || 0) * 1000;
  return parseFloat(raw) || 0;
}

export function prefersReducedWeekShift(
  matchMedia?: (query: string) => { matches: boolean } | null,
): boolean {
  return Boolean(matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
}

/** Skip CSS week slides in jsdom and when the user asks for reduced motion. */
export function shouldAnimateWeekShift(win: {
  matchMedia?: (query: string) => { matches: boolean } | null;
  navigator?: { userAgent?: string };
} = typeof window === 'undefined' ? {} : window): boolean {
  if (prefersReducedWeekShift(win.matchMedia?.bind(win))) return false;
  if (/jsdom/i.test(win.navigator?.userAgent ?? '')) return false;
  return true;
}
