import type { MealPlan } from './db';
import { plannedOnOf } from './plannerDate';

// A single recipe's original contribution to a merged shopping item. `name` is
// exactly what that recipe wrote ("Large onion, diced"); the merged item keeps
// one of these per contributing line so the UI can show the real wording.
export interface ShoppingContribution {
  name: string;     // raw recipe wording, e.g. "Large onion, diced"
  amount: string;   // formatted amount for this one line, e.g. "1"
  unit: string;
  recipe: string;   // recipe title this line came from
  source_url?: string; // original recipe URL when known at generate time
  // Tick when this wording is shown as its own detached row.
  checked?: boolean;
}

export interface ShoppingItem {
  // Stable unique id assigned at generation time. This — not the name — is the
  // identity used for checking, reordering, overrides and category moves, so
  // recipe-derived and custom items share one identity model.
  id: string;
  // Standardised name: drives the merge key and the category. e.g. "onion".
  name: string;
  // Headline text shown in the UI. For a single-source item this is the recipe's
  // own wording ("Large onion, diced"); for a multi-source merge it's the
  // standardised name ("Onion") and the wordings live in `contributions`.
  displayName: string;
  totalAmount: string;
  unit: string;
  recipes: string[];
  // One entry per contributing recipe line, in original wording. Length 1 for a
  // single-source item; length > 1 when several recipes merged into this item.
  contributions: ShoppingContribution[];
  category: string;
  // Yes/no tick on this line. Who/when is not stored.
  checked: boolean;
  // Hand-typed line (not generated from a recipe). Lives in the same items array.
  custom?: boolean;
}

// Short random id for shopping items (recipe-derived and custom alike).
function genItemId(): string {
  return 'i' + Math.random().toString(36).slice(2, 10);
}

export interface ShoppingCategory {
  name: string;
  emoji: string;
  items: ShoppingItem[];
}

// Supermarket aisle order
export const CATEGORY_ORDER = [
  'Fruit & Veg',
  'Meat & Seafood',
  'Dairy',
  'Pantry',
  'Spices',
];

export const CATEGORY_EMOJI: Record<string, string> = {
  'Fruit & Veg': '🥦',
  'Meat & Seafood': '🥩',
  'Dairy': '🥛',
  'Pantry': '🌾',
  'Spices': '🌿',
};

// ── Categorization ─────────────────────────────────────────────────────────
// Rules are checked top-to-bottom; FIRST match wins.
// Key design decisions:
//   1. Spices is checked BEFORE Pantry so "salt", "pepper", "cumin" etc
//      never fall into Pantry.
//   2. Dried/ground/powder forms of herbs go to Spices, not Fruit & Veg.
//   3. Fresh herbs (whole leaves, bunches) go to Fruit & Veg.
//   4. "pepper" alone → Fruit & Veg (fresh capsicum/chilli); but
//      "black pepper", "white pepper", "ground pepper", "pepper flakes",
//      "peppercorn" → Spices (handled by longer-match-first ordering).

