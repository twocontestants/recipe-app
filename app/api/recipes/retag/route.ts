import { NextResponse } from 'next/server';
import { getAllRecipes, updateRecipe } from '@/lib/db';
import { autoTag } from '@/lib/autotag';

/**
 * One-shot backfill: runs the auto-tagger over every existing recipe, filling in
 * a primary protein where one is missing and enriching tags. Existing proteins
 * are never overwritten. Safe to run multiple times (idempotent once settled).
 *
 * Trigger by visiting /api/recipes/retag once after deploying.
 */
export async function GET() {
  try {
    const recipes = await getAllRecipes();
    let updated = 0;
    const changes: Array<{ title: string; primary_protein?: string; tags: string[] }> = [];

    for (const r of recipes) {
      const auto = autoTag(r.title, r.ingredients, r.tags || []);
      const setProtein = !r.primary_protein && !!auto.primary_protein;

      const before = [...(r.tags || [])].map(t => t.toLowerCase()).sort().join('|');
      const after = [...auto.tags].sort().join('|');
      const tagsChanged = before !== after;

      if (setProtein || tagsChanged) {
        await updateRecipe(r.id, {
          // pass the existing protein back when we're not setting one, so the
          // COALESCE in updateRecipe leaves it untouched
          primary_protein: setProtein ? auto.primary_protein : (r.primary_protein || ''),
          tags: auto.tags,
        });
        updated++;
        changes.push({
          title: r.title,
          primary_protein: setProtein ? auto.primary_protein : undefined,
          tags: auto.tags,
        });
      }
    }

    return NextResponse.json({ success: true, total: recipes.length, updated, changes });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
