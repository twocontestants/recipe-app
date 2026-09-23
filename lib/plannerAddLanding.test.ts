import { describe, expect, it } from 'vitest';
import {
  ADD_LANDING_CLASS,
  ADD_LANDING_MS,
  landingAfterPersist,
  landingCardClass,
  landingScrollOptions,
  prefersReducedAddLanding,
  shouldRevealDestinationWeek,
  type AddLanding,
} from './plannerAddLanding';

const landing: AddLanding = {
  mealId: 'tmp-1',
  dayIndex: 2,
  weekStartIso: '2026-09-21',
};

describe('planner add landing', () => {
  it('marks only the matching meal when the destination is visible', () => {
    expect(landingCardClass('tmp-1', landing)).toBe(ADD_LANDING_CLASS);
    expect(landingCardClass('other', landing)).toBe('');
    expect(landingCardClass('tmp-1', null)).toBe('');
    expect(landingCardClass('tmp-1', landing, { destinationVisible: false })).toBe('');
    expect(landingCardClass('tmp-1', landing, { destinationVisible: true })).toBe(ADD_LANDING_CLASS);
  });

  it('reveals another week only when the week-start day strings differ', () => {
    expect(shouldRevealDestinationWeek('2026-09-21', '2026-09-21')).toBe(false);
    expect(shouldRevealDestinationWeek('2026-09-21', '2026-10-05')).toBe(true);
  });

  it('swaps the landing meal id after the temp row is persisted', () => {
    expect(landingAfterPersist(landing, 'tmp-1', 'real-9')).toEqual({
      ...landing,
      mealId: 'real-9',
    });
    expect(landingAfterPersist(landing, 'tmp-other', 'real-9')).toEqual(landing);
    expect(landingAfterPersist(null, 'tmp-1', 'real-9')).toBeNull();
  });

  it('scrolls smoothly unless the cook prefers reduced motion', () => {
    expect(landingScrollOptions(false)).toEqual({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
    expect(landingScrollOptions(true)).toEqual({
      behavior: 'auto',
      block: 'nearest',
      inline: 'nearest',
    });
  });

  it('keeps the landing cue under a second and honors reduced motion', () => {
    expect(ADD_LANDING_MS).toBeLessThan(1000);
    expect(prefersReducedAddLanding(() => ({ matches: true }))).toBe(true);
    expect(prefersReducedAddLanding(() => ({ matches: false }))).toBe(false);
    expect(prefersReducedAddLanding()).toBe(false);
  });
});
