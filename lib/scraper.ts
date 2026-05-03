import * as cheerio from 'cheerio';
import type { Ingredient } from './db';

interface ScrapedRecipe {
  title: string;
  description?: string;
  image_url?: string;
  servings?: number;
  prep_time?: number;
  cook_time?: number;
  ingredients: Ingredient[];
  steps: string[];
}

export async function scrapeRecipe(url: string): Promise<ScrapedRecipe> {
  const response = await fetch(url, {
    headers: {
      // Use a real browser UA — many sites block obvious bot strings
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-AU,en-GB;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // 1. JSON-LD — most reliable when present
  const jsonLd = extractJsonLd($);
  if (jsonLd) return jsonLd;

  // 2. Next.js __NEXT_DATA__ — covers Coles and similar SPAs
  const nextData = extractNextData($);
  if (nextData) return nextData;

  // 3. Microdata (schema.org itemtype attributes)
  const microdata = extractMicrodata($);
  if (microdata) return microdata;

  // 4. Heuristic HTML scraping
  return heuristicScrape($, url);
}

// ── JSON-LD ────────────────────────────────────────────────────────────────

function extractJsonLd($: cheerio.CheerioAPI): ScrapedRecipe | null {
  const scripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < scripts.length; i++) {
    try {
      const raw = $(scripts[i]).html() || '';
      const data = JSON.parse(raw);
      const recipe = findRecipeSchema(data);
      if (recipe) return parseSchemaRecipe(recipe);
    } catch {
      continue;
    }
  }
  return null;
}

function findRecipeSchema(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null;

  // Handle top-level arrays
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findRecipeSchema(item);
      if (found) return found;
    }
    return null;
  }

  const obj = data as Record<string, unknown>;

  // @type can be a string OR an array — handle both
  const type = obj['@type'];
  const isRecipe =
    type === 'Recipe' ||
    (Array.isArray(type) && (type as string[]).some(t => t === 'Recipe'));
  if (isRecipe) return obj;

  // Recurse into @graph
  if (Array.isArray(obj['@graph'])) {
    for (const item of obj['@graph'] as unknown[]) {
      const found = findRecipeSchema(item);
      if (found) return found;
    }
  }

  return null;
}

function parseSchemaRecipe(schema: Record<string, unknown>): ScrapedRecipe {
  const ingredients = parseSchemaIngredients(
    (schema.recipeIngredient as unknown[]) || []
  );
  const steps = parseSchemaSteps(schema.recipeInstructions);

  // Image: string | string[] | { url } | [{ url }]
  let image_url: string | undefined;
  const img = schema.image;
  if (typeof img === 'string') image_url = img;
  else if (Array.isArray(img)) {
    const first = img[0];
    image_url =
      typeof first === 'string'
        ? first
        : (first as Record<string, string>)?.url;
  } else if (img && typeof img === 'object') {
    image_url = (img as Record<string, string>).url;
  }

  const prep_time = parseDuration(schema.prepTime as string | undefined);
  let cook_time = parseDuration(schema.cookTime as string | undefined);

  // Fallback: totalTime - prepTime, or just totalTime
  if (!cook_time) {
    const total = parseDuration(schema.totalTime as string | undefined);
    if (total) cook_time = total - (prep_time || 0) || total;
  }

  return {
    title: String(schema.name || 'Untitled Recipe'),
    description: schema.description
      ? String(schema.description).slice(0, 500)
      : undefined,
    image_url,
    servings: parseServings(schema.recipeYield),
    prep_time,
    cook_time,
    ingredients,
    steps,
  };
}

function parseSchemaIngredients(raw: unknown[]): Ingredient[] {
  const results: Ingredient[] = [];

  for (const item of raw) {
    if (typeof item === 'string') {
      const trimmed = item.trim();
      // Skip bare section headers ("For the batter:", etc.)
      if (!trimmed || (trimmed.endsWith(':') && trimmed.split(' ').length <= 5))
        continue;
      results.push(parseIngredientLine(trimmed));
    } else if (item && typeof item === 'object') {
      // Some schemas wrap ingredients as objects: { "@type": "HowToSupply", "name": "..." }
      const obj = item as Record<string, unknown>;
      const text = String(obj.name || obj.text || (obj as Record<string,string>)['@value'] || '');
      if (text) results.push(parseIngredientLine(text));
    }
  }

  return results.filter(i => i.name.length > 0);
}

