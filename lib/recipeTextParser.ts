/**
 * recipeTextParser.ts
 *
 * Parses free-form recipe text (pasted from anywhere) into a structured
 * recipe object. No AI — purely regex, heuristics, and pattern matching.
 *
 * Strategy:
 *  1. Split into lines and classify each as: title, meta, section header,
 *     ingredient, step, or noise.
 *  2. Use section headers ("Ingredients:", "Method:", etc.) as hard anchors
 *     when present; fall back to heuristic line-by-line classification.
 *  3. Parse each ingredient line into { amount, unit, name }.
 *  4. Detect servings, times from meta lines.
 */

import type { Ingredient } from './db';
import { inferProtein } from './autotag';

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export interface ParsedRecipe {
  title: string;
  description: string;
  servings: number | null;
  prep_time: number | null;
  cook_time: number | null;
  ingredients: Ingredient[];
  steps: string[];
  tags: string[];
  primary_protein: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

// Measurement units — ordered longest-first so regex alternation is greedy
const UNITS = [
  // Volume
  'tablespoons?', 'tbsps?', 'tbsp',
  'teaspoons?',   'tsps?',  'tsp',
  'fluid ounces?', 'fl\\.?\\s*oz',
  'millilitres?', 'milliliters?', 'mls?',
  'litres?', 'liters?', 'l',
  'cups?',
  // Weight
  'kilograms?', 'kgs?',
  'grams?', 'g',
  'pounds?', 'lbs?',
  'ounces?', 'ozs?', 'oz',
  // Count / descriptor units
  'bunche?s?',
  'handfuls?',
  'pinch(?:es)?',
  'packages?', 'pkgs?',
  'cloves?',
  'cans?', 'tins?',
  'slices?',
  'pieces?',
  'strips?',
  'sheets?',
  'stalks?',
  'sprigs?',
  'heads?',
  'rashers?',
  'fillets?',
  'inches?', 'in',
  'cms?',
];

const UNIT_RE = new RegExp(
  `^(${UNITS.join('|')})\\.?$`,
  'i'
);

// Vulgar fractions → decimal
const VULGAR: Record<string, number> = {
  '¼': 0.25, '½': 0.5, '¾': 0.75,
  '⅓': 0.333, '⅔': 0.667,
  '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
};

// Section header patterns
const INGREDIENT_HEADERS = /^(ingredients?|what you'?ll? need|shopping list|you(?:'ll)? need|for the \w+):?\s*$/i;
const METHOD_HEADERS     = /^(method|steps?|instructions?|directions?|preparation|how to(?: make)?|to make):?\s*$/i;
const NOTES_HEADERS      = /^(notes?|tips?|serving suggestions?|nutrition|nutritional):?\s*$/i;

// Lines that are clearly noise
const NOISE_RE = /^(print|save|share|jump to recipe|rate this|advertisement|photo by|serves:|prep:|cook:|total:|yield:|difficulty:|cuisine:|course:|calories?:|nutrition facts?)/i;

// ─────────────────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────────────────

