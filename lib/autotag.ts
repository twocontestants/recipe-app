import type { Ingredient } from './db';

// The fixed protein vocabulary used across the app (must match RecipesClient).
export type ProteinType =
  | 'chicken' | 'beef' | 'pork' | 'lamb' | 'fish'
  | 'seafood' | 'tofu' | 'eggs' | 'legumes' | 'dairy';

// "Main" proteins take precedence over eggs/dairy/legumes, which are often
// supporting ingredients (butter, milk, an egg binder, beans in a chilli).
const MAIN_PROTEINS: ProteinType[] = ['chicken', 'beef', 'pork', 'lamb', 'fish', 'seafood', 'tofu', 'legumes'];

const PROTEIN_KEYWORDS: Record<ProteinType, string[]> = {
  chicken: ['chicken', 'drumstick', 'chicken thigh', 'chicken breast', 'chicken wing', 'poussin', 'maryland'],
  beef:    ['beef', 'steak', 'sirloin', 'brisket', 'chuck', 'rump', 'ribeye', 'rib eye', 'veal', 'oxtail', 'short rib', 'porterhouse', 'scotch fillet'],
  pork:    ['pork', 'bacon', 'ham', 'prosciutto', 'pancetta', 'chorizo', 'sausage', 'salami', 'speck', 'gammon'],
  lamb:    ['lamb', 'mutton', 'hogget'],
  fish:    ['fish', 'salmon', 'tuna', 'cod', 'snapper', 'barramundi', 'barra', 'trout', 'mackerel', 'sardine', 'anchovy', 'haddock', 'tilapia', 'basa', 'whiting', 'kingfish', 'halibut', 'flathead'],
  seafood: ['prawn', 'shrimp', 'crab', 'lobster', 'mussel', 'clam', 'oyster', 'squid', 'calamari', 'scallop', 'octopus', 'marinara mix'],
  tofu:    ['tofu', 'tempeh', 'seitan', 'bean curd'],
  eggs:    ['egg'],
  legumes: ['lentil', 'chickpea', 'black bean', 'kidney bean', 'cannellini', 'butter bean', 'borlotti', 'dahl', 'dhal', 'dal', 'split pea', 'black-eyed', 'edamame', 'falafel'],
  dairy:   ['paneer', 'halloumi', 'ricotta'],
};

// Egg-named dishes (title cues) that imply eggs are the star.
const EGG_DISH_WORDS = ['omelette', 'omelet', 'frittata', 'shakshuka', 'quiche'];

// Phrases where a protein word is really a flavouring, not the main protein.
// Stripped before scanning so "vegetable soup with chicken stock" isn't chicken.
const FLAVOUR_PHRASES = [
  /\b(?:chicken|beef|fish|veg(?:etable)?|lamb)\s+(?:stock|broth|bouillon|stock\s+cube|stock\s+powder|consomm[ée]|gravy)\b/gi,
  /\bfish\s+sauce\b/gi,
  /\boyster\s+sauce\b/gi,
  /\bshrimp\s+paste\b/gi,
  /\banchovy\s+(?:paste|essence)\b/gi,
  /\bworcestershire\b/gi,
  /\bxo\s+sauce\b/gi,
];

function clean(text: string): string {
  let t = ' ' + text.toLowerCase() + ' ';
  for (const re of FLAVOUR_PHRASES) t = t.replace(re, ' ');
  return t;
}

function countMatches(haystack: string, keywords: string[]): number {
  let n = 0;
  for (const kw of keywords) {
    const esc = kw.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // \b boundaries exclude substrings ("ham" in "graham", "egg" in "eggplant"),
    // while an optional plural suffix still matches "prawns", "sausages", etc.
    const re = new RegExp(`\\b${esc}(?:es|s)?\\b`, 'gi');
    const m = haystack.match(re);
    if (m) n += m.length;
  }
  return n;
}

/**
 * Infer the primary protein from the title and ingredient list.
 * Title hits are weighted heavily (a dish named "Chicken Tikka" is chicken).
 * Returns undefined when nothing confident is found.
 */