function categorizeIngredient(name: string): string {
  const lower = name.toLowerCase().trim();

  // ── Meat & Seafood ──────────────────────────────────────────────────────
  if (/\b(chicken|beef|pork|lamb|turkey|duck|veal|venison|rabbit|goat|bison)\b/.test(lower)) return 'Meat & Seafood';
  if (/\b(mince|mincemeat|steak|bacon|ham|sausage|salami|prosciutto|pancetta|chorizo|lardons?|speck|bresaola|mortadella|pepperoni)\b/.test(lower)) return 'Meat & Seafood';
  if (/\b(salmon|tuna|cod|prawns?|shrimp|crab|lobster|scallop|mussel|clam|squid|calamari|octopus|oyster|anchov|sardine|tilapia|snapper|barramundi|bream|whiting|flathead|halibut|mackerel|trout|herring)\b/.test(lower)) return 'Meat & Seafood';
  if (/\b(seafood|fish fillet|fish steak|fish cake|fish pie|meatball|rissole|patty|breast|thigh|drumstick|fillet|rib(?:s)?|roast|cutlet|rack of)\b/.test(lower)) return 'Meat & Seafood';

  // ── Dairy ───────────────────────────────────────────────────────────────
  if (/\b(milk|cream|butter|cheese|parmesan|parmigiano|pecorino|mozzarella|cheddar|feta|brie|camembert|ricotta|mascarpone|gruyere|gouda|stilton|haloumi|halloumi|colby|edam|raclette|manchego|cottage cheese|cream cheese)\b/.test(lower)) return 'Dairy';
  if (/\b(yogurt|yoghurt|sour cream|crème fraîche|creme fraiche|fromage frais|kefir|quark|ghee|buttermilk|whipping cream|double cream|single cream|thickened cream|pure cream|evaporated milk|condensed milk|skim milk|full.?cream milk)\b/.test(lower)) return 'Dairy';
  if (/\b(egg|eggs)\b/.test(lower)) return 'Dairy';

  // ── Spices ──────────────────────────────────────────────────────────────
  // Check spices BEFORE Fruit & Veg and Pantry to catch dried/ground forms.
  // Long/specific phrases first, then single-word spices.
  if (/\b(smoked paprika|sweet paprika|hot paprika|chilli powder|chili powder|chilli flakes?|chili flakes?|red pepper flakes?|crushed red pepper|dried chilli|dried chili)\b/.test(lower)) return 'Spices';
  if (/\b(black pepper|white pepper|ground pepper|peppercorn|pink peppercorn|szechuan pepper|sichuan pepper|cayenne pepper|celery salt|garlic powder|garlic salt|onion powder|onion flakes|mustard powder|ground mustard|ground ginger|ground coriander|ground cumin|ground cardamom|ground cinnamon|ground cloves?|ground nutmeg|ground turmeric|ground allspice)\b/.test(lower)) return 'Spices';
  if (/\b(salt|sea salt|kosher salt|table salt|rock salt|pink salt|himalayan salt|fleur de sel|flaky salt)\b/.test(lower)) return 'Spices';
  if (/\b(cumin|turmeric|paprika|cardamom|cinnamon|nutmeg|allspice|cloves?|star anise|bay leaves?|bay leaf|oregano|marjoram|tarragon|sumac|za['\'']?atar|zaatar|five.?spice|mixed spice|garam masala|curry powder|tandoori|ras el hanout|harissa|berbere|dukkah|baharat|jerk seasoning|old bay|cajun|italian seasoning|herbs de provence|herbes de provence|bouquet garni|pickling spice)\b/.test(lower)) return 'Spices';
  if (/\b(dried (basil|thyme|rosemary|sage|mint|parsley|dill|oregano|coriander|tarragon|chives?|marjoram))\b/.test(lower)) return 'Spices';
  if (/\b(vanilla (extract|bean|paste|powder|essence))\b/.test(lower)) return 'Spices';
  // bare spice words — must come after compound phrases above
  if (/\b(paprika|saffron|fenugreek|anise|mace|juniper|caraway|poppy seed|celery seed|fennel seed|mustard seed|coriander seed|cumin seed)\b/.test(lower)) return 'Spices';

  // ── Pantry-priority: modifier words that override any fruit/veg match ──────
  // Check the FORM of the ingredient, not what it came from.
  // "apple cider vinegar" → vinegar → Pantry. "ginger paste" → paste → Pantry.
  // This avoids enumerating every fruit/veg + modifier combination.
  if (/\bvinegar\b/.test(lower)) return 'Pantry';
  if (/\bjuice\b/.test(lower)) return 'Pantry';
  if (/\bzest\b|\brind\b/.test(lower)) return 'Pantry';
  if (/\bpaste\b/.test(lower)) return 'Pantry';
  if (/\bpowder\b/.test(lower)) return 'Spices';
  if (/\bextract\b/.test(lower)) return 'Pantry';
  if (/\bpuree\b|\bpurée\b/.test(lower)) return 'Pantry';
  if (/\bsyrup\b/.test(lower)) return 'Pantry';
  if (/\boil\b/.test(lower)) return 'Pantry';

  // ── Pantry-priority tomatoes (paste/puree/canned) before fresh produce ──
  if (/\b(tomato paste|tomato puree|passata|crushed tomato|diced tomato|tinned tomato|canned tomato|sun.dried tomato|sundried tomato)\b/.test(lower)) return 'Pantry';

  // ── Fruit & Veg ─────────────────────────────────────────────────────────
  // Fresh herbs (whole/bunch) come here — dried forms already caught above.
  if (/\b(onion|garlic|ginger|spring onion|green onion|scallion|shallot|leek|chive)\b/.test(lower)) return 'Fruit & Veg';
  if (/\b(tomato|potato|carrot|celery|broccoli|cauliflower|spinach|kale|lettuce|cabbage|bok choy|pak choi|wombok|silverbeet|chard|rocket|arugula|watercress|radicchio|endive)\b/.test(lower)) return 'Fruit & Veg';
  if (/\b(zucchini|courgette|eggplant|aubergine|capsicum|pepper|chilli|chili|jalapeño|jalapeno|habanero|chipotle)\b/.test(lower)) return 'Fruit & Veg';
  if (/\b(mushroom|asparagus|corn|peas?|green beans?|french beans?|broad beans?|runner beans?|snow peas?|sugar snap|cucumber|avocado|artichoke|broccolini|broccoflower|romanesco)\b/.test(lower)) return 'Fruit & Veg';
  if (/\b(sweet potato|yam|pumpkin|squash|butternut|beetroot|beet|turnip|parsnip|swede|celeriac|kohlrabi|radish|daikon|fennel|witlof|endive)\b/.test(lower)) return 'Fruit & Veg';
  if (/\b(lime|lemon|orange|grapefruit|mandarin|tangerine|clementine|apple|pear|banana|mango|pineapple|papaya|pawpaw|watermelon|rockmelon|honeydew|cantaloupe|melon|grape|cherry|fig|pomegranate|passion.?fruit|kiwi|guava|lychee|rambutan|dragon.?fruit|persimmon|quince)\b/.test(lower)) return 'Fruit & Veg';
  if (/\b(strawberr|blueberr|raspberr|blackberr|boysenberr|gooseberr|currant|cranberr)\b/.test(lower)) return 'Fruit & Veg';
  if (/\b(peach|plum|nectarine|apricot|cherry|damson)\b/.test(lower)) return 'Fruit & Veg';
  // fresh herbs (no "dried" or "ground" prefix)
  if (/\b(basil|parsley|coriander|cilantro|mint|thyme|rosemary|sage|dill|tarragon|chervil|sorrel|lemongrass|kaffir lime|curry leaves?)\b/.test(lower) && !/\bdried\b|\bground\b|\bpowder\b/.test(lower)) return 'Fruit & Veg';

  // ── Pantry ──────────────────────────────────────────────────────────────
  // Everything else that's a shelf-stable ingredient.
  if (/\b(pasta|spaghetti|penne|fettuccine|linguine|rigatoni|tagliatelle|farfalle|fusilli|orzo|lasagne|lasagna|gnocchi|noodle|udon|soba|ramen|vermicelli|rice noodle|glass noodle|egg noodle)\b/.test(lower)) return 'Pantry';
  if (/\b(rice|risotto|arborio|basmati|jasmine|brown rice|wild rice|quinoa|couscous|polenta|bulgur|barley|farro|freekeh|spelt|buckwheat|millet|oats|porridge|granola|muesli|cereal)\b/.test(lower)) return 'Pantry';
  if (/\b(flour|plain flour|self.raising|bread flour|wholemeal|almond flour|almond meal|semolina|cornflour|cornstarch|tapioca|arrowroot|baking powder|baking soda|bicarbonate of soda|bicarb|cream of tartar|yeast|dried yeast|instant yeast)\b/.test(lower)) return 'Pantry';
  if (/\b(sugar|caster sugar|brown sugar|icing sugar|raw sugar|demerara|muscovado|treacle|golden syrup|maple syrup|honey|agave|rice malt syrup|molasses|glucose|corn syrup)\b/.test(lower)) return 'Pantry';
  if (/\b(cocoa|cacao|chocolate|dark chocolate|milk chocolate|white chocolate|carob|nutella)\b/.test(lower)) return 'Pantry';
  if (/\b(coconut milk|coconut cream|coconut water|coconut flakes?|desiccated coconut|shredded coconut)\b/.test(lower)) return 'Pantry';
  if (/\b(olive oil|vegetable oil|canola oil|sunflower oil|coconut oil|sesame oil|peanut oil|avocado oil|truffle oil|grapeseed oil|rice bran oil|cooking spray|lard|shortening|suet)\b/.test(lower)) return 'Pantry';
  if (/\b(vinegar|balsamic|white wine vinegar|red wine vinegar|apple cider vinegar|rice vinegar|sherry vinegar|malt vinegar)\b/.test(lower)) return 'Pantry';
  if (/\b(soy sauce|tamari|fish sauce|oyster sauce|hoisin|worcestershire|hot sauce|tabasco|sriracha|ketchup|tomato sauce|barbecue sauce|bbq sauce|teriyaki|sweet chilli|nam pla|mirin|sake|shaoxing|rice wine)\b/.test(lower)) return 'Pantry';
  if (/\b(mustard|dijon|wholegrain mustard|american mustard|mayonnaise|aioli|relish|chutney|jam|marmalade|miso|tahini|peanut butter|almond butter|cashew butter|nut butter|vegemite|marmite|bovril)\b/.test(lower)) return 'Pantry';
  if (/\b(tomato paste|tomato puree|passata|crushed tomato|diced tomato|tinned tomato|canned tomato|sun.dried tomato|sundried tomato)\b/.test(lower)) return 'Pantry';
  if (/\b(stock|chicken stock|beef stock|vegetable stock|fish stock|broth|bouillon|dashi)\b/.test(lower)) return 'Pantry';
  if (/\b(lentil|chickpea|kidney bean|black bean|cannellini|borlotti|pinto bean|navy bean|split pea|dried pea|red lentil|green lentil|french lentil)\b/.test(lower)) return 'Pantry';
  if (/\b(pine nut|walnut|almond|cashew|pecan|pistachio|hazelnut|macadamia|brazil nut|chestnut|peanut|sesame seed|sunflower seed|pumpkin seed|chia seed|flaxseed|linseeds?|hemp seed|poppy seed)\b/.test(lower)) return 'Pantry';
  if (/\b(raisin|sultana|currant|dried cranberr|dried apricot|dried fig|dried date|prune|dried mango|dried pineapple|goji berr|medjool)\b/.test(lower)) return 'Pantry';
  if (/\b(bread|baguette|sourdough|roll|bun|bagel|pita|flatbread|tortilla|wrap|crumpet|muffin|croissant|brioche|focaccia|naan|breadcrumb|panko|crouton)\b/.test(lower)) return 'Pantry';
  if (/\b(canned|tinned|frozen|ice cream|gelato|sorbet|water|juice|wine|beer|cider|coffee|tea|soda|lemonade|kombucha|tofu|tempeh|seitan|gelatin|gelatine|agar|pectin|rennet)\b/.test(lower)) return 'Pantry';

  return 'Pantry'; // sensible default — unknown things are usually pantry items
}