function parseSchemaSteps(instructions: unknown): string[] {
  if (!instructions) return [];

  if (typeof instructions === 'string') {
    return instructions.split(/\n+/).filter(s => s.trim().length > 0);
  }

  if (Array.isArray(instructions)) {
    return instructions
      .flatMap((step: unknown) => {
        if (typeof step === 'string') return [step.trim()];
        if (step && typeof step === 'object') {
          const s = step as Record<string, unknown>;
          // HowToSection — recurse into its itemListElement
          if (
            s['@type'] === 'HowToSection' &&
            Array.isArray(s.itemListElement)
          ) {
            return (s.itemListElement as Record<string, unknown>[])
              .map(item => String(item.text || item.name || '').trim())
              .filter(Boolean);
          }
          // HowToStep
          return [String(s.text || s.name || '').trim()];
        }
        return [];
      })
      .filter(s => s.length > 0);
  }

  return [];
}

// ── Next.js __NEXT_DATA__ ──────────────────────────────────────────────────

function extractNextData($: cheerio.CheerioAPI): ScrapedRecipe | null {
  const script = $('#__NEXT_DATA__');
  if (!script.length) return null;

  try {
    const data = JSON.parse(script.html() || '');
    const pageProps = data?.props?.pageProps;
    if (!pageProps) return null;

    // Direct recipe key (many Next.js recipe sites)
    for (const key of ['recipe', 'recipeDetails', 'recipeData']) {
      if (pageProps[key] && typeof pageProps[key] === 'object') {
        const result = parseGenericRecipeObject(pageProps[key]);
        if (result) return result;
      }
    }

    // Nested under data
    if (pageProps.data) {
      for (const key of ['recipe', 'recipeDetails']) {
        if (pageProps.data[key]) {
          const result = parseGenericRecipeObject(pageProps.data[key]);
          if (result) return result;
        }
      }
      // data itself might be the recipe
      const result = parseGenericRecipeObject(pageProps.data);
      if (result) return result;
    }

    // Apollo cache (Coles uses Apollo GraphQL, stores data as "Recipe:<id>": {...})
    if (pageProps.apolloState || pageProps.__APOLLO_STATE__) {
      const cache = pageProps.apolloState || pageProps.__APOLLO_STATE__;
      const recipeEntry = Object.entries(cache as Record<string, unknown>).find(
        ([key]) => key.startsWith('Recipe:') || key.startsWith('recipe:')
      );
      if (recipeEntry) {
        const result = parseGenericRecipeObject(recipeEntry[1] as Record<string, unknown>);
        if (result) return result;
      }
    }

    // Deep search: find any object that looks like a recipe
    return deepFindRecipe(pageProps);
  } catch {
    return null;
  }
}

function parseGenericRecipeObject(obj: Record<string, unknown>): ScrapedRecipe | null {
  if (!obj || typeof obj !== 'object') return null;

  // Must have a title/name and either ingredients or method
  const title =
    String(obj.title || obj.name || obj.heading || '').trim();
  if (!title) return null;

  const hasIngredients =
    Array.isArray(obj.ingredients) ||
    Array.isArray(obj.ingredientGroups) ||
    Array.isArray(obj.recipeIngredient);
  const hasMethod =
    Array.isArray(obj.method) ||
    Array.isArray(obj.instructions) ||
    Array.isArray(obj.steps) ||
    Array.isArray(obj.recipeInstructions) ||
    typeof obj.method === 'string';

  if (!hasIngredients && !hasMethod) return null;

  // Image
  let image_url: string | undefined;
  const imgFields = [obj.image, obj.images, obj.heroImage, obj.thumbnail, obj.photo];
  for (const imgVal of imgFields) {
    if (!imgVal) continue;
    if (typeof imgVal === 'string') { image_url = imgVal; break; }
    if (Array.isArray(imgVal) && imgVal.length > 0) {
      const first = imgVal[0];
      image_url =
        typeof first === 'string'
          ? first
          : ((first as Record<string, string>)?.url ||
             (first as Record<string, string>)?.src ||
             (first as Record<string, string>)?.uri);
      if (image_url) break;
    }
    if (typeof imgVal === 'object') {
      const io = imgVal as Record<string, string>;
      image_url = io.url || io.src || io.uri || io.href;
      if (image_url) break;
    }
  }

  // Servings
  const servings = parseServings(
    obj.servings ?? obj.serves ?? obj.yield ?? obj.recipeYield
  );

  // Times — handle ISO durations, plain numbers (minutes), or strings like "30 mins"
  const prep_time = parseTimeValue(
    obj.preparationTime ?? obj.prepTime ?? obj.prep_time
  );
  let cook_time = parseTimeValue(
    obj.cookingTime ?? obj.cookTime ?? obj.cook_time
  );
  if (!cook_time) {
    const total = parseTimeValue(obj.totalTime ?? obj.total_time ?? obj.cookTotalTime);
    if (total) cook_time = total - (prep_time || 0) || total;
  }

  // Ingredients
  const ingredients: Ingredient[] = [];
  const rawIng =
    obj.recipeIngredient ||
    obj.ingredientGroups ||
    obj.ingredients ||
    [];

  if (Array.isArray(rawIng)) {
    for (const item of rawIng) {
      if (!item) continue;
      if (typeof item === 'string') {
        const t = item.trim();
        if (t && !(t.endsWith(':') && t.split(' ').length <= 5))
          ingredients.push(parseIngredientLine(t));
      } else if (typeof item === 'object') {
        const io = item as Record<string, unknown>;
        // Ingredient group: { heading/title, ingredients: [...] }
        if (Array.isArray(io.ingredients)) {
          for (const sub of io.ingredients as unknown[]) {
            const text = extractIngredientText(sub);
            if (text) ingredients.push(parseIngredientLine(text));
          }
        } else {
          const text = extractIngredientText(io);
          if (text) ingredients.push(parseIngredientLine(text));
        }
      }
    }
  }

  // Steps
  const steps: string[] = [];
  const rawSteps =
    obj.recipeInstructions ||
    obj.method ||
    obj.instructions ||
    obj.steps ||
    obj.directions ||
    [];

  if (typeof rawSteps === 'string') {
    steps.push(...rawSteps.split(/\n+/).filter(s => s.trim().length > 5));
  } else if (Array.isArray(rawSteps)) {
    for (const step of rawSteps) {
      if (!step) continue;
      if (typeof step === 'string') {
        if (step.trim().length > 5) steps.push(step.trim());
      } else if (typeof step === 'object') {
        const so = step as Record<string, unknown>;
        // HowToSection
        if (Array.isArray(so.itemListElement)) {
          for (const sub of so.itemListElement as Record<string, unknown>[]) {
            const t = String(sub.text || sub.name || '').trim();
            if (t.length > 5) steps.push(t);
          }
        } else {
          // Coles uses { description: "..." } or { text: "..." }
          const text = String(
            so.description || so.text || so.instruction || so.step || so.name || ''
          ).trim();
          if (text.length > 5) steps.push(text);
        }
      }
    }
  }

  return {
    title,
    description: String(
      obj.description || obj.subtitle || obj.intro || ''
    ).slice(0, 500) || undefined,
    image_url,
    servings,
    prep_time,
    cook_time,
    ingredients,
    steps,
  };
}