export function parseRecipeText(raw: string): ParsedRecipe {
  const lines = raw
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  // ── 1. Extract meta lines (times, servings) from anywhere in the text ──
  const meta = extractMeta(lines);

  // ── 2. Find section boundaries ──
  const sections = splitIntoSections(lines);

  // ── 3. Identify title ──
  const title = extractTitle(sections.preamble, lines);

  // ── 4. Extract description from preamble ──
  const description = extractDescription(sections.preamble, title);

  // ── 5. Parse ingredients ──
  const ingredients = sections.ingredientLines.flatMap(parseIngredientLine).filter(i => i.name.length > 0);

  // ── 6. Parse steps ──
  const steps = parseSteps(sections.methodLines);

  // ── 7. Detect primary protein from title, ingredients, and method ──
  const primary_protein = inferProtein(title, ingredients, steps) ?? null;

  return {
    title,
    description,
    servings: meta.servings,
    prep_time: meta.prep_time,
    cook_time: meta.cook_time,
    ingredients,
    steps,
    tags: [],
    primary_protein,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Section splitter
// ─────────────────────────────────────────────────────────────────────────────

interface Sections {
  preamble: string[];
  ingredientLines: string[];
  methodLines: string[];
}

function splitIntoSections(lines: string[]): Sections {
  let ingStart = -1, ingEnd = -1;
  let methStart = -1, methEnd = -1;

  // Find explicit section headers first
  for (let i = 0; i < lines.length; i++) {
    if (INGREDIENT_HEADERS.test(lines[i])) {
      if (ingStart === -1) ingStart = i + 1;
    } else if (METHOD_HEADERS.test(lines[i])) {
      if (methStart === -1) methStart = i + 1;
      if (ingStart !== -1 && ingEnd === -1) ingEnd = i;
    } else if (NOTES_HEADERS.test(lines[i])) {
      if (methStart !== -1 && methEnd === -1) methEnd = i;
    }
  }

  // If we found explicit headers, use them
  if (ingStart !== -1 && methStart !== -1) {
    return {
      preamble:        lines.slice(0, ingStart - 1),
      ingredientLines: lines.slice(ingStart, ingEnd === -1 ? methStart - 1 : ingEnd).filter(l => !NOISE_RE.test(l)),
      methodLines:     lines.slice(methStart, methEnd === -1 ? undefined : methEnd).filter(l => !NOISE_RE.test(l)),
    };
  }

  // Fallback: classify each line heuristically
  return heuristicSplit(lines);
}

function heuristicSplit(lines: string[]): Sections {
  const preamble: string[] = [];
  const ingredientLines: string[] = [];
  const methodLines: string[] = [];

  // Score each line: positive = ingredient, negative = step, 0 = preamble/noise
  let seenIngredient = false;
  let seenStep = false;

  for (const line of lines) {
    if (NOISE_RE.test(line)) continue;
    if (INGREDIENT_HEADERS.test(line) || METHOD_HEADERS.test(line)) continue;

    const ingScore = ingredientScore(line);
    const stepScore = stepLikelihood(line);

    if (!seenIngredient && !seenStep && ingScore < 2 && stepScore < 2) {
      preamble.push(line);
    } else if (ingScore >= 2 && !seenStep) {
      ingredientLines.push(line);
      seenIngredient = true;
    } else if (stepScore >= 2 || seenStep) {
      methodLines.push(line);
      seenStep = true;
    } else if (seenIngredient && ingScore >= 1) {
      ingredientLines.push(line);
    } else {
      methodLines.push(line);
    }
  }

  return { preamble, ingredientLines, methodLines };
}

// How ingredient-like is a line? (0-5)
function ingredientScore(line: string): number {
  let score = 0;
  if (/^[\d¼½¾⅓⅔⅛⅜⅝⅞]/.test(line)) score += 2;           // starts with number/fraction
  if (UNIT_RE.test(line.split(/\s+/)[1] ?? '')) score += 2; // second word is a unit
  if (line.length < 80) score += 1;                          // short lines
  if (/\d/.test(line)) score += 1;                           // contains a number
  if (line.length > 200) score -= 3;                         // too long to be ingredient
  if (/^[\d]+[.)]\s/.test(line)) score -= 2;                 // numbered list = step
  return score;
}

// How step-like is a line? (0-5)
function stepLikelihood(line: string): number {
  let score = 0;
  if (/^[\d]+[.)]\s/.test(line)) score += 3;                     // "1. " or "1) "
  if (/^step\s*\d/i.test(line)) score += 3;                      // "Step 1"
  if (line.length > 80) score += 2;                               // long prose
  if (/\b(heat|add|mix|stir|cook|bake|roast|pour|place|combine|bring|reduce|season|serve|remove|transfer|whisk|fold|chop|slice|dice|preheat|simmer|boil|fry|sauté|saute|drain|rinse|prepare|set aside|allow|until|meanwhile|then|once)\b/i.test(line)) score += 2;
  return score;
}

// ─────────────────────────────────────────────────────────────────────────────
// Title extraction
// ─────────────────────────────────────────────────────────────────────────────

