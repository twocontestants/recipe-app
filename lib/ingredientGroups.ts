import type { Ingredient } from './db';
import { parseLeadingAmount } from './ingredientAmount';

/**
 * An ingredient keeps its own amount, unit, and name. `group` is the
 * subheading it was listed under ("Chili Spice Mix", "For the sauce"),
 * omitted when the line sits in the ungrouped part of the list.
 * Shopping, tags, and categories keep using `name` and never see the heading.
 */

export interface IngredientSection {
  heading: string | null;
  items: Ingredient[];
}

const OVERALL_TITLE =
  /^(ingredients?|what you(?:'ll| will) need|you(?:'ll)? need|shopping list)$/i;
const OTHER_SECTION =
  /^(method|steps?|instructions?|directions?|preparation|notes?|nutrition)$/i;

export function isOverallIngredientsTitle(raw: string): boolean {
  const bare = raw.replace(/\s+/g, ' ').trim().replace(/[:：]\s*$/, '').trim();
  return OVERALL_TITLE.test(bare);
}

/** Heading text from a page element. Short labels only — not method sentences. */
export function cleanGroupHeading(raw: string): string | null {
  const bare = raw.replace(/\s+/g, ' ').trim().replace(/[:：]\s*$/, '').trim();
  if (!bare || bare.length > 80) return null;
  if (bare.split(/\s+/).length > 8) return null;
  if (/[.!?]/.test(bare)) return null;
  if (isOverallIngredientsTitle(bare) || OTHER_SECTION.test(bare)) return null;
  return bare;
}

/**
 * A plain-text ingredient line that is a subheading rather than an ingredient.
 * Requires a trailing colon ("Chili Spice Mix:") or a common label
 * ("For the sauce", "To Serve") so bare names like "olive oil" stay ingredients.
 */
export function ingredientGroupHeading(line: string): string | null {
  let raw = line.trim().replace(/\s+/g, ' ');
  raw = raw.replace(/^[\s•·\-*]+/, '').trim();
  if (!raw || raw.length > 80) return null;
  if (parseLeadingAmount(raw)) return null;
  const bare = raw.replace(/[:：]\s*$/, '').trim();
  if (!bare || bare.split(/\s+/).length > 8) return null;
  if (/[.!?]/.test(bare)) return null;
  // "For the sauce: simmer until thick" is a step, not a heading.
  if (/[:：]/.test(bare)) return null;
  if (isOverallIngredientsTitle(bare) || OTHER_SECTION.test(bare)) return null;
  if (/[:：]\s*$/.test(raw)) return bare;
  if (/^(for the|for a|for an|to serve|to garnish|to finish|for serving|serving suggestions?|garnish|toppings?)\b/i.test(bare)) {
    return bare;
  }
  return null;
}

/** Consecutive ingredients that share a subheading, in list order. */
export function ingredientSections(ingredients: Ingredient[]): IngredientSection[] {
  const sections: IngredientSection[] = [];
  for (const ing of ingredients) {
    const heading = ing.group?.trim() || null;
    const last = sections[sections.length - 1];
    if (!last || last.heading !== heading) sections.push({ heading, items: [ing] });
    else last.items.push(ing);
  }
  return sections;
}

export function withIngredientGroup(ing: Ingredient, group: string | undefined): Ingredient {
  const trimmed = group?.trim();
  if (!trimmed) {
    if (!ing.group) return ing;
    const { group: _drop, ...rest } = ing;
    return rest;
  }
  if (ing.group === trimmed) return ing;
  return { ...ing, group: trimmed };
}

function normName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function namesLooselyMatch(a: string, b: string): boolean {
  const na = normName(a);
  const nb = normName(b);
  if (!na || !nb) return false;
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;
  const ta = na.split(' ').filter(word => word.length > 2);
  const tb = new Set(nb.split(' ').filter(word => word.length > 2));
  if (ta.length === 0 || tb.size === 0) return false;
  const shared = ta.filter(word => tb.has(word)).length;
  return shared > 0 && shared >= Math.min(ta.length, tb.size) / 2;
}

/**
 * Keep the already-parsed ingredient text when it lines up with the grouped
 * list (schema.org usually has the better wording). When the grouped list is
 * longer, the page's groups are the complete ingredient list and win.
 */
export function mergeGroupedIngredients(
  parsed: Ingredient[],
  grouped: Ingredient[],
  preferGroupedIfRicher: boolean,
): Ingredient[] {
  const flat = grouped.filter(ing => ing.name.trim());
  const named = parsed.filter(ing => ing.name.trim());
  if (named.length === 0) return flat.length > 0 ? flat : parsed;
  if (!flat.some(ing => ing.group?.trim())) return named;
  if (preferGroupedIfRicher && flat.length > named.length) return flat;

  if (named.length === flat.length) {
    return named.map((ing, i) => withIngredientGroup(ing, flat[i].group));
  }

  let cursor = 0;
  const aligned: Ingredient[] = [];
  for (const ing of named) {
    let found = -1;
    for (let k = cursor; k < flat.length; k++) {
      if (namesLooselyMatch(ing.name, flat[k].name)) {
        found = k;
        break;
      }
    }
    if (found < 0) return named;
    aligned.push(withIngredientGroup(ing, flat[found].group));
    cursor = found + 1;
  }
  return aligned;
}