export { categorizeIngredient };

const UNIT_CONVERSIONS: Record<string, { base: string; factor: number }> = {
  tsp: { base: 'ml', factor: 5 },
  teaspoon: { base: 'ml', factor: 5 },
  teaspoons: { base: 'ml', factor: 5 },
  tbsp: { base: 'ml', factor: 15 },
  tablespoon: { base: 'ml', factor: 15 },
  tablespoons: { base: 'ml', factor: 15 },
  cup: { base: 'ml', factor: 240 },
  cups: { base: 'ml', factor: 240 },
  oz: { base: 'g', factor: 28.35 },
  ounce: { base: 'g', factor: 28.35 },
  ounces: { base: 'g', factor: 28.35 },
  lb: { base: 'g', factor: 453.6 },
  lbs: { base: 'g', factor: 453.6 },
  pound: { base: 'g', factor: 453.6 },
  pounds: { base: 'g', factor: 453.6 },
  kg: { base: 'g', factor: 1000 },
  l: { base: 'ml', factor: 1000 },
  liter: { base: 'ml', factor: 1000 },
  liters: { base: 'ml', factor: 1000 },
  litre: { base: 'ml', factor: 1000 },
  litres: { base: 'ml', factor: 1000 },
};

type GroupedItem = {
  recipes: string[];
  contributions: ShoppingContribution[];
};

