/**
 * Parse the quantity at the start of an ingredient line.
 *
 * Handles mixed numbers (1½, 1 1/2, 1-1/2), vulgar fractions, decimal
 * amounts, quantity ranges (1-3, 1–3, 1 to 3), and glued metric/imperial
 * dual measurements once the caller has split units off the name.
 */

export const VULGAR: Record<string, number> = {
  '¼': 0.25, '½': 0.5, '¾': 0.75,
  '⅓': 0.333, '⅔': 0.667,
  '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8,
  '⅙': 0.167, '⅚': 0.833,
  '⅐': 0.143, '⅑': 0.111, '⅒': 0.1,
  '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
};

const VULGAR_CHARS = Object.keys(VULGAR).join('');
const VULGAR_CLASS = VULGAR_CHARS.replace(/[\]\\^-]/g, '\\$&');
const RANGE_SEP_RE = new RegExp(
  `^(\\s*[-–—−~]\\s*|\\s+to\\s+)(?=\\d|[${VULGAR_CLASS}])`,
);

export type LeadingAmount = {
  /** Paste storage form: "1.5" or "1-3". */
  display: string;
  /** Numeric value; ranges use the midpoint. */
  value: number;
  /** Index after the amount in the original string. */
  end: number;
};

export function formatQty(n: number): string {
  const rounded = Math.round(n * 1000) / 1000;
  return String(rounded);
}

function parseNumber(s: string, i: number): { value: number; end: number } | null {
  if (i >= s.length) return null;
  const ch = s[i];
  if (VULGAR[ch] != null) return { value: VULGAR[ch], end: i + 1 };

  const dec = s.slice(i).match(/^\d+(?:\.\d+)?/);
  if (!dec) return null;
  let value = parseFloat(dec[0]);
  const end = i + dec[0].length;
  const rest = s.slice(end);

  // Mixed whole + vulgar: "1½" or "1 ½"
  const vul = rest.match(new RegExp(`^(\\s*)([${VULGAR_CLASS}])`));
  if (vul && vul[1].length <= 1) {
    return { value: value + VULGAR[vul[2]], end: end + vul[0].length };
  }

  // US mixed with a hyphen or space: "1-1/2", "1 1/2", "1 – 1/2"
  const mixed = rest.match(/^(\s*[-–—]\s*|\s+)(\d+)\s*[/⁄]\s*(\d+)/);
  if (mixed) {
    const num = parseInt(mixed[2], 10);
    const den = parseInt(mixed[3], 10);
    if (den > 0 && num < den) {
      return { value: value + num / den, end: end + mixed[0].length };
    }
  }

  // Simple fraction continuation: "1/2", "1⁄2"
  const frac = rest.match(/^[/⁄](\d+)/);
  if (frac) {
    const den = parseInt(frac[1], 10);
    if (den > 0) return { value: value / den, end: end + frac[0].length };
  }

  return { value, end };
}

/** Read a quantity (and optional range) at the start of `s`. */
export function parseLeadingAmount(s: string): LeadingAmount | null {
  const first = parseNumber(s, 0);
  if (!first) return null;

  const rest = s.slice(first.end);
  const sep = rest.match(RANGE_SEP_RE);
  if (sep) {
    const second = parseNumber(s, first.end + sep[0].length);
    if (second) {
      return {
        display: `${formatQty(first.value)}-${formatQty(second.value)}`,
        value: (first.value + second.value) / 2,
        end: second.end,
      };
    }
  }

  return {
    display: formatQty(first.value),
    value: first.value,
    end: first.end,
  };
}

/**
 * Turn a stored amount field into a number for shopping-list totals.
 * Empty amounts count as 1 (legacy behaviour). Ranges use the midpoint.
 */
export function parseAmountNumber(amount: string): number {
  if (!amount || !amount.trim()) return 1;
  const parsed = parseLeadingAmount(amount.trim());
  if (!parsed) {
    const n = parseFloat(amount.match(/[\d.]+/)?.[0] || '1');
    return isNaN(n) ? 1 : n;
  }
  return parsed.value;
}

/** "100g", "1½tsp", "500g/1lb" → "100 g", "1½ tsp", "500 g/1 lb". */
export function splitGluedUnits(line: string, unitAlt: string): string {
  return line.replace(
    new RegExp(`(\\d|[${VULGAR_CLASS}])(${unitAlt})\\b`, 'gi'),
    '$1 $2',
  );
}

/**
 * Drop a redundant second measurement (" / 1 lb", "(1 lb)") left in the name
 * after the first amount+unit has been taken. Ingredient slashes like
 * "beef / chicken" are left alone because they are not number + unit.
 */
export function stripAlternateMeasurement(name: string, unitAlt: string): string {
  const qty = `[\\d${VULGAR_CLASS}.,/⁄\\s-–—]*`;
  return name
    .replace(new RegExp(`^\\s*/\\s*${qty}\\b(?:${unitAlt})\\.?\\b\\s*`, 'i'), '')
    .replace(new RegExp(`^\\s*\\(\\s*${qty}\\b(?:${unitAlt})\\.?\\b\\s*\\)\\s*`, 'i'), '')
    .trim();
}

/** If the leftover name starts with a hyphen before a unit ("-inch"), drop it. */
export function stripHyphenBeforeUnit(rest: string, unitAlt: string): string {
  const m = rest.match(new RegExp(`^-\\s*(?=(?:${unitAlt})\\b)`, 'i'));
  return m ? rest.slice(m[0].length) : rest;
}
