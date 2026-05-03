import type { MealPlan } from './db';

export interface ShoppingItem {
  name: string;
  totalAmount: string;
  unit: string;
  recipes: string[];
  category: string;
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
  totalMl?: number;
  totalG?: number;
  totalCount?: number;
  unit: string;
  recipes: string[];
};

export function generateShoppingList(mealPlans: MealPlan[]): ShoppingItem[] {
  const grouped = new Map<string, GroupedItem>();

  for (const plan of mealPlans) {
    if (!plan.recipe) continue;
    const scaleFactor = plan.servings / (plan.recipe.servings || 4);
    const recipeName = plan.recipe.title;

    for (const ingredient of plan.recipe.ingredients) {
      const key = normalizeIngredientName(ingredient.name);
      const existing = grouped.get(key) || { unit: ingredient.unit, recipes: [] };

      if (!existing.recipes.includes(recipeName)) existing.recipes.push(recipeName);

      const amount = parseAmount(ingredient.amount) * scaleFactor;
      const unit = ingredient.unit?.toLowerCase().trim() || '';
      const conversion = UNIT_CONVERSIONS[unit];

      if (conversion) {
        const base = amount * conversion.factor;
        if (conversion.base === 'ml') existing.totalMl = (existing.totalMl || 0) + base;
        else existing.totalG = (existing.totalG || 0) + base;
      } else if (unit === 'g') {
        existing.totalG = (existing.totalG || 0) + amount;
      } else if (unit === 'ml') {
        existing.totalMl = (existing.totalMl || 0) + amount;
      } else {
        existing.totalCount = (existing.totalCount || 0) + amount;
        existing.unit = unit || existing.unit;
      }
      grouped.set(key, existing);
    }
  }

  const result: ShoppingItem[] = [];
  grouped.forEach((data, name) => {
    const displayName = capitalize(name);
    if (data.totalG !== undefined) {
      result.push({ name: displayName, totalAmount: formatWeight(data.totalG), unit: data.totalG >= 1000 ? 'kg' : 'g', recipes: data.recipes, category: categorizeIngredient(name) });
    } else if (data.totalMl !== undefined) {
      result.push({ name: displayName, totalAmount: formatVolume(data.totalMl), unit: data.totalMl >= 1000 ? 'L' : 'ml', recipes: data.recipes, category: categorizeIngredient(name) });
    } else {
      result.push({ name: displayName, totalAmount: data.totalCount ? formatDecimal(data.totalCount) : '', unit: data.unit || '', recipes: data.recipes, category: categorizeIngredient(name) });
    }
  });

  // Sort by category order, then alphabetically within category
  return result.sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a.category);
    const bi = CATEGORY_ORDER.indexOf(b.category);
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name);
  });
}

function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/,.*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b(fresh|dried|frozen|canned|chopped|diced|sliced|minced|grated|peeled|large|medium|small|whole|boneless|skinless)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
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
