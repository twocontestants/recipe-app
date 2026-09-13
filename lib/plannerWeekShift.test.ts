import { describe, expect, it, vi } from 'vitest';
import {
  WEEK_SHIFT_EASING,
  WEEK_SHIFT_MS,
  incomingWeekOffset,
  playSyncedTranslateY,
  prefersReducedWeekShift,
  shouldAnimateWeekShift,
  weekShiftAnimationOptions,
  weekShiftKeyframes,
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

  it('plays the same keyframes and timing on every track', () => {
    const calls: Array<{ keyframes: unknown; options: unknown }> = [];
    const el = {
      animate: vi.fn((keyframes: unknown, options: unknown) => {
        calls.push({ keyframes, options });
        return { finished: Promise.resolve() };
      }),
    };
    playSyncedTranslateY([el, el] as unknown as HTMLElement[], 'next');
    expect(calls).toHaveLength(2);
    expect(calls[0]).toEqual(calls[1]);
    expect(calls[0].keyframes).toEqual(weekShiftKeyframes('next'));
    expect(calls[0].options).toEqual(weekShiftAnimationOptions());
    expect(weekShiftAnimationOptions()).toEqual({
      duration: WEEK_SHIFT_MS,
      easing: WEEK_SHIFT_EASING,
      fill: 'forwards',
    });
  });
});

describe('prefersReducedWeekShift', () => {
  it('skips motion when the user asks for reduced motion', () => {
    expect(prefersReducedWeekShift(() => ({ matches: true }))).toBe(true);
    expect(prefersReducedWeekShift(() => ({ matches: false }))).toBe(false);
    expect(prefersReducedWeekShift()).toBe(false);
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