// Sum a set of contributions (each with its own amount + unit) into a single
// displayed total, converting volume/weight units to a common base. This is the
// single source of truth for an item's headline amount, so a group that loses a
// detached sub-line — or a detached sub-line shown on its own — both recompute
// consistently from whatever contributions remain.
export function aggregateContributions(contributions: { amount: string; unit: string }[]): { totalAmount: string; unit: string } {
  let totalMl: number | undefined;
  let totalG: number | undefined;
  let totalCount: number | undefined;
  let countUnit = '';

  for (const c of contributions) {
    const amount = parseAmount(c.amount);
    const unit = (c.unit || '').toLowerCase().trim();
    const conversion = UNIT_CONVERSIONS[unit];
    if (conversion) {
      const base = amount * conversion.factor;
      if (conversion.base === 'ml') totalMl = (totalMl || 0) + base;
      else totalG = (totalG || 0) + base;
    } else if (unit === 'g') {
      totalG = (totalG || 0) + amount;
    } else if (unit === 'ml') {
      totalMl = (totalMl || 0) + amount;
    } else {
      totalCount = (totalCount || 0) + amount;
      countUnit = unit || countUnit;
    }
  }

  if (totalG !== undefined) return { totalAmount: formatWeight(totalG), unit: totalG >= 1000 ? 'kg' : 'g' };
  if (totalMl !== undefined) return { totalAmount: formatVolume(totalMl), unit: totalMl >= 1000 ? 'L' : 'ml' };
  return { totalAmount: totalCount ? formatDecimal(totalCount) : '', unit: countUnit || '' };
}