function extractIngredientText(item: unknown): string {
  if (typeof item === 'string') return item.trim();
  if (!item || typeof item !== 'object') return '';
  const o = item as Record<string, unknown>;
  return String(
    o.text || o.name || o.ingredient || o.description || o.label || ''
  ).trim();
}

// Depth-limited recursive search for recipe-looking objects
function deepFindRecipe(
  obj: unknown,
  depth = 0
): ScrapedRecipe | null {
  if (depth > 6 || !obj || typeof obj !== 'object') return null;

  if (!Array.isArray(obj)) {
    const result = parseGenericRecipeObject(obj as Record<string, unknown>);
    if (result && result.ingredients.length > 0) return result;
  }

  const entries = Array.isArray(obj)
    ? obj.entries()
    : Object.values(obj as Record<string, unknown>).entries();

  for (const [, val] of entries) {
    if (val && typeof val === 'object') {
      const result = deepFindRecipe(val, depth + 1);
      if (result) return result;
    }
  }

  return null;
}

// ── Microdata ──────────────────────────────────────────────────────────────

function extractMicrodata($: cheerio.CheerioAPI): ScrapedRecipe | null {
  const recipeEl = $('[itemtype*="schema.org/Recipe"]').first();
  if (!recipeEl.length) return null;

  const getProp = (name: string) =>
    recipeEl
      .find(`[itemprop="${name}"]`)
      .first()
      .attr('content') ||
    recipeEl.find(`[itemprop="${name}"]`).first().text().trim();

  const title = getProp('name') || $('h1').first().text().trim();
  if (!title) return null;

  const ingredients: Ingredient[] = [];
  recipeEl.find('[itemprop="recipeIngredient"]').each((_, el) => {
    const text = ($(el).attr('content') || $(el).text()).trim();
    if (text) ingredients.push(parseIngredientLine(text));
  });

  const steps: string[] = [];
  recipeEl.find('[itemprop="recipeInstructions"]').each((_, el) => {
    const text = ($(el).attr('content') || $(el).text()).trim();
    if (text.length > 5) steps.push(text);
  });

  const image_url =
    recipeEl.find('[itemprop="image"]').attr('src') ||
    recipeEl.find('[itemprop="image"]').attr('content');

  const prep_time = parseDuration(
    recipeEl.find('[itemprop="prepTime"]').attr('content')
  );
  const cook_time = parseDuration(
    recipeEl.find('[itemprop="cookTime"]').attr('content') ||
    recipeEl.find('[itemprop="totalTime"]').attr('content')
  );

  return {
    title,
    description: getProp('description')?.slice(0, 500),
    image_url,
    servings: parseServings(getProp('recipeYield')),
    prep_time,
    cook_time,
    ingredients,
    steps,
  };
}

