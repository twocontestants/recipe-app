import { NextRequest, NextResponse } from 'next/server';
import { duplicateRecipe, getRecipeById } from '@/lib/db';
import { isAuthUser, requireUser } from '@/lib/session';
import { canViewRecipe } from '@/lib/visibility';

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
    const copy = await duplicateRecipe(params.id, user.id);
    return NextResponse.json(copy, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
