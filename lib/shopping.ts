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
  'Meat & Seafood',
  'Dairy & Eggs',
  'Fresh Produce',
  'Bakery & Bread',
  'Pantry & Dry Goods',
  'Canned & Jarred',
  'Sauces & Condiments',
  'Oils & Vinegars',
  'Spices & Herbs',
  'Frozen',
  'Drinks & Beverages',
  'Other',
];

export const CATEGORY_EMOJI: Record<string, string> = {
  'Meat & Seafood': '🥩',
  'Dairy & Eggs': '🥛',
  'Fresh Produce': '🥦',
  'Bakery & Bread': '🍞',
  'Pantry & Dry Goods': '🌾',
  'Canned & Jarred': '🥫',
  'Sauces & Condiments': '🫙',
  'Oils & Vinegars': '🫒',
  'Spices & Herbs': '🌿',
  'Frozen': '🧊',
  'Drinks & Beverages': '🧃',
  'Other': '🛒',
};

// Keyword → category mapping (checked in order, first match wins)
const CATEGORY_RULES: Array<{ category: string; keywords: string[] }> = [
  {
    category: 'Meat & Seafood',
    keywords: [
      'chicken', 'beef', 'pork', 'lamb', 'turkey', 'duck', 'veal', 'mince', 'mincemeat',
      'steak', 'bacon', 'ham', 'sausage', 'salami', 'prosciutto', 'pancetta', 'chorizo',
      'salmon', 'tuna', 'cod', 'prawns', 'shrimp', 'fish', 'seafood', 'scallop', 'mussel',
      'crab', 'lobster', 'anchovy', 'sardine', 'tilapia', 'snapper', 'barramundi',
      'breast', 'thigh', 'drumstick', 'fillet', 'rib', 'roast', 'cutlet', 'rack',
    ],
  },
  {
    category: 'Dairy & Eggs',
    keywords: [
      'milk', 'cream', 'butter', 'cheese', 'parmesan', 'mozzarella', 'cheddar', 'feta',
      'brie', 'camembert', 'ricotta', 'mascarpone', 'gruyere', 'gouda', 'stilton',
      'yogurt', 'yoghurt', 'sour cream', 'crème fraîche', 'creme fraiche',
      'egg', 'eggs', 'ghee', 'half and half', 'buttermilk', 'kefir', 'whipping cream',
      'double cream', 'single cream', 'evaporated milk', 'condensed milk',
    ],
  },
  {
    category: 'Fresh Produce',
    keywords: [
      'onion', 'garlic', 'ginger', 'tomato', 'potato', 'carrot', 'celery', 'leek',
      'broccoli', 'cauliflower', 'spinach', 'kale', 'lettuce', 'cabbage', 'bok choy',
      'zucchini', 'courgette', 'eggplant', 'aubergine', 'capsicum', 'pepper', 'chilli', 'chili',
      'mushroom', 'asparagus', 'corn', 'peas', 'beans', 'cucumber', 'avocado', 'lime',
      'lemon', 'orange', 'apple', 'banana', 'mango', 'pear', 'grape', 'strawberry',
      'blueberry', 'raspberry', 'pineapple', 'watermelon', 'melon', 'peach', 'plum',
      'herbs', 'basil', 'parsley', 'coriander', 'cilantro', 'mint', 'thyme', 'rosemary',
      'sage', 'dill', 'chive', 'spring onion', 'shallot', 'fennel', 'rocket', 'arugula',
      'silverbeet', 'chard', 'beetroot', 'beet', 'turnip', 'parsnip', 'swede', 'pumpkin',
      'squash', 'sweet potato', 'yam', 'radish', 'artichoke',
    ],
  },
  {
    category: 'Bakery & Bread',
    keywords: [
      'bread', 'baguette', 'sourdough', 'roll', 'bun', 'bagel', 'pita', 'flatbread',
      'tortilla', 'wrap', 'crumpet', 'muffin', 'croissant', 'brioche', 'focaccia',
      'naan', 'breadcrumb', 'crouton',
    ],
  },
  {
    category: 'Pantry & Dry Goods',
    keywords: [
      'pasta', 'spaghetti', 'penne', 'fettuccine', 'linguine', 'rigatoni', 'tagliatelle',
      'rice', 'risotto', 'arborio', 'basmati', 'jasmine', 'quinoa', 'couscous', 'polenta',
      'flour', 'sugar', 'salt', 'pepper', 'baking powder', 'baking soda', 'bicarbonate',
      'yeast', 'oats', 'cereal', 'granola', 'muesli', 'lentil', 'chickpea', 'lentils',
      'chickpeas', 'bean', 'split pea', 'noodle', 'udon', 'soba', 'ramen', 'vermicelli',
      'lasagne', 'lasagna', 'gnocchi', 'breadcrumbs', 'panko', 'cornstarch', 'cornflour',
      'almond meal', 'semolina', 'polenta', 'cocoa', 'chocolate', 'vanilla', 'coconut',
      'desiccated', 'pine nut', 'walnut', 'almond', 'cashew', 'pecan', 'pistachio', 'hazelnut',
      'sesame', 'sunflower seed', 'pumpkin seed', 'chia', 'flaxseed', 'dried fruit',
      'raisin', 'sultana', 'cranberry', 'apricot', 'date', 'prune',
    ],
  },
  {
    category: 'Canned & Jarred',
    keywords: [
      'canned', 'tinned', 'can of', 'tin of', 'diced tomato', 'crushed tomato',
      'tomato paste', 'tomato puree', 'coconut milk', 'coconut cream',
      'stock', 'broth', 'bouillon', 'chickpea', 'kidney bean', 'black bean',
      'lentil', 'corn', 'tuna', 'sardine', 'anchovy', 'olive', 'caper',
      'artichoke heart', 'roasted pepper', 'sun-dried tomato', 'sundried tomato',
      'passata', 'polenta tube',
    ],
  },
  {
    category: 'Sauces & Condiments',
    keywords: [
      'soy sauce', 'tamari', 'fish sauce', 'oyster sauce', 'hoisin', 'worcestershire',
      'hot sauce', 'tabasco', 'sriracha', 'ketchup', 'mustard', 'mayonnaise', 'aioli',
      'relish', 'chutney', 'jam', 'honey', 'maple syrup', 'molasses', 'miso',
      'tahini', 'peanut butter', 'almond butter', 'vegemite', 'marmite',
      'teriyaki', 'sweet chilli', 'barbecue sauce', 'bbq sauce', 'nam pla',
      'rice wine', 'mirin', 'shaoxing', 'sake', 'vinegar', 'balsamic',
    ],
  },
  {
    category: 'Oils & Vinegars',
    keywords: [
      'olive oil', 'vegetable oil', 'canola oil', 'sunflower oil', 'coconut oil',
      'sesame oil', 'peanut oil', 'avocado oil', 'truffle oil', 'cooking spray',
      'lard', 'shortening', 'white vinegar', 'red wine vinegar', 'apple cider vinegar',
      'rice vinegar', 'balsamic vinegar', 'sherry vinegar',
    ],
  },
  {
    category: 'Spices & Herbs',
    keywords: [
      'cumin', 'coriander', 'turmeric', 'paprika', 'smoked paprika', 'cayenne',
      'chilli powder', 'chili powder', 'curry', 'garam masala', 'cardamom', 'cinnamon',
      'nutmeg', 'clove', 'allspice', 'star anise', 'bay leaf', 'oregano', 'thyme',
      'rosemary', 'sage', 'tarragon', 'marjoram', 'sumac', 'za\'atar', 'five spice',
      'mixed spice', 'dried chilli', 'chilli flake', 'red pepper flake',
      'white pepper', 'black pepper', 'sea salt', 'kosher salt', 'onion powder',
      'garlic powder', 'celery salt', 'mustard powder', 'ground ginger',
    ],
  },
  {
    category: 'Frozen',
    keywords: [
      'frozen', 'ice cream', 'gelato', 'sorbet', 'frozen peas', 'frozen corn',
      'frozen spinach', 'frozen berries', 'frozen fish', 'frozen chicken',
    ],
  },
  {
    category: 'Drinks & Beverages',
    keywords: [
      'water', 'sparkling water', 'juice', 'wine', 'beer', 'cider', 'spirits',
      'coffee', 'tea', 'milk', 'soda', 'lemonade', 'kombucha', 'coconut water',
    ],
  },
];

export function categorizeIngredient(name: string): string {
  const lower = name.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    for (const keyword of rule.keywords) {
      if (lower.includes(keyword)) return rule.category;
    }
  }
  return 'Other';
}

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
