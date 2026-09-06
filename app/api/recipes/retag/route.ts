import { NextRequest, NextResponse } from 'next/server';
import { listRecipes, updateRecipe } from '@/lib/db';
import { autoTag } from '@/lib/autotag';
import { isAuthUser, requireUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const recipes = await listRecipes({ viewerId: user.id, ownedOnly: true });
    let updated = 0;
    const changes: Array<{ title: string; primary_protein?: string; tags: string[] }> = [];

    for (const r of recipes) {
      const auto = autoTag(r.title, r.ingredients || [], r.tags || [], r.steps || []);
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
