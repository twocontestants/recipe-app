import { NextRequest, NextResponse } from 'next/server';
import { getRecipeById, setRecipeVisibility } from '@/lib/db';
import { isAuthUser, requireUser } from '@/lib/session';
import { canUnpublishRecipe, canViewRecipe } from '@/lib/visibility';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const recipe = await getRecipeById(params.id, user.id);
    if (!recipe || !canViewRecipe(user, recipe)) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }
    if (!canUnpublishRecipe(user, recipe)) {
      return NextResponse.json({ error: 'You cannot unpublish this recipe' }, { status: 403 });
    }
    const updated = await setRecipeVisibility(params.id, 'private');
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