export function inferProtein(title: string, ingredients: Ingredient[]): ProteinType | undefined {
  const titleText = clean(title || '');
  // "eggplant"/"aubergine" must never count toward eggs
  const ingText = clean(ingredients.map(i => i.name).join('  ').replace(/eggplant|aubergine/gi, ' '));
  const titleClean = titleText.replace(/eggplant|aubergine/gi, ' ');

  const score: Partial<Record<ProteinType, number>> = {};
  (Object.keys(PROTEIN_KEYWORDS) as ProteinType[]).forEach(p => {
    score[p] = countMatches(titleClean, PROTEIN_KEYWORDS[p]) * 10
             + countMatches(ingText, PROTEIN_KEYWORDS[p]) * 3;
  });

  const best = (cands: ProteinType[]): ProteinType | undefined => {
    let top: ProteinType | undefined; let max = 0;
    for (const p of cands) {
      const s = score[p] || 0;
      if (s > max) { max = s; top = p; }
    }
    return max > 0 ? top : undefined;
  };

  // 1. Prefer a main protein.
  const main = best(MAIN_PROTEINS);
  if (main) return main;

  // 2. Plain "mince" with no qualifying meat → beef by convention.
  if (/\bmince\b/.test(ingText) || /\bmince\b/.test(titleClean)) return 'beef';

  // 3. Eggs/dairy only when they're clearly the star (in the title, e.g.
  //    "Spanish omelette", "Paneer butter masala"), to avoid butter/milk/an
  //    egg binder hijacking an otherwise vegetable dish.
  if (EGG_DISH_WORDS.some(w => new RegExp(`\\b${w}s?\\b`, 'i').test(titleClean))) return 'eggs';
  for (const p of ['eggs', 'dairy'] as ProteinType[]) {
    if (countMatches(titleClean, PROTEIN_KEYWORDS[p]) > 0) return p;
  }
  return undefined;
}

const MEAT_OR_SEA: ProteinType[] = ['chicken', 'beef', 'pork', 'lamb', 'fish', 'seafood'];

// High-precision dish/cuisine tags from the title (and a few ingredient cues).
const TAG_RULES: Array<{ tag: string; re: RegExp }> = [
  { tag: 'curry',      re: /\b(curry|masala|tikka|korma|vindaloo|rogan|biryani|dahl|dhal)\b/i },
  { tag: 'pasta',      re: /\b(pasta|spaghetti|penne|lasagne|lasagna|fettuccine|macaroni|gnocchi|rigatoni|ravioli)\b/i },
  { tag: 'soup',       re: /\b(soup|chowder|broth|ramen|pho)\b/i },
  { tag: 'salad',      re: /\bsalad\b/i },
  { tag: 'stir-fry',   re: /\bstir.?fry\b/i },
  { tag: 'roast',      re: /\broast(?:ed)?\b/i },
  { tag: 'mexican',    re: /\b(taco|burrito|enchilada|quesadilla|fajita|nacho)\b/i },
  { tag: 'pizza',      re: /\bpizza\b/i },
  { tag: 'bake',       re: /\b(bake|baked|casserole|gratin)\b/i },
  { tag: 'rice',       re: /\b(risotto|fried rice|paella|biryani|pilaf)\b/i },
  { tag: 'noodles',    re: /\b(noodle|udon|soba|pad thai|chow mein)\b/i },
  { tag: 'burger',     re: /\bburger\b/i },
];

/**
 * Produce a primary protein + tag set for a recipe. Merges with any tags the
 * user already supplied (deduped, lower-cased). Pure and side-effect free.
 */
export function autoTag(
  title: string,
  ingredients: Ingredient[],
  existingTags: string[] = []
): { primary_protein?: ProteinType; tags: string[] } {
  const protein = inferProtein(title, ingredients);
  const hay = `${title} ${ingredients.map(i => i.name).join(' ')}`;

  const tags = new Set(existingTags.map(t => t.trim().toLowerCase()).filter(Boolean));
  for (const { tag, re } of TAG_RULES) if (re.test(hay)) tags.add(tag);

  // Vegetarian: confident only when the protein is plant/egg/dairy based AND no
  // meat/seafood keyword appears anywhere.
  const hasMeat = MEAT_OR_SEA.some(p => inferProteinHasKeyword(hay, p));
  if (!hasMeat && (protein === 'tofu' || protein === 'legumes' || protein === 'eggs' || protein === 'dairy')) {
    tags.add('vegetarian');
  }

  return { primary_protein: protein, tags: Array.from(tags) };
}

function inferProteinHasKeyword(text: string, p: ProteinType): boolean {
  return countMatches(clean(text), PROTEIN_KEYWORDS[p]) > 0;
}
