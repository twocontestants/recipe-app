import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  adjacentWeekDate,
  prefersReducedMotion,
  runWeekShiftScroll,
  scrollBehaviorForNav,
  waitForScrollEnd,
  weekShiftScrollPlan,
} from './plannerWeekShift';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('adjacentWeekDate', () => {
  it('shifts a week start by whole weeks', () => {
    const start = new Date(2026, 7, 31);
    expect(adjacentWeekDate(start, 1)).toEqual(new Date(2026, 8, 7));
    expect(adjacentWeekDate(start, -1)).toEqual(new Date(2026, 7, 24));
  });
});

describe('weekShiftScrollPlan', () => {
  it('scrolls down to the incoming pane', () => {
    expect(weekShiftScrollPlan('down', 640, 640)).toEqual({
      preScrollTop: null,
      targetTop: 640,
    });
  });

  it('pins the current pane then scrolls up to the prepended week', () => {
    expect(weekShiftScrollPlan('up', 0, 640)).toEqual({
      preScrollTop: 640,
      targetTop: 0,
    });
  });
});

describe('scrollBehaviorForNav', () => {
  it('uses instant scrolling when reduced motion is preferred', () => {
    expect(scrollBehaviorForNav(false)).toBe('smooth');
    expect(scrollBehaviorForNav(true)).toBe('auto');
  });
});

describe('prefersReducedMotion', () => {
  it('reads the reduced-motion media query', () => {
    const media = vi.fn(() => ({ matches: true }));
    expect(prefersReducedMotion(media as unknown as typeof window.matchMedia)).toBe(true);
  });
});

describe('waitForScrollEnd', () => {
  it('resolves on scrollend or timeout', async () => {
    const el = document.createElement('div');
    const pending = waitForScrollEnd(el, 20);
    el.dispatchEvent(new Event('scrollend'));
    await pending;

    await waitForScrollEnd(el, 10);
  });
});

describe('runWeekShiftScroll', () => {
  it('scrolls smoothly to the next pane', async () => {
    const scroller = document.createElement('div');
    const incoming = document.createElement('div');
    Object.defineProperty(incoming, 'offsetTop', { value: 400 });
    Object.defineProperty(incoming, 'offsetHeight', { value: 400 });
    Object.defineProperty(scroller, 'scrollTop', { value: 0, writable: true });
    scroller.scrollTo = vi.fn(function (this: HTMLElement, opts?: ScrollToOptions) {
      if (opts && typeof opts.top === 'number') this.scrollTop = opts.top;
    });

    await runWeekShiftScroll(scroller, incoming, 'down', false);
    expect(scroller.scrollTo).toHaveBeenCalledWith({ top: 400, behavior: 'smooth' });
  });

  it('jumps instantly when reduced motion is on', async () => {
    const scroller = document.createElement('div');
    const incoming = document.createElement('div');
    Object.defineProperty(incoming, 'offsetTop', { value: 0 });
    Object.defineProperty(incoming, 'offsetHeight', { value: 400 });
    Object.defineProperty(scroller, 'scrollTop', { value: 0, writable: true });
    scroller.scrollTo = vi.fn();

    await runWeekShiftScroll(scroller, incoming, 'up', true);
    expect(scroller.scrollTop).toBe(400);
    expect(scroller.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
  });
});
