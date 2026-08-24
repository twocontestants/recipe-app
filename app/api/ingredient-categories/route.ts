import { NextRequest, NextResponse } from 'next/server';
import {
  getCategoryDictionary,
  listOwnedIngredientLines,
  setCategoryDictionaryEntry, deleteCategoryDictionaryEntry,
} from '@/lib/db';
import { aggregateIngredientDictionary } from '@/lib/settingsLoad';
import { isAuthUser, requireUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export type { DictionaryEntry } from '@/lib/settingsLoad';

// GET /api/ingredient-categories
// Returns every normalised ingredient that appears across the user's recipes,
// each with its effective category (override if set, else rule-based), plus the
// list of available categories for the editor's dropdowns.
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const [recipes, overrides] = await Promise.all([
      listOwnedIngredientLines(user.id),
      getCategoryDictionary(user.id),
    ]);
    return NextResponse.json(aggregateIngredientDictionary(recipes, overrides));
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