/** One ticked dinner from the generate-list UI (calendar day + recipe). */
export type ShoppingDinnerPick = {
  recipe_id: string;
  planned_on?: string | Date | null;
  week_start?: string | Date | null;
  day_of_week?: unknown;
};

function dinnerPickKey(pick: ShoppingDinnerPick): string {
  if (!pick.recipe_id) return '';
  const on = plannedOnOf(pick);
  return on ? `${on}::${pick.recipe_id}` : '';
}

/**
 * Keep only the dinners the cook ticked.
 * `recipe_ids` + whole weeks is too coarse: the same recipe last week (or later
 * in the same storage week) would otherwise be counted again.
 */
export function mealPlansForSelectedDinners<T extends ShoppingDinnerPick>(
  plans: T[],
  picks: ShoppingDinnerPick[],
): T[] {
  const wanted = new Set<string>();
  for (const pick of picks) {
    const key = dinnerPickKey(pick);
    if (key) wanted.add(key);
  }
  if (!wanted.size) return [];
  return plans.filter(plan => wanted.has(dinnerPickKey(plan)));
}

export function parseShoppingDinnerPicks(raw: unknown): ShoppingDinnerPick[] {
  if (!Array.isArray(raw)) return [];
  const picks: ShoppingDinnerPick[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as {
      recipe_id?: unknown;
      planned_on?: unknown;
      week_start?: unknown;
      day_of_week?: unknown;
    };
    if (typeof row.recipe_id !== 'string' || !row.recipe_id) continue;
    const pick: ShoppingDinnerPick = { recipe_id: row.recipe_id };
    if (typeof row.planned_on === 'string' && row.planned_on) pick.planned_on = row.planned_on;
    if (typeof row.week_start === 'string' && row.week_start) pick.week_start = row.week_start;
    if (row.day_of_week !== undefined) pick.day_of_week = row.day_of_week;
    picks.push(pick);
  }
  return picks;
}

