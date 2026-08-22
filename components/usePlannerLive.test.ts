import { describe, expect, it } from 'vitest';
import { shouldResyncPlanner } from './usePlannerLive';

describe('shouldResyncPlanner', () => {
  it('skips the first visible/focus paint', () => {
    expect(shouldResyncPlanner(false, 'visible')).toBe(false);
  });

  it('resyncs only after the tab was hidden', () => {
    expect(shouldResyncPlanner(true, 'visible')).toBe(true);
    expect(shouldResyncPlanner(true, 'hidden')).toBe(false);
  });
});
