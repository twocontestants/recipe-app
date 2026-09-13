import { describe, expect, it, vi } from 'vitest';
import {
  WEEK_CROSSFADE_MS,
  WEEK_SHIFT_EASING,
  WEEK_SHIFT_MS,
  incomingWeekAnchor,
  incomingWeekFadeAnchor,
  playSyncedCrossfade,
  playSyncedShift,
  prefersReducedWeekShift,
  shouldAnimateWeekShift,
  weekCrossfadeAnimationOptions,
  weekCrossfadeKeyframes,
  weekJumpMotion,
  weekShiftAnimationOptions,
  weekShiftDelta,
  weekShiftKeyframes,
  weekSlideDirection,
} from './plannerWeekShift';

describe('week shift motion', () => {
  it('parks the incoming recipes below/above and the chips to the side', () => {
    expect(incomingWeekAnchor('next', 'y')).toEqual({ top: '100%' });
    expect(incomingWeekAnchor('prev', 'y')).toEqual({ top: '-100%' });
    expect(incomingWeekAnchor('next', 'x')).toEqual({ top: '0', left: '100%' });
    expect(incomingWeekAnchor('prev', 'x')).toEqual({ top: '0', left: '-100%' });
  });

  it('moves next week in the negative direction and previous week in the positive', () => {
    expect(weekShiftDelta('next', 400)).toBe(-400);
    expect(weekShiftDelta('prev', 400)).toBe(400);
  });

  it('plays the same duration on recipe and chip tracks even when distances differ', () => {
    const calls: Array<{ keyframes: unknown; options: unknown }> = [];
    const el = {
      animate: vi.fn((keyframes: unknown, options: unknown) => {
        calls.push({ keyframes, options });
        return { finished: Promise.resolve() };
      }),
    };
    const days = el as unknown as HTMLElement;
    const chips = el as unknown as HTMLElement;
    playSyncedShift(
      [
        { elements: [days, days], axis: 'y', distance: 400 },
        { elements: [chips, chips], axis: 'x', distance: 280 },
      ],
      'next',
    );
    expect(calls).toHaveLength(4);
    expect(calls[0].options).toEqual(weekShiftAnimationOptions());
    expect(calls.every(call => call.options)).toBeTruthy();
    expect(calls[0].options).toEqual(calls[3].options);
    expect(calls[0].keyframes).toEqual(weekShiftKeyframes('y', 'next', 400));
    expect(calls[2].keyframes).toEqual(weekShiftKeyframes('x', 'next', 280));
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

describe('weekSlideDirection', () => {
  it('slides only for an adjacent week', () => {
    expect(weekSlideDirection(1)).toBe('next');
    expect(weekSlideDirection(-1)).toBe('prev');
    expect(weekSlideDirection(0)).toBeNull();
    expect(weekSlideDirection(2)).toBeNull();
    expect(weekSlideDirection(-3)).toBeNull();
  });
});

describe('weekJumpMotion', () => {
  it('crossfades multi-week jumps and slides a single week', () => {
    expect(weekJumpMotion(0)).toBeNull();
    expect(weekJumpMotion(1)).toEqual({ direction: 'next', motion: 'slide' });
    expect(weekJumpMotion(-1)).toEqual({ direction: 'prev', motion: 'slide' });
    expect(weekJumpMotion(2)).toEqual({ direction: 'next', motion: 'crossfade' });
    expect(weekJumpMotion(-4)).toEqual({ direction: 'prev', motion: 'crossfade' });
  });
});

describe('week crossfade', () => {
  it('parks the incoming week on top at opacity 0', () => {
    expect(incomingWeekFadeAnchor()).toEqual({ top: '0', left: '0', opacity: 0 });
  });

  it('fades outgoing and incoming on one shorter timeline', () => {
    const calls: Array<{ keyframes: unknown; options: unknown }> = [];
    const el = {
      animate: vi.fn((keyframes: unknown, options: unknown) => {
        calls.push({ keyframes, options });
        return { finished: Promise.resolve() };
      }),
    };
    const outgoing = el as unknown as HTMLElement;
    const incoming = el as unknown as HTMLElement;
    playSyncedCrossfade([outgoing, outgoing], [incoming, incoming]);
    expect(calls).toHaveLength(4);
    expect(calls[0].keyframes).toEqual(weekCrossfadeKeyframes(true));
    expect(calls[2].keyframes).toEqual(weekCrossfadeKeyframes(false));
    expect(calls.every(call => call.options)).toBeTruthy();
    expect(weekCrossfadeAnimationOptions()).toEqual({
      duration: WEEK_CROSSFADE_MS,
      easing: WEEK_SHIFT_EASING,
      fill: 'forwards',
    });
    expect(WEEK_CROSSFADE_MS).toBeLessThan(WEEK_SHIFT_MS);
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
