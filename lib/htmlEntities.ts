/**
 * Turn HTML character references into the characters they stand for.
 * Recipe JSON-LD often stores an apostrophe as the literal text &#39; rather
 * than as '. Named entities are decoded too, and a second pass unwinds
 * double encoding such as &amp;#39;.
 */

const NAMED: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '\u2013',
  mdash: '\u2014',
  lsquo: '\u2018',
  rsquo: '\u2019',
  ldquo: '\u201c',
  rdquo: '\u201d',
  hellip: '\u2026',
  bull: '\u2022',
  middot: '\u00b7',
  times: '\u00d7',
  divide: '\u00f7',
  deg: '\u00b0',
  frac12: '\u00bd',
  frac14: '\u00bc',
  frac34: '\u00be',
  eacute: '\u00e9',
  egrave: '\u00e8',
  ecirc: '\u00ea',
  aacute: '\u00e1',
  agrave: '\u00e0',
  acirc: '\u00e2',
  oacute: '\u00f3',
  ograve: '\u00f2',
  ocirc: '\u00f4',
  uacute: '\u00fa',
  ugrave: '\u00f9',
  ucirc: '\u00fb',
  iacute: '\u00ed',
  igrave: '\u00ec',
  ntilde: '\u00f1',
  ccedil: '\u00e7',
  auml: '\u00e4',
  ouml: '\u00f6',
  uuml: '\u00fc',
  iuml: '\u00ef',
  pound: '\u00a3',
  euro: '\u20ac',
};

const ENTITY_RE = /&(?:#(\d{1,7})|#x([0-9a-f]{1,6})|([a-z][a-z0-9]{1,31}));/gi;

function charFromCode(code: number): string | null {
  if (!Number.isFinite(code) || code <= 0 || code > 0x10FFFF) return null;
  if (code >= 0xD800 && code <= 0xDFFF) return null;
  if (code < 32 && code !== 9 && code !== 10 && code !== 13) return null;
  if (code === 0xa0) return ' ';
  return String.fromCodePoint(code);
}

export function decodeHtmlEntities(input: string): string {
  if (!input || !input.includes('&')) return input;
  let text = input;
  for (let pass = 0; pass < 3; pass++) {
    const next = text.replace(ENTITY_RE, (match, dec: string | undefined, hex: string | undefined, named: string | undefined) => {
      if (dec) return charFromCode(parseInt(dec, 10)) ?? match;
      if (hex) return charFromCode(parseInt(hex, 16)) ?? match;
      if (named) return NAMED[named.toLowerCase()] ?? match;
      return match;
    });
    if (next === text) break;
    text = next;
  }
  return text;
}
