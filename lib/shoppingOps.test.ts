import { describe, expect, it } from 'vitest';
import { checkOpIsOn, opsNeedListChanged, type ShoppingOp } from './shoppingOps';

describe('opsNeedListChanged', () => {
  it('does not ask other clients to reread after a check or clear', () => {
    const check: ShoppingOp = { t: 'check', key: 'a1', checked: true };
    expect(opsNeedListChanged([check])).toBe(false);
    expect(opsNeedListChanged([{ t: 'clearChecked' }])).toBe(false);
    expect(opsNeedListChanged([check, { t: 'clearChecked' }])).toBe(false);
  });

  it('asks other clients to reread after a structural edit', () => {
    expect(opsNeedListChanged([{ t: 'setSubtitle', subtitle: 'Market' }])).toBe(true);
    expect(opsNeedListChanged([
      { t: 'check', key: 'a1', checked: false },
      { t: 'override', key: 'a1', patch: { hidden: true } },
    ])).toBe(true);
  });
});

describe('checkOpIsOn', () => {
  it('reads the boolean checked field', () => {
    expect(checkOpIsOn({ checked: true })).toBe(true);
    expect(checkOpIsOn({ checked: false })).toBe(false);
  });

  it('still understands leftover value objects and null', () => {
    expect(checkOpIsOn({ value: { checked: true } })).toBe(true);
    expect(checkOpIsOn({ value: null })).toBe(false);
    expect(checkOpIsOn({ value: { checked: false } })).toBe(false);
  });
});
