import * as cheerio from 'cheerio';
import dns from 'dns/promises';
import net from 'net';
import type { Ingredient } from './db';
import { decodeHtmlEntities } from './htmlEntities';
import {
  cleanGroupHeading,
  ingredientGroupHeading,
  isOverallIngredientsTitle,
  mergeGroupedIngredients,
} from './ingredientGroups';
import {
  parseLeadingAmount,
  splitGluedUnits,
  stripAlternateMeasurement,
  stripHyphenBeforeUnit,
} from './ingredientAmount';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 5;

// ── SSRF protection ──────────────────────────────────────────────────────────
// The scrape endpoint fetches a user-supplied URL server-side, so we must stop
// it being pointed at internal/cloud-metadata addresses. We allow only http(s),
// block private/reserved IP ranges, and re-validate on every redirect hop.

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const p = ip.split('.').map(Number);
    if (p[0] === 0 || p[0] === 10 || p[0] === 127) return true;
    if (p[0] === 169 && p[1] === 254) return true;              // link-local + 169.254.169.254 metadata
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;  // 172.16/12
    if (p[0] === 192 && p[1] === 168) return true;              // 192.168/16
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true; // 100.64/10 CGNAT
    return false;
  }
  const lower = ip.toLowerCase().replace(/^\[|\]$/g, '');
  if (lower === '::1' || lower === '::') return true;           // loopback / unspecified
  if (lower.startsWith('fe80')) return true;                   // link-local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique-local
  if (lower.startsWith('::ffff:')) return isPrivateIp(lower.slice(7)); // v4-mapped
  return false;
}

async function assertSafeUrl(raw: string): Promise<URL> {
  let u: URL;
  try { u = new URL(raw); } catch { throw new Error('Invalid URL'); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('Only http(s) URLs can be imported');
  }
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.localhost')) {
    throw new Error('That host is not allowed');
  }
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error('That address is not allowed');
    return u;
  }
  let addrs: string[];
  try {
    addrs = (await dns.lookup(host, { all: true })).map(a => a.address);
  } catch {
    throw new Error('Could not resolve that host');
  }
  if (addrs.length === 0 || addrs.some(isPrivateIp)) {
    throw new Error('That host resolves to a private address');
  }
  return u;
}

// Fetch with a timeout, following redirects manually so each hop is re-checked
// against the SSRF rules (a public URL could otherwise 302 to an internal one).
async function safeFetch(rawUrl: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    let url = (await assertSafeUrl(rawUrl)).toString();
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const res = await fetch(url, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-AU,en-GB;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache',
        },
      });
      if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
        const next = new URL(res.headers.get('location') as string, url);
        url = (await assertSafeUrl(next.toString())).toString();
        continue;
      }
      return res;
    }
    throw new Error('Too many redirects');
  } finally {
    clearTimeout(timer);
  }
}

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
  const response = await safeFetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // JSON-LD, then Next.js data, then microdata, then HTML heuristics.
  // Grouped subheadings (a sauce, a spice mix) are read from the page HTML
  // afterwards — schema.org's ingredient list is flat and usually drops them.
  const recipe =
    extractJsonLd($) ||
    extractNextData($) ||
    extractMicrodata($) ||
    heuristicScrape($, url);

  return decodeScrapedRecipe({
    ...recipe,
    ingredients: applyHtmlGroups($, recipe.ingredients),
  });
}

