import { NextRequest, NextResponse } from 'next/server';
import {
  getCategoryDictionary,
  listRecipes,
  setCategoryDictionaryEntry, deleteCategoryDictionaryEntry,
} from '@/lib/db';
import { normalizeIngredientName, categorizeIngredient, CATEGORY_ORDER } from '@/lib/shopping';
import { isAuthUser, requireUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export interface DictionaryEntry {
  name: string;       // normalised name, e.g. "onion"
  category: string;   // effective category
  autoCategory: string; // what the rules would pick (for "reset to auto")
  source: 'custom' | 'auto';  // custom = user-set override, auto = rule-based
  count: number;      // how many recipes use it
  examples: string[]; // a few raw wordings seen in recipes
}

// GET /api/ingredient-categories
// Returns every normalised ingredient that appears across the user's recipes,
// each with its effective category (override if set, else rule-based), plus the
// list of available categories for the editor's dropdowns.
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const [recipes, overrides] = await Promise.all([
      listRecipes({ viewerId: user.id, ownedOnly: true }),
      getCategoryDictionary(user.id),
    ]);

    // Aggregate by normalised name: count recipes and remember a few raw wordings.
    const agg = new Map<string, { count: number; examples: Set<string> }>();
    for (const r of recipes) {
      const seen = new Set<string>(); // count each recipe once per normalised name
      for (const ing of r.ingredients ?? []) {
        const norm = normalizeIngredientName(ing.name);
        if (!norm) continue;
        const entry = agg.get(norm) ?? { count: 0, examples: new Set<string>() };
        if (!seen.has(norm)) { entry.count += 1; seen.add(norm); }
        if (ing.name?.trim() && entry.examples.size < 3) entry.examples.add(ing.name.trim());
        agg.set(norm, entry);
      }
    }

    // Include any override whose item no longer appears in a recipe, so the user
    // can still see and manage it.
    for (const name of Object.keys(overrides)) {
      if (!agg.has(name)) agg.set(name, { count: 0, examples: new Set<string>() });
    }

    const entries: DictionaryEntry[] = [...agg.entries()].map(([name, { count, examples }]) => {
      const hasOverride = Object.prototype.hasOwnProperty.call(overrides, name);
      const autoCategory = categorizeIngredient(name);
      return {
        name,
        category: hasOverride ? overrides[name] : autoCategory,
        autoCategory,
        source: hasOverride ? 'custom' : 'auto',
        count,
        examples: [...examples],
      };
    });

    entries.sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a.category);
      const bi = CATEGORY_ORDER.indexOf(b.category);
      if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      return a.name.localeCompare(b.name);
    });

    // Categories offered in the editor: the standard aisle order plus any custom
    // categories the user has already assigned.
    const customCats = [...new Set(Object.values(overrides))].filter(c => !CATEGORY_ORDER.includes(c));
    const categories = [...CATEGORY_ORDER, ...customCats];

    return NextResponse.json({ entries, categories });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PUT /api/ingredient-categories  body: { name, category }
export async function PUT(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const { name, category } = await req.json();
    if (!name || !category) {
      return NextResponse.json({ error: 'name and category required' }, { status: 400 });
    }
    await setCategoryDictionaryEntry(user.id, String(name).trim(), String(category).trim());
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/ingredient-categories?name=onion — reset one item back to auto
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const name = new URL(req.url).searchParams.get('name');
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
    await deleteCategoryDictionaryEntry(user.id, name);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
