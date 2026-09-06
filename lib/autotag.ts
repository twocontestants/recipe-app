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

// Bacon/ham and friends are usually a garnish when another main protein is present.
const PORK_GARNISH = new Set(['bacon', 'ham', 'prosciutto', 'pancetta', 'speck', 'salami']);

// Egg-named dishes (title cues) that imply eggs are the star.
const EGG_DISH_WORDS = ['omelette', 'omelet', 'frittata', 'shakshuka', 'quiche'];

const VEG_MINCE_RE =
  /\b(?:veg(?:gie|etarian|an)?|plant[\s-]?based|beyond|impossible|quorn|soy|lentil)[\s-]+mince\b/i;

// Phrases where a protein word is really a flavouring, not the main protein.
// Stripped before scanning so "vegetable soup with chicken stock" isn't chicken.
const FLAVOUR_PHRASES = [
  /\b(?:chicken|beef|fish|veg(?:etable)?|lamb)\s+(?:stock|broth|bouillon|stock\s+cube|stock\s+powder|consomm[ée]|gravy)\b/gi,
  /\bchicken\s+salt\b/gi,
  /\bfish\s+sauce\b/gi,
  /\boyster\s+sauce\b/gi,
  /\bshrimp\s+paste\b/gi,
  /\banchov(?:y|ies)\b/gi,
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

function ingredientText(ingredients: Ingredient[]): string {
  return (ingredients || [])
    .map(i => [i.name, i.notes].filter(Boolean).join(' '))
    .join('  ');
}

function methodText(steps: string[] | undefined): string {
  return (steps || []).join('  ');
}

function deEggplant(text: string): string {
  return text.replace(/eggplant|aubergine/gi, ' ');
}

/**
 * Infer the primary protein from the title, ingredient list, and method.
 * Title hits are weighted heavily (a dish named "Chicken Tikka" is chicken).
 * Method is scanned at a lower weight so "season the salmon" still counts when
 * the ingredient line is just "4 fillets", without drowning out the title.
 * Returns undefined when nothing confident is found.
 */
export function inferProtein(
  title: string,
  ingredients: Ingredient[],
  steps: string[] = [],
): ProteinType | undefined {
  const titleText = deEggplant(clean(title || ''));
  const ingText = deEggplant(clean(ingredientText(ingredients)));
  const stepText = deEggplant(clean(methodText(steps)));

  const score: Partial<Record<ProteinType, number>> = {};
  (Object.keys(PROTEIN_KEYWORDS) as ProteinType[]).forEach(p => {
    const kws = PROTEIN_KEYWORDS[p];
    if (p === 'pork') {
      const garnish = kws.filter(k => PORK_GARNISH.has(k));
      const primary = kws.filter(k => !PORK_GARNISH.has(k));
      score[p] =
        countMatches(titleText, kws) * 10
        + countMatches(ingText, primary) * 3
        + countMatches(ingText, garnish) * 1
        + countMatches(stepText, primary) * 2
        + countMatches(stepText, garnish) * 1;
    } else {
      score[p] =
        countMatches(titleText, kws) * 10
        + countMatches(ingText, kws) * 3
        + countMatches(stepText, kws) * 2;
    }
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

  // 2. Plain "mince" with no qualifying meat → beef by convention, unless the
  //    mince is clearly plant-based.
  const minceHay = `${titleText} ${ingText} ${stepText}`;
  if (!VEG_MINCE_RE.test(minceHay) && (/\bmince\b/.test(ingText) || /\bmince\b/.test(titleText))) {
    return 'beef';
  }

  // 3. Eggs/dairy only when they're clearly the star (in the title, e.g.
  //    "Spanish omelette", "Paneer butter masala"), to avoid butter/milk/an
  //    egg binder hijacking an otherwise vegetable dish.
  if (EGG_DISH_WORDS.some(w => new RegExp(`\\b${w}s?\\b`, 'i').test(titleText))) return 'eggs';
  for (const p of ['eggs', 'dairy'] as ProteinType[]) {
    if (countMatches(titleText, PROTEIN_KEYWORDS[p]) > 0) return p;
  }
  return undefined;
}

const MEAT_OR_SEA: ProteinType[] = ['chicken', 'beef', 'pork', 'lamb', 'fish', 'seafood'];

type TagHay = 'all' | 'title-method';

// High-precision dish/cuisine/method tags. `title-method` skips ingredient
// lines so "baking powder" and "chicken broth" don't become bake/soup.
const TAG_RULES: Array<{ tag: string; re: RegExp; hay?: TagHay }> = [
  { tag: 'curry',      re: /\b(curry|masala|tikka|korma|vindaloo|rogan|biryani|dahl|dhal)\b/i },
  { tag: 'pasta',      re: /\b(pasta|spaghetti|penne|lasagne|lasagna|fettuccine|macaroni|gnocchi|rigatoni|ravioli)\b/i },
  { tag: 'soup',       re: /\b(soups?|chowder|ramen|pho)\b/i },
  { tag: 'salad',      re: /\bsalad\b/i },
  { tag: 'stir-fry',   re: /\bstir.?fry\b/i },
  { tag: 'roast',      re: /\broast(?:ed)?\b/i, hay: 'title-method' },
  { tag: 'mexican',    re: /\b(taco|burrito|enchilada|quesadilla|fajita|nacho)\b/i },
  { tag: 'pizza',      re: /\bpizza\b/i },
  { tag: 'bake',       re: /\b(bake[ds]?|casserole|gratin)\b/i, hay: 'title-method' },
  { tag: 'rice',       re: /\b(risotto|fried rice|paella|biryani|pilaf)\b/i },
  { tag: 'noodles',    re: /\b(noodle|udon|soba|pad thai|chow mein)\b/i },
  { tag: 'burger',     re: /\bburger\b/i },
  { tag: 'spicy',      re: /\b(?:chillies|chilies|chilli|chili|chiles?|jalape[nñ]os?|cayenne|sriracha|harissa|gochujang|gochugaru|chipotles?|habaneros?|scotch\s+bonnets?|hot\s+(?:sauce|paprika)|peri[\s-]?peri|piri[\s-]?piri|sambal|nduja|aleppo|red\s+pepper\s+flakes|wasabi)\b/i },
  { tag: 'slow-cooker', re: /\b(?:slow[\s-]?cook(?:er|ed|ing)?|crock[\s-]?pots?)\b/i },
  { tag: 'air-fryer',  re: /\bair[\s-]?fry(?:er|ed|ing)?\b/i },
  { tag: 'oven',       re: /\boven\b|\bbake(?:d|s|ing)?\s+at\s+\d/i, hay: 'title-method' },
  { tag: 'grill',      re: /\b(?:grill(?:ed|ing)?|bbq|barbe?cue(?:d|ing)?)\b/i, hay: 'title-method' },
  { tag: 'pressure-cooker', re: /\b(?:pressure[\s-]?cook(?:er|ed|ing)?|instant[\s-]?pots?)\b/i },
  { tag: 'microwave',  re: /\bmicrowave(?:d|able)?\b/i, hay: 'title-method' },
  { tag: 'stovetop',   re: /\b(?:stove[\s-]?tops?|on the hob)\b/i, hay: 'title-method' },
  { tag: 'steam',      re: /\b(?:bamboo\s+steamer|steam(?:er|ed|ing)?\s+(?:for|until|the|in|basket)|steaming\s+basket)\b/i, hay: 'title-method' },
  { tag: 'one-pot',    re: /\bone[\s-]?pots?\b/i },
  { tag: 'sheet-pan',  re: /\b(?:sheet[\s-]?pans?|tray[\s-]?bakes?)\b/i },
];

// Strip phrases that would otherwise fire a tag for the wrong reason.
function stripTagFalseFriends(text: string): string {
  return text
    .replace(/\bno[\s-]?bake\b/gi, ' ')
    .replace(/\bdutch\s+ovens?\b/gi, ' ')
    .replace(/\bbaking\s+(?:powder|soda)\b/gi, ' ');
}

/**
 * Produce a primary protein + tag set for a recipe. Merges with any tags the
 * user already supplied (deduped, lower-cased). Scans title, ingredients, and
 * method. Pure and side-effect free.
 */
export function autoTag(
  title: string,
  ingredients: Ingredient[],
  existingTags: string[] = [],
  steps: string[] = [],
): { primary_protein?: ProteinType; tags: string[] } {
  const protein = inferProtein(title, ingredients, steps);
  const dishHay = stripTagFalseFriends(`${title} ${ingredientText(ingredients)} ${methodText(steps)}`);
  const methodHay = stripTagFalseFriends(`${title} ${methodText(steps)}`);

  const tags = new Set(existingTags.map(t => t.trim().toLowerCase()).filter(Boolean));
  for (const { tag, re, hay } of TAG_RULES) {
    const text = hay === 'title-method' ? methodHay : dishHay;
    if (re.test(text)) tags.add(tag);
  }

  // Vegetarian: confident only when the protein is plant/egg/dairy based AND no
  // meat/seafood keyword appears in title, ingredients, or method (stock/sauce
  // flavouring already stripped).
  const meatHay = clean(`${title} ${ingredientText(ingredients)} ${methodText(steps)}`);
  const hasMeat = MEAT_OR_SEA.some(p => countMatches(meatHay, PROTEIN_KEYWORDS[p]) > 0);
  if (!hasMeat && (protein === 'tofu' || protein === 'legumes' || protein === 'eggs' || protein === 'dairy')) {
    tags.add('vegetarian');
  }

  return { primary_protein: protein, tags: Array.from(tags) };
}
