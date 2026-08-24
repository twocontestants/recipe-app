import { describe, expect, it } from 'vitest';
import { opsNeedListChanged, type ShoppingOp } from './shoppingOps';

describe('opsNeedListChanged', () => {
  it('does not ask other clients to reread after a check or clear', () => {
    const check: ShoppingOp = {
      t: 'check',
      key: 'a1',
      value: { checked: true, checkedBy: 'Sam', checkedAt: 1 },
    };
    expect(opsNeedListChanged([check])).toBe(false);
    expect(opsNeedListChanged([{ t: 'clearChecked' }])).toBe(false);
    expect(opsNeedListChanged([check, { t: 'clearChecked' }])).toBe(false);
  });

  it('asks other clients to reread after a structural edit', () => {
    expect(opsNeedListChanged([{ t: 'setSubtitle', subtitle: 'Market' }])).toBe(true);
    expect(opsNeedListChanged([
      { t: 'check', key: 'a1', value: null },
      { t: 'override', key: 'a1', patch: { hidden: true } },
    ])).toBe(true);
  });
});
