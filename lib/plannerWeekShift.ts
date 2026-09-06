export type WeekShiftDirection = 'up' | 'down';

export function adjacentWeekDate(weekStart: Date, weeks: number): Date {
  const next = new Date(weekStart);
  next.setDate(weekStart.getDate() + weeks * 7);
  return next;
}

export function weekShiftScrollPlan(
  direction: WeekShiftDirection,
  incomingOffsetTop: number,
  incomingOffsetHeight: number,
): { preScrollTop: number | null; targetTop: number } {
  if (direction === 'down') {
    return { preScrollTop: null, targetTop: incomingOffsetTop };
  }
  return { preScrollTop: incomingOffsetHeight, targetTop: 0 };
}

export function scrollBehaviorForNav(reducedMotion: boolean): ScrollBehavior {
  return reducedMotion ? 'auto' : 'smooth';
}

export function prefersReducedMotion(
  media: typeof window.matchMedia | undefined = typeof window === 'undefined'
    ? undefined
    : window.matchMedia?.bind(window),
): boolean {
  try {
    return Boolean(media?.('(prefers-reduced-motion: reduce)').matches);
  } catch {
    return false;
  }
}

/** Wait until a scroller finishes moving, or until `timeoutMs` if scrollend never fires. */
export function waitForScrollEnd(el: HTMLElement, timeoutMs = 900): Promise<void> {
  return new Promise(resolve => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      el.removeEventListener('scrollend', finish);
      window.clearTimeout(tid);
      resolve();
    };
    el.addEventListener('scrollend', finish, { once: true });
    const tid = window.setTimeout(finish, timeoutMs);
  });
}

export async function runWeekShiftScroll(
  scroller: HTMLElement,
  incoming: HTMLElement,
  direction: WeekShiftDirection,
  reducedMotion: boolean,
): Promise<void> {
  const plan = weekShiftScrollPlan(direction, incoming.offsetTop, incoming.offsetHeight);
  if (plan.preScrollTop !== null) scroller.scrollTop = plan.preScrollTop;
  const behavior = scrollBehaviorForNav(reducedMotion);
  scroller.scrollTo({ top: plan.targetTop, behavior });
  const alreadyThere = Math.abs(scroller.scrollTop - plan.targetTop) < 1;
  if (alreadyThere || behavior === 'auto') return;
  await waitForScrollEnd(scroller);
}