export function generateShoppingList(mealPlans: MealPlan[], categoryOverrides?: Record<string, string>): ShoppingItem[] {
  // Keyed by the STANDARDISED name (what categorisation + merging run on). The
  // raw recipe wording is preserved per-contribution, not in the key.
  const grouped = new Map<string, GroupedItem>();

  for (const plan of mealPlans) {
    if (!plan.recipe) continue;
    const scaleFactor = plan.servings / (plan.recipe.servings || 4);
    const recipeName = plan.recipe.title;

    for (const ingredient of plan.recipe.ingredients ?? []) {
      const key = normalizeIngredientName(ingredient.name);
      if (!key) continue;
      const existing = grouped.get(key) || { recipes: [], contributions: [] };

      if (!existing.recipes.includes(recipeName)) existing.recipes.push(recipeName);

      const amount = parseAmount(ingredient.amount) * scaleFactor;
      const unit = ingredient.unit?.toLowerCase().trim() || '';

      // Record this line's original wording + its own (scaled) amount so the UI
      // can show exactly what the recipe said and totals can be recomputed.
      existing.contributions.push({
        name: cleanDisplayName(ingredient.name),
        amount: formatDecimal(amount),
        unit,
        recipe: recipeName,
        ...(plan.recipe.source_url ? { source_url: plan.recipe.source_url } : {}),
      });

      grouped.set(key, existing);
    }
  }

  const result: ShoppingItem[] = [];
  grouped.forEach((data, name) => {
    // Headline: one distinct wording → show it; several → show the standardised
    // name and let the row expand to the individual wordings.
    const distinctWordings = [...new Set(data.contributions.map(c => c.name).filter(Boolean))];
    const displayName = distinctWordings.length === 1 ? distinctWordings[0] : capitalize(name);
    const { totalAmount, unit } = aggregateContributions(data.contributions);

    result.push({
      id: genItemId(),
      name,                       // standardised
      displayName,
      totalAmount,
      unit,
      recipes: data.recipes,
      contributions: data.contributions,
      category: resolveCategory(name, categoryOverrides),
      checked: false,
    });
  });

  // Sort by category order, then alphabetically by standardised name
  return result.sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a.category);
    const bi = CATEGORY_ORDER.indexOf(b.category);
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name);
  });
}

