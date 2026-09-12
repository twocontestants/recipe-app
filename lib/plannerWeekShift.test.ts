import { describe, expect, it } from 'vitest';
import {
  WEEK_SHIFT_EASING,
  WEEK_SHIFT_MS,
  incomingWeekOffset,
  incomingWeekStyle,
  prefersReducedWeekShift,
  shouldAnimateWeekShift,
  weekShiftDurationMs,
  weekShiftMotionStyle,
  weekShiftTranslateY,
} from './plannerWeekShift';

describe('week shift motion', () => {
  it('parks the incoming week below for next and above for previous', () => {
    expect(incomingWeekOffset('next')).toBe('100%');
    expect(incomingWeekOffset('prev')).toBe('-100%');
  });

  it('scrolls next week up from below and previous week down from above', () => {
    expect(weekShiftTranslateY('next', 'start')).toBe('translateY(0%)');
    expect(weekShiftTranslateY('next', 'end')).toBe('translateY(-100%)');
    expect(weekShiftTranslateY('prev', 'start')).toBe('translateY(0%)');
    expect(weekShiftTranslateY('prev', 'end')).toBe('translateY(100%)');
  });

  it('uses the same transform and timing for the recipe list and the week strip', () => {
    const nextEnd = weekShiftMotionStyle('next', 'end');
    const incoming = incomingWeekStyle('next', 'end');
    expect(incoming.transform).toBe(nextEnd.transform);
    expect(incoming.transition).toBe(nextEnd.transition);
    expect(incoming.transition).toBe(`transform ${WEEK_SHIFT_MS}ms ${WEEK_SHIFT_EASING}`);
    expect(incoming.top).toBe('100%');
  });

  it('does not animate the start frame so the incoming week can be positioned first', () => {
    expect(weekShiftMotionStyle('prev', 'start').transition).toBe('none');
    expect(incomingWeekStyle('prev', 'start')).toEqual({
      top: '-100%',
      transform: 'translateY(0%)',
      transition: 'none',
    });
  });
});

describe('weekShiftDurationMs', () => {
  it('reads seconds and milliseconds from computed transition-duration', () => {
    expect(weekShiftDurationMs({ transitionDuration: '0.46s' })).toBe(460);
    expect(weekShiftDurationMs({ transitionDuration: '460ms' })).toBe(460);
    expect(weekShiftDurationMs({ transitionDuration: '0s' })).toBe(0);
    expect(weekShiftDurationMs({ transitionDuration: '' })).toBe(0);
  });
});

describe('shouldAnimateWeekShift', () => {
  it('skips motion for reduced-motion and jsdom', () => {
    expect(shouldAnimateWeekShift({
      matchMedia: () => ({ matches: true }),
      navigator: { userAgent: 'Mozilla/5.0' },
    })).toBe(false);
    expect(shouldAnimateWeekShift({
      matchMedia: () => ({ matches: false }),
      navigator: { userAgent: 'Mozilla/5.0 (darwin) jsdom/29' },
    })).toBe(false);
    expect(shouldAnimateWeekShift({
      matchMedia: () => ({ matches: false }),
      navigator: { userAgent: 'Mozilla/5.0' },
    })).toBe(true);
  });
});