// ── Heuristic fallback ─────────────────────────────────────────────────────

function heuristicScrape($: cheerio.CheerioAPI, url: string): ScrapedRecipe {
  const title =
    $('h1').first().text().trim() ||
    $('meta[property="og:title"]').attr('content') ||
    $('title').text().trim() ||
    'Untitled Recipe';

  const description =
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="description"]').attr('content');

  const image_url = $('meta[property="og:image"]').attr('content');

  // Ingredients — try common selectors in priority order
  const ingredients: Ingredient[] = [];
  const ingSelectors = [
    '[class*="ingredient"] li',
    '[id*="ingredient"] li',
    '[class*="Ingredient"] li',
    '.ingredients li',
    '.recipe-ingredients li',
    '[data-ingredient]',
    '[class*="ingredient-item"]',
    '[class*="IngredientItem"]',
  ];
  for (const sel of ingSelectors) {
    const items = $(sel);
    if (items.length >= 2) {
      items.each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length < 200)
          ingredients.push(parseIngredientLine(text));
      });
      break;
    }
  }

  // Steps
  const steps: string[] = [];
  const stepSelectors = [
    '[class*="instruction"] li',
    '[class*="Instruction"] li',
    '[class*="direction"] li',
    '[class*="Direction"] li',
    '[class*="step"] li',
    '[class*="Step"] li',
    '.method li',
    '.recipe-method li',
    '[class*="method"] li',
    '[class*="Method"] li',
  ];
  for (const sel of stepSelectors) {
    const items = $(sel);
    if (items.length >= 1) {
      items.each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 10) steps.push(text);
      });
      break;
    }
  }

  return {
    title,
    description: description?.slice(0, 500),
    image_url,
    ingredients,
    steps,
  };
}

// ── Ingredient line parser ─────────────────────────────────────────────────

function parseIngredientLine(line: string): Ingredient {
  const cleaned = line.trim().replace(/\s+/g, ' ');

  const match = cleaned.match(
    /^([\d\s¼½¾⅓⅔⅛⅜⅝⅞\/\-\.]+)?\s*(cups?|tbsp?|tsp?|tablespoons?|teaspoons?|oz|ounces?|lbs?|pounds?|g|grams?|kg|kilograms?|ml|liters?|litres?|l|cloves?|cans?|packages?|pkgs?|pinch(?:es)?|handful(?:s)?|bunch(?:es)?|slices?|pieces?|inches?|cm|large|medium|small|whole)?\s*(.+)/i
  );

  if (match) {
    return {
      amount: (match[1] || '').trim(),
      unit: (match[2] || '').trim(),
      name: (match[3] || cleaned).trim(),
    };
  }

  return { amount: '', unit: '', name: cleaned };
}

// ── Duration helpers ───────────────────────────────────────────────────────

function parseDuration(iso: string | undefined): number | undefined {
  if (!iso) return undefined;
  if (typeof iso !== 'string') return undefined;

  // ISO 8601: PT30M, PT1H30M, P0DT30M
  const match = iso.match(/PT?(?:(\d+)H)?(?:(\d+)M)?/);
  if (match && (match[1] || match[2])) {
    return (parseInt(match[1] || '0') * 60) + parseInt(match[2] || '0');
  }

  // Plain number string
  const plain = parseInt(iso);
  if (!isNaN(plain)) return plain;

  return undefined;
}

function parseTimeValue(val: unknown): number | undefined {
  if (!val) return undefined;
  if (typeof val === 'number') return Math.round(val); // already minutes
  if (typeof val === 'string') {
    // ISO duration
    if (val.includes('PT') || val.startsWith('P')) return parseDuration(val);
    // "30 mins", "1 hour", "1 hr 30 min"
    const hrMatch = val.match(/(\d+)\s*h/i);
    const minMatch = val.match(/(\d+)\s*m/i);
    if (hrMatch || minMatch) {
      return (parseInt(hrMatch?.[1] || '0') * 60) + parseInt(minMatch?.[1] || '0');
    }
    // Plain number
    const n = parseInt(val);
    if (!isNaN(n)) return n;
  }
  return undefined;
}

function parseServings(yld: unknown): number | undefined {
  if (!yld) return undefined;
  if (typeof yld === 'number') return Math.round(yld);
  if (typeof yld === 'string') {
    const match = yld.match(/\d+/);
    return match ? parseInt(match[0]) : undefined;
  }
  if (Array.isArray(yld)) return parseServings(yld[0]);
  return undefined;
}
