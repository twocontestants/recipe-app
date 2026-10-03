import { describe, expect, it } from 'vitest';
import {
  parseAmountNumber,
  parseLeadingAmount,
  splitGluedUnits,
  stripAlternateMeasurement,
} from './ingredientAmount';

describe('parseLeadingAmount', () => {
  it('reads a glued mixed vulgar fraction as one and a half', () => {
    const parsed = parseLeadingAmount('1½ teaspoon smoked paprika');
    expect(parsed?.display).toBe('1.5');
    expect(parsed?.value).toBe(1.5);
    expect('1½ teaspoon smoked paprika'.slice(parsed!.end).trim()).toBe('teaspoon smoked paprika');
  });

  it('reads a spaced mixed vulgar fraction', () => {
    expect(parseLeadingAmount('1 ½ tsp paprika')?.display).toBe('1.5');
  });

  it('reads ASCII mixed numbers with a space or hyphen', () => {
    expect(parseLeadingAmount('1 1/2 tsp')?.display).toBe('1.5');
    expect(parseLeadingAmount('1-1/2 tsp')?.display).toBe('1.5');
  });

  it('reads a standalone vulgar or ASCII fraction', () => {
    expect(parseLeadingAmount('½ teaspoon salt')?.display).toBe('0.5');
    expect(parseLeadingAmount('1/2 teaspoon salt')?.display).toBe('0.5');
  });

  it('keeps quantity ranges as a hyphenated pair', () => {
    expect(parseLeadingAmount('1-3 teaspoons')?.display).toBe('1-3');
    expect(parseLeadingAmount('1–3 teaspoons')?.display).toBe('1-3');
    expect(parseLeadingAmount('1 to 3 teaspoons')?.display).toBe('1-3');
    expect(parseLeadingAmount('2-3 cups')?.value).toBe(2.5);
  });
});

describe('parseAmountNumber', () => {
  it('does not treat 1½ as 1', () => {
    expect(parseAmountNumber('1½')).toBe(1.5);
    expect(parseAmountNumber('1 ½')).toBe(1.5);
  });

  it('averages a stored range', () => {
    expect(parseAmountNumber('1-3')).toBe(2);
    expect(parseAmountNumber('1 to 3')).toBe(2);
  });
});

describe('splitGluedUnits / stripAlternateMeasurement', () => {
  const units = 'g|kg|ml|l|oz|lb|lbs|tsp|tbsp';

  it('splits 500g/1lb into two unit tokens', () => {
    expect(splitGluedUnits('500g/1lb chicken', units)).toBe('500 g/1 lb chicken');
  });

  it('drops the imperial half of a dual measurement from the name', () => {
    expect(stripAlternateMeasurement('/ 1 lb chicken', units)).toBe('chicken');
    expect(stripAlternateMeasurement('/1 lb chicken thighs', units)).toBe('chicken thighs');
  });
});