function extractTitle(preamble: string[], allLines: string[]): string {
  // First non-empty preamble line that isn't a meta/noise line
  for (const line of preamble) {
    if (!NOISE_RE.test(line) && line.length > 2 && line.length < 120) {
      return capitalise(line.replace(/^#+ /, ''));
    }
  }
  // Fallback: first line of entire text
  for (const line of allLines) {
    if (!NOISE_RE.test(line) && !INGREDIENT_HEADERS.test(line) && !METHOD_HEADERS.test(line) && line.length > 2) {
      return capitalise(line.replace(/^#+ /, ''));
    }
  }
  return 'Untitled Recipe';
}

// ─────────────────────────────────────────────────────────────────────────────
// Description extraction
// ─────────────────────────────────────────────────────────────────────────────

function extractDescription(preamble: string[], title: string): string {
  const desc = preamble
    .filter(l => l !== title && !NOISE_RE.test(l) && l.length > 20)
    .slice(0, 3)
    .join(' ')
    .slice(0, 500);
  return desc;
}

// ─────────────────────────────────────────────────────────────────────────────
// Meta extraction (servings, times)
// ─────────────────────────────────────────────────────────────────────────────

interface Meta {
  servings:  number | null;
  prep_time: number | null;
  cook_time: number | null;
}

function extractMeta(lines: string[]): Meta {
  let servings:  number | null = null;
  let prep_time: number | null = null;
  let cook_time: number | null = null;

  for (const line of lines) {
    const l = line.toLowerCase();

    // Servings: "Serves 4", "Makes 6", "Servings: 4", "4 servings", "Yield: 4-6"
    if (servings === null) {
      const m =
        l.match(/(?:serves?|servings?|makes?|yields?|portions?)[\s:–\-]+(\d+)(?:\s*[-–to]+\s*(\d+))?/i) ||
        l.match(/^(\d+)\s*(?:serves?|servings?|portions?)/i);
      if (m) {
        const lo = parseInt(m[1]);
        const hi = m[2] ? parseInt(m[2]) : null;
        servings = hi ? Math.round((lo + hi) / 2) : lo;
      }
    }

    // Prep time: "Prep: 15 mins", "Preparation time: 1 hour"
    if (prep_time === null) {
      const m = l.match(/prep(?:aration)?(?:\s+time)?[\s:–\-]+(.+)/i);
      if (m) prep_time = parseTimeString(m[1]);
    }

    // Cook time: "Cook: 30 mins", "Cooking time: 45 minutes", "Bake: 1 hr 20 min"
    if (cook_time === null) {
      const m = l.match(/(?:cook(?:ing)?|bak(?:ing|e)|roast(?:ing)?|total)(?:\s+time)?[\s:–\-]+(.+)/i);
      if (m) cook_time = parseTimeString(m[1]);
    }
  }

  return { servings, prep_time, cook_time };
}

function parseTimeString(s: string): number | null {
  s = s.toLowerCase().trim();
  // "1 hour 30 minutes", "1h30m", "1 hr 30 min", "90 minutes", "30 mins"
  const hrMatch  = s.match(/(\d+)\s*h(?:r|our)?s?/);
  const minMatch = s.match(/(\d+)\s*m(?:in(?:ute)?)?s?/);
  if (hrMatch || minMatch) {
    return (parseInt(hrMatch?.[1] ?? '0') * 60) + parseInt(minMatch?.[1] ?? '0');
  }
  // Plain number — assume minutes if ≤ 300, otherwise ignore
  const plain = parseInt(s);
  if (!isNaN(plain) && plain <= 300) return plain;
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ingredient line parser
// ─────────────────────────────────────────────────────────────────────────────

// Normalise vulgar fractions to decimal strings for display
function normaliseFraction(s: string): string {
  // Replace unicode vulgar fractions
  for (const [char, val] of Object.entries(VULGAR)) {
    s = s.replace(char, String(val));
  }
  // Evaluate "1 1/2" → "1.5"
  s = s.replace(/(\d+)\s+(\d+)\/(\d+)/, (_, w, n, d) =>
    String(parseFloat(w) + parseFloat(n) / parseFloat(d))
  );
  // Evaluate "1/2" → "0.5"
  s = s.replace(/^(\d+)\/(\d+)$/, (_, n, d) =>
    String(parseFloat(n) / parseFloat(d))
  );
  return s.trim();
}

// The core ingredient regex:
// Group 1: optional amount  (digits, fractions, vulgar chars, ranges like "2-3")
// Group 2: optional unit
// Group 3: everything else = name

// Build amount pattern
const AMT_CHARS = `[\\d\\s¼½¾⅓⅔⅛⅜⅝⅞\\/\\-\\.]`;
const AMT_PAT   = `(${AMT_CHARS}+)?`;

// Build unit pattern with word boundary so "l" doesn't match "large"
const UNIT_PAT = `(${UNITS.join('|')})\\.?`;

const ING_RE = new RegExp(
  `^${AMT_PAT}\\s*\\b${UNIT_PAT}\\b\\s*(.+)`,
  'i'
);

// Fallback: amount only (no unit)
const AMT_ONLY_RE = new RegExp(
  `^${AMT_PAT}\\s+(.+)`
);

// Size words that must not end up in the unit field
const SIZE_WORDS = new Set(['large', 'medium', 'small', 'extra-large', 'extra large', 'jumbo', 'mini', 'tiny']);

// Remove parentheticals, including nested ones like "((a, b))", by repeatedly
// clearing the innermost pair until none remain.
function stripParentheticals(s: string): string {
  let prev: string;
  do { prev = s; s = s.replace(/\([^()]*\)/g, ' '); } while (s !== prev);
  return s.replace(/\s+/g, ' ').trim();
}

export function parseIngredientLine(raw: string): Ingredient[] {
  // Clean the line
  let line = raw
    .trim()
    .replace(/\s+/g, ' ')
    // Separate number-glued units: "100g" → "100 g", "1.5kg" → "1.5 kg", "200ml" → "200 ml"
    .replace(/(\d)(g|kg|ml|l|oz|lb|lbs)\b/gi, '$1 $2')
    .replace(/\s+/g, ' ')
    .replace(/^[\s•·\-\*\/\(\)\[\]]+/, '')  // leading bullets/punctuation
    .replace(/[\s\/\(\)\[\]]+$/, '');        // trailing punctuation

  if (!line || line.length < 2) return [];

  // Skip section sub-headers like "For the sauce:" inside ingredients block
  if (/^(for the |for |the )/i.test(line) && line.endsWith(':')) return [];
  if (line.endsWith(':') && line.split(' ').length <= 5) return [];

  // Some sites use "OR" to separate alternatives — take the first
  line = line.split(/\s+or\s+/i)[0];

  // "<amount> <unit> each A, B, C" is shorthand for several ingredients sharing
  // one amount (e.g. "1 tsp each cumin, coriander, paprika"). Split it into one
  // ingredient per item. Parentheticals are removed first so a comma inside a
  // note ("((any, but I like smoked paprika))") doesn't get read as a separator.
  const deParen = stripParentheticals(raw);
  const eachMatch = deParen.match(/^(.*?)\beach\b\s+(.+)$/i);
  if (eachMatch) {
    const lead = eachMatch[1].trim();                       // e.g. "1 tsp"
    const items = eachMatch[2]
      .split(/\s*[,;]\s*|\s+and\s+|\s*&\s*/i)
      .map(s => s.replace(/^of\s+/i, '').trim())
      .filter(Boolean);
    if (items.length >= 2) {
      return items.flatMap(it => parseIngredientLine(lead ? `${lead} ${it}` : it));
    }
  }
  // Strip a stray leading "each" left on a single item ("each cumin" → "cumin").
  line = line.replace(/^each\s+/i, '');

  // Attempt full match: amount + unit + name
  const full = line.match(ING_RE);
  if (full) {
    const rawAmount = (full[1] || '').trim();
    const rawUnit   = (full[2] || '').trim();
    const rawName   = (full[3] || '').trim();

    // Reject if the "unit" is actually a size word that snuck through
    if (SIZE_WORDS.has(rawUnit.toLowerCase())) {
      return [{ amount: normaliseFraction(rawAmount), unit: '', name: `${rawUnit} ${rawName}`.trim() }];
    }

    return [{
      amount: normaliseFraction(rawAmount),
      unit:   rawUnit,
      name:   rawName,
    }];
  }

  // Fallback: amount (no unit) + name — e.g. "2 eggs", "1 large onion"
  const amtOnly = line.match(AMT_ONLY_RE);
  if (amtOnly) {
    const rawAmount = (amtOnly[1] || '').trim();
    const rawName   = (amtOnly[2] || '').trim();
    // If rawAmount is just noise, put everything in name
    if (!rawAmount || /^[\s\-\.]+$/.test(rawAmount)) {
      return [{ amount: '', unit: '', name: rawName }];
    }
    return [{
      amount: normaliseFraction(rawAmount),
      unit:   '',
      name:   rawName,
    }];
  }

  // No number at all — whole line is the name
  return [{ amount: '', unit: '', name: capitalise(line) }];
}

// ─────────────────────────────────────────────────────────────────────────────
// Step parser
// ─────────────────────────────────────────────────────────────────────────────

function parseSteps(lines: string[]): string[] {
  const steps: string[] = [];

  for (const line of lines) {
    if (!line || NOISE_RE.test(line)) continue;

    // Remove leading numbering: "1.", "1)", "Step 1:", "Step 1 —"
    const cleaned = line
      .replace(/^step\s*\d+[\s.:)–\-]*/i, '')
      .replace(/^\d+[.)]\s*/, '')
      .trim();

    if (cleaned.length < 5) continue;

    // Some recipes have all steps concatenated in a single line separated by ". "
    // Split those if they're very long
    if (cleaned.length > 400) {
      const split = cleaned.match(/[^.!?]+[.!?]+/g) ?? [cleaned];
      for (const s of split) {
        const t = s.trim();
        if (t.length > 10) steps.push(capitalise(t));
      }
    } else {
      steps.push(capitalise(cleaned));
    }
  }

  // Merge any orphaned single-sentence continuations (< 20 chars) into prior step
  const merged: string[] = [];
  for (const step of steps) {
    if (merged.length > 0 && step.length < 20 && !/[.!?]$/.test(merged[merged.length - 1])) {
      merged[merged.length - 1] += ' ' + step;
    } else {
      merged.push(step);
    }
  }

  return merged;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function capitalise(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