function decodeScrapedRecipe(recipe: ScrapedRecipe): ScrapedRecipe {
  return {
    ...recipe,
    title: decodeHtmlEntities(recipe.title),
    description: recipe.description ? decodeHtmlEntities(recipe.description) : undefined,
    steps: recipe.steps.map(step => decodeHtmlEntities(step)),
    ingredients: recipe.ingredients.map(ing => ({
      ...ing,
      amount: decodeHtmlEntities(ing.amount),
      unit: decodeHtmlEntities(ing.unit),
      name: decodeHtmlEntities(ing.name),
      ...(ing.notes ? { notes: decodeHtmlEntities(ing.notes) } : {}),
      ...(ing.group ? { group: decodeHtmlEntities(ing.group) } : {}),
    })),
  };
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
  const ingredients = schemaIngredients(schema.recipeIngredient);
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

function nestedIngredientEntries(obj: Record<string, unknown>): unknown[] | null {
  for (const key of ['itemListElement', 'ingredients', 'items']) {
    if (Array.isArray(obj[key])) return obj[key] as unknown[];
  }
  return null;
}

function schemaNodeText(item: unknown): string {
  if (typeof item === 'string') return item.trim();
  if (!item || typeof item !== 'object') return '';
  const obj = item as Record<string, unknown>;
  if (typeof obj.text === 'string' && obj.text.trim()) return obj.text.trim();
  if (typeof obj.item === 'string' && obj.item.trim()) return obj.item.trim();
  if (obj.item && typeof obj.item === 'object') return schemaNodeText(obj.item);
  const named = obj.name || obj.ingredient || obj.description || obj.label || obj['@value'];
  return typeof named === 'string' ? named.trim() : '';
}

function explicitGroupLabel(obj: Record<string, unknown>): string | undefined {
  for (const key of ['heading', 'title', 'group', 'purpose', 'name']) {
    const val = obj[key];
    if (typeof val !== 'string' || !val.trim()) continue;
    const cleaned = cleanGroupHeading(decodeHtmlEntities(val));
    if (cleaned) return cleaned;
  }
  return undefined;
}

/** Ingredients from schema.org, Next.js data, or `{ heading, ingredients }` groups. */
export function schemaIngredients(raw: unknown): Ingredient[] {
  if (!Array.isArray(raw)) return [];
  const results: Ingredient[] = [];
  let group: string | undefined;

  const pushText = (text: string, forced?: string) => {
    const trimmed = decodeHtmlEntities(text).trim();
    if (!trimmed) return;
    const heading = ingredientGroupHeading(trimmed);
    if (heading) {
      group = heading;
      return;
    }
    // A short leftover label ("Batter:") that isn't a usable heading.
    if (trimmed.endsWith(':') && trimmed.split(/\s+/).length <= 6) return;
    const ing = parseIngredientLine(trimmed);
    if (!ing.name) return;
    const headingName = forced || group;
    results.push(headingName ? { ...ing, group: headingName } : ing);
  };

  const walk = (item: unknown, forced?: string) => {
    if (typeof item === 'string') {
      pushText(item, forced);
      return;
    }
    if (!item || typeof item !== 'object') return;
    const obj = item as Record<string, unknown>;
    const nested = nestedIngredientEntries(obj);
    if (nested) {
      const heading = explicitGroupLabel(obj) || forced;
      for (const sub of nested) walk(sub, heading);
      return;
    }
    const text = schemaNodeText(obj);
    if (text) pushText(text, forced);
  };

  for (const item of raw) walk(item);
  return results;
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

  // Prefer a grouped list when the page has one, and keep schema wording
  // when the flat list is the same length.
  const fromGroups = Array.isArray(obj.ingredientGroups)
    ? schemaIngredients(obj.ingredientGroups)
    : [];
  const fromFlat = schemaIngredients(
    (Array.isArray(obj.recipeIngredient) && obj.recipeIngredient) ||
    (Array.isArray(obj.ingredients) && obj.ingredients) ||
    [],
  );
  const ingredients = mergeGroupedIngredients(fromFlat, fromGroups, true);

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

// ── HTML ingredient groups ─────────────────────────────────────────────────
// schema.org recipeIngredient is a flat list and usually omits subheadings
// ("Chili Spice Mix", "Celeriac Puree"). Those live in the page markup.

const GROUP_CONTAINERS = [
  '.wprm-recipe-ingredients-container',
  '.recipe-checklist',
  '.tasty-recipes-ingredients',
  '.tasty-recipe-ingredients',
  '.mv-create-ingredients',
];

interface HtmlGroup {
  heading: string | null;
  lines: string[];
}

function elementVisible($: cheerio.CheerioAPI, el: unknown): boolean {
  const node = $(el as never);
  const style = node.attr('style') || '';
  if (/display\s*:\s*none/i.test(style)) return false;
  if (node.attr('hidden') !== undefined) return false;
  if (node.attr('aria-hidden') === 'true') return false;
  return true;
}

function strippedText($: cheerio.CheerioAPI, el: unknown, removeSelector?: string): string {
  const $el = $(el as never).clone();
  if (removeSelector) $el.find(removeSelector).remove();
  $el.find('.sr-only, .screen-reader-text, [class*="screen-reader"], [class*="sr-only"]').remove();
  $el.find('input, button, script, style').remove();
  return decodeHtmlEntities($el.text().replace(/\s+/g, ' ').trim());
}

function chooseItemSelector($: cheerio.CheerioAPI, container: ReturnType<cheerio.CheerioAPI>): string | null {
  if (container.find('.wprm-recipe-ingredient').length > 0) return '.wprm-recipe-ingredient';
  if (container.find('.recipe-checklist__label').length > 0) return '.recipe-checklist__label';
  if (container.find('li').length >= 2) return 'li';
  return null;
}

function looksLikeIngredientBlock($: cheerio.CheerioAPI, container: ReturnType<cheerio.CheerioAPI>): boolean {
  const cls = `${container.attr('class') || ''} ${container.attr('id') || ''}`;
  if (/ingredient/i.test(cls)) return true;
  if (isOverallIngredientsTitle(container.find('h1, h2, h3').first().text())) return true;
  return container.find('.wprm-recipe-ingredient, .recipe-checklist__label').length > 0;
}

function isGroupHeadingEl($: cheerio.CheerioAPI, el: unknown, itemSelector: string): boolean {
  const node = $(el as never);
  if (node.is(itemSelector)) return false;
  const tag = String(node.prop('tagName') || '').toLowerCase();
  if (/^h[2-6]$/.test(tag)) return true;
  const cls = node.attr('class') || '';
  return /group-name|group-header|ingredient-heading/i.test(cls) && node.find(itemSelector).length === 0;
}

function groupsInContainer($: cheerio.CheerioAPI, container: ReturnType<cheerio.CheerioAPI>): HtmlGroup[] | null {
  const itemSelector = chooseItemSelector($, container);
  if (!itemSelector) return null;
  const headingSelector = 'h2, h3, h4, h5, h6, [class*="group-name"], [class*="group-header"], [class*="ingredient-heading"]';
  const drafts: HtmlGroup[] = [];
  let current: HtmlGroup | null = null;

  container.find(`${headingSelector}, ${itemSelector}`).each((_, el) => {
    const node = $(el);
    if (node.parents(itemSelector).length > 0) return;
    if (isGroupHeadingEl($, el, itemSelector)) {
      const raw = strippedText($, el, itemSelector);
      if (isOverallIngredientsTitle(raw)) return;
      if (!raw.trim()) {
        current = { heading: null, lines: [] };
        drafts.push(current);
        return;
      }
      const heading = cleanGroupHeading(raw);
      if (!heading) return;
      current = { heading, lines: [] };
      drafts.push(current);
      return;
    }
    if (!node.is(itemSelector)) return;
    const text = strippedText($, el);
    if (!text || text.length > 200) return;
    const inlineHeading = ingredientGroupHeading(text);
    if (inlineHeading) {
      current = { heading: inlineHeading, lines: [] };
      drafts.push(current);
      return;
    }
    let bucket = current;
    if (!bucket) {
      bucket = { heading: null, lines: [] };
      drafts.push(bucket);
      current = bucket;
    }
    bucket.lines.push(text);
  });

  const filled = drafts.filter(group => group.lines.length > 0);
  if (!filled.some(group => group.heading)) return null;
  return filled;
}

function siblingListGroups($: cheerio.CheerioAPI): HtmlGroup[] | null {
  const lists = $('ul, ol').filter((_, el) => {
    if (!elementVisible($, el)) return false;
    const cls = `${$(el).attr('class') || ''} ${$(el).attr('id') || ''}`;
    return /ingredient/i.test(cls);
  });
  if (lists.length < 2) return null;
  const parent = lists.first().parent();
  const drafts: HtmlGroup[] = [];
  let headed = false;
  lists.each((_, el) => {
    if ($(el).parent()[0] !== parent[0]) return;
    const prev = $(el).prevAll('h2, h3, h4, h5, h6').first();
    let heading: string | null = null;
    if (prev.length) {
      const raw = decodeHtmlEntities(prev.text().replace(/\s+/g, ' ').trim());
      if (!isOverallIngredientsTitle(raw)) heading = cleanGroupHeading(raw);
    }
    if (heading) headed = true;
    const lines: string[] = [];
    $(el).children('li').each((__, li) => {
      const text = strippedText($, li);
      if (text && text.length < 200 && !ingredientGroupHeading(text)) lines.push(text);
    });
    if (lines.length) drafts.push({ heading, lines });
  });
  if (!headed) return null;
  return drafts;
}

function draftsToIngredients(drafts: HtmlGroup[]): Ingredient[] {
  const out: Ingredient[] = [];
  for (const draft of drafts) {
    for (const line of draft.lines) {
      const ing = parseIngredientLine(line);
      if (!ing.name) continue;
      out.push(draft.heading ? { ...ing, group: draft.heading } : ing);
    }
  }
  return out;
}

function extractHtmlGroups($: cheerio.CheerioAPI): Ingredient[] | null {
  for (const sel of GROUP_CONTAINERS) {
    const containers = $(sel).filter((_, el) => elementVisible($, el));
    for (let i = 0; i < containers.length; i++) {
      const container = containers.eq(i);
      if (!looksLikeIngredientBlock($, container)) continue;
      const drafts = groupsInContainer($, container);
      if (drafts) return draftsToIngredients(drafts);
    }
  }
  const sibling = siblingListGroups($);
  return sibling ? draftsToIngredients(sibling) : null;
}

function applyHtmlGroups($: cheerio.CheerioAPI, parsed: Ingredient[]): Ingredient[] {
  const grouped = extractHtmlGroups($);
  if (!grouped) return parsed;
  return mergeGroupedIngredients(parsed, grouped, true);
}

/** Test seam: stamp or replace `parsed` using grouped headings in `html`. */
export function ingredientsWithHtmlGroups(html: string, parsed: Ingredient[]): Ingredient[] {
  return applyHtmlGroups(cheerio.load(html), parsed);
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
        // Drop screen-reader-only markers (e.g. WPRM's "▢ " checkbox glyph) and
        // faded note spans so they don't pollute the parsed ingredient text.
        const $el = $(el).clone();
        $el.find('.sr-only, .screen-reader-text, [class*="screen-reader"], [class*="sr-only"], [class*="ingredient-notes"]').remove();
        const text = $el.text().replace(/\s+/g, ' ').trim();
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

export function parseIngredientLine(line: string): Ingredient {
  return _parseIngredientLine(line);
}

// Normalise whitespace and comma artifacts left behind after edits.
// WP Recipe Maker often emits notes as "(, sliced…)" because it wraps a
// comma-prefixed note field in parentheses. Drop that leading comma so the
// comment reads "(sliced…)" instead of "(, sliced…)".
function tidyName(s: string): string {
  return s
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')             // " ," → ","
    .replace(/,\s*(?:,\s*)+/g, ', ')   // ",," / ", ," → ", "
    .replace(/\(\s*,+\s*/g, '(')       // "(, foo)" → "(foo)"
    .replace(/,\s*\)/g, ')')           // "(foo,)" → "(foo)"
    .replace(/\(\s*\)/g, '')           // empty parens left behind
    .replace(/^[\s,;]+/, '')           // leading punctuation
    .replace(/[\s,;]+$/, '')           // trailing punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

// Keep prep comments on the name (including RecipeTin "(Note 2)" citations).
// Only tidy punctuation — do not delete the parenthetical.
function stripNotes(s: string): string {
  return tidyName(s);
}

function _parseIngredientLine(line: string): Ingredient {
  // 1. Basic whitespace normalisation. JSON-LD often leaves &#39; as text.
  let cleaned = decodeHtmlEntities(line).trim().replace(/\s+/g, ' ');

  // 2. Strip leading bullets/checkbox glyphs/punctuation (but NOT leading parens
  //    that are part of amounts). Covers WPRM screen-reader markers like "▢ ".
  cleaned = cleaned.replace(/^[\s\-\*\•\·\/▢☐□✓✔◻◼▪▫◦‣]+/, '');

  // 3. Strip trailing unbalanced parentheses and annotation fragments
  //    e.g. "masala ((note 1" → "masala"
  cleaned = cleaned
    .replace(/\s*\(+[^)]*$/, '')        // unclosed ( at end
    .replace(/[\s,;]+$/, '')             // trailing punctuation
    .trim();

  if (!cleaned) return { amount: '', unit: '', name: '' };

  // 4. Unit list — ordered longest-first so alternation is greedy.
  //    Single-letter units (g, l) come LAST and use \b word boundaries
  //    so they can't match mid-word (e.g. "Green", "large").
  const UNITS = [
    'tablespoons?', 'tbsps?', 'tbsp',
    'teaspoons?',   'tsps?',  'tsp',
    'fl\\.?\\s*oz',
    'millilitres?', 'milliliters?', 'mls?',
    'kilograms?',   'kgs?',
    'ounces?',      'ozs?', 'oz',
    'pounds?',      'lbs?',
    'litres?',      'liters?',
    'cups?',
    'grams?',
    // Count units — no boundary issues
    'bunche?s?', 'handfuls?', 'pinch(?:es)?',
    'packages?', 'pkgs?', 'cans?', 'tins?',
    'slices?', 'pieces?', 'strips?', 'sheets?',
    'stalks?', 'sprigs?', 'heads?',
    'rashers?', 'fillets?', 'cloves?',
    'inches?', 'cms?',
    // Single-letter units LAST — rely on word boundary in regex
    'kg', 'ml', 'oz', 'lb', 'lbs',
    'g',                               // must be last — most likely to false-match
  ];
  const unitAlt = UNITS.join('|');

  // 5. Split glued units like "100g", "1½tsp", "500g/1lb" before reading the amount
  cleaned = splitGluedUnits(cleaned, unitAlt).replace(/\s+/g, ' ').trim();

  const leading = parseLeadingAmount(cleaned);
  if (leading) {
    const originalAmount = cleaned.slice(0, leading.end).trim();
    let rest = stripHyphenBeforeUnit(cleaned.slice(leading.end).trim(), unitAlt).trim();
    const unitMatch = rest.match(new RegExp(`^(${unitAlt})\\.?\\b\\s*`, 'i'));
    let rawUnit = '';
    let rawName = rest;
    if (unitMatch) {
      rawUnit = unitMatch[1];
      rawName = rest.slice(unitMatch[0].length).trim();
    }

    // Drop a redundant alternate measurement that follows a slash, i.e. the
    // metric/imperial dual amounts used by RecipeTin Eats / WPRM:
    //   "600 g / 1.2 lb scotch fillet…"  → amount=600 unit=g, name "/ 1.2 lb …"
    //   → strip "/ 1.2 lb " so the name is just "scotch fillet…".
    // Only fires when the slash is immediately followed by number(s) + a unit,
    // so an alternate *ingredient* like "beef / chicken" is left untouched.
    rawName = stripAlternateMeasurement(rawName, unitAlt);

    rawName = stripNotes(rawName);
    if (!rawName) rawName = cleaned.slice(leading.end).trim();

    const result = fixSizeWordUnit({ amount: originalAmount, unit: rawUnit, name: rawName });
    if (result.name) return result;
  }

  return { amount: '', unit: '', name: stripNotes(cleaned) };
}

// Size words that must never end up as units
const SIZE_AS_UNIT = new Set(['large', 'medium', 'small', 'extra large', 'extra-large', 'jumbo', 'mini']);
const BOGUS_UNIT_MAP: Record<string, string> = {
  l: 'large', lg: 'large', lge: 'large',
  m: 'medium', med: 'medium',
  s: 'small', sm: 'small',
  xl: 'extra large',
};

function fixSizeWordUnit(ing: Ingredient): Ingredient {
  if (!ing.unit) return ing;
  const u = ing.unit.toLowerCase().trim();
  // Exact match on bogus abbreviations (only when no other plausible unit)
  if (BOGUS_UNIT_MAP[u]) {
    return { amount: ing.amount, unit: '', name: `${BOGUS_UNIT_MAP[u]} ${ing.name}`.trim() };
  }
  // Full size word mistakenly in unit field
  if (SIZE_AS_UNIT.has(u)) {
    return { amount: ing.amount, unit: '', name: `${ing.unit} ${ing.name}`.trim() };
  }
  return ing;
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
