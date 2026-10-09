import { describe, expect, it } from 'vitest';
import { decodeHtmlEntities } from './htmlEntities';

describe('decodeHtmlEntities', () => {
  it('turns numeric apostrophes and quotes into characters', () => {
    expect(decodeHtmlEntities('Nagi&#39;s chilli')).toBe("Nagi's chilli");
    expect(decodeHtmlEntities('chef&#8217;s salt')).toBe('chef\u2019s salt');
    expect(decodeHtmlEntities('&#x27;')).toBe("'");
  });

  it('unwinds a double-encoded entity', () => {
    expect(decodeHtmlEntities('fish &amp; chips')).toBe('fish & chips');
    expect(decodeHtmlEntities('Nagi&amp;#39;s')).toBe("Nagi's");
  });

  it('leaves ordinary ampersands alone', () => {
    expect(decodeHtmlEntities('salt & pepper')).toBe('salt & pepper');
    expect(decodeHtmlEntities('1 tbsp olive oil')).toBe('1 tbsp olive oil');
  });
});