// Tidy a raw recipe ingredient string for display without standardising it:
// collapse whitespace, drop wrapping punctuation, and capitalise the first
// letter. Keeps size words and prep notes ("Large onion, diced") intact.
function cleanDisplayName(raw: string): string {
  const cleaned = (raw || '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,;.\-]+|[\s,;.\-]+$/g, '')
    .trim();
  return cleaned ? capitalize(cleaned) : cleaned;
}

// Words that, as a leading qualifier, usually don't change what you'd buy, so
// they're dropped for merging ("brown onion" → "onion"). Deliberately
// conservative: "white"/"green" are excluded because they flip meaning for some
// items (white pepper = spice, green onion = distinct), and anything in
// VARIETY_PROTECTED keeps its qualifier.
const VARIETY_WORDS = ['brown', 'red', 'yellow', 'purple', 'golden', 'spanish'];
const VARIETY_PROTECTED = new Set([
  'spring onion', 'green onion', 'sweet potato', 'cherry tomato', 'grape tomato',
  'white pepper', 'red pepper flakes', 'red pepper flake',
]);
// -s endings that are not plurals; never singularise these.
const SINGULAR_IGNORE = new Set(['asparagus', 'hummus', 'couscous', 'molasses', 'watercress', 'swiss', 'bass']);

function singulariseWord(w: string): string {
  if (SINGULAR_IGNORE.has(w)) return w;
  if (/[^aeiou]ies$/.test(w)) return w.replace(/ies$/, 'y');             // berries → berry
  if (/oes$/.test(w)) return w.replace(/oes$/, 'o');                     // tomatoes → tomato
  if (/(ches|shes|sses|xes|zes)$/.test(w)) return w.replace(/es$/, '');  // dishes → dish
  if (/(us|ss|is)$/.test(w)) return w;                                   // hummus, glass, basis
  if (/s$/.test(w) && w.length > 3) return w.replace(/s$/, '');          // onions → onion
  return w;
}

function stripVariety(name: string): string {
  const words = name.split(' ').filter(Boolean);
  if (words.length >= 2 && VARIETY_WORDS.includes(words[0]) && !VARIETY_PROTECTED.has(name)) {
    return words.slice(1).join(' ');
  }
  return name;
}

export function normalizeIngredientName(name: string): string {
  // If the name contains a slash, normalize each part and pick the longest
  // e.g. "cooking/kosher salt" -> "kosher salt" (not just "cooking")
  if (name.includes('/')) {
    const parts = name.split('/').map((p: string) => normalizeIngredientName(p.trim())).filter(Boolean);
    return parts.sort((a: string, b: string) => b.length - a.length)[0] ?? '';
  }
  // Remove parentheticals first, including nested pairs like "((a, b))".
  let stripped = name;
  let prev: string;
  do { prev = stripped; stripped = stripped.replace(/\([^()]*\)/g, ' '); } while (stripped !== prev);

  let out = stripped
    .toLowerCase()
    .replace(/[()]/g, '')       // remove any stray unmatched brackets
    .replace(/,.*$/, '')        // remove anything after a comma
    .replace(/[^a-z0-9\s]/g, '') // strip leftover punctuation
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\d+(?:\.\d+)?\s+/, '') // drop a leading quantity that leaked into the name ("2 onions")
    .replace(/^each\s+/i, '')   // drop a stray leading "each" ("each cumin" → "cumin")
    // Strip adjectives/adverbs that don't change ingredient identity
    .replace(/\b(finely|roughly|coarsely|thinly|thickly|lightly|freshly|well|very|extra|just)\b/gi, '')
    .replace(/\b(fresh|dried|frozen|canned|chopped|diced|sliced|minced|grated|peeled|crushed|pressed|squeezed|zested)\b/gi, '')
    .replace(/\b(ground|cracked|powdered|shredded|crumbled|cubed|halved|quartered|shaved|beaten|sifted|toasted|softened|melted)\b/gi, '')
    .replace(/\b(large|medium|small|whole|boneless|skinless|lean|trimmed|rinsed|drained|packed)\b/gi, '')
    // Drop trailing serving/quantity phrases ("black pepper to taste", "oil for frying")
    .replace(/\b(to taste|for serving|to serve|for garnish|for dusting|for greasing|for frying|plus extra|plus more|as needed|if needed|optional|divided)\b.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  // Singularise each word so plurals merge ("onions" → "onion").
  out = out.split(' ').map(singulariseWord).join(' ').replace(/\s+/g, ' ').trim();
  // Drop a leading colour/variety word unless the compound is meaningfully distinct.
  out = stripVariety(out).trim();
  return out;
}

// Effective category for a normalised name: a user dictionary override wins,
// otherwise fall back to the built-in rule-based categorisation.
export function resolveCategory(normalisedName: string, overrides?: Record<string, string>): string {
  if (overrides && overrides[normalisedName]) return overrides[normalisedName];
  return categorizeIngredient(normalisedName);
}

function parseAmount(amount: string): number {
  if (!amount) return 1;
  const fractionMap: Record<string, number> = { '¼': 0.25, '½': 0.5, '¾': 0.75, '⅓': 0.333, '⅔': 0.667, '⅛': 0.125 };
  let normalized = amount;
  for (const [frac, val] of Object.entries(fractionMap)) normalized = normalized.replace(frac, ` ${val}`);
  const mixedMatch = normalized.match(/(\d+)\s+(\d+)\/(\d+)/);
  if (mixedMatch) return parseInt(mixedMatch[1]) + parseInt(mixedMatch[2]) / parseInt(mixedMatch[3]);
  const fracMatch = normalized.match(/(\d+)\/(\d+)/);
  if (fracMatch) return parseInt(fracMatch[1]) / parseInt(fracMatch[2]);
  const rangeMatch = normalized.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
  if (rangeMatch) return (parseFloat(rangeMatch[1]) + parseFloat(rangeMatch[2])) / 2;
  const num = parseFloat(normalized.match(/[\d.]+/)?.[0] || '1');
  return isNaN(num) ? 1 : num;
}

function formatWeight(g: number): string { return g >= 1000 ? formatDecimal(g / 1000) : formatDecimal(g); }
function formatVolume(ml: number): string { return ml >= 1000 ? formatDecimal(ml / 1000) : formatDecimal(ml); }
function formatDecimal(n: number): string { return n === Math.floor(n) ? String(Math.floor(n)) : n.toFixed(1).replace(/\.0$/, ''); }
function capitalize(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }
