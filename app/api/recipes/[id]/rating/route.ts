import { NextRequest, NextResponse } from 'next/server';
import { getRecipeById, setRecipeRating } from '@/lib/db';
import { isAuthUser, requireUser } from '@/lib/session';
import { canViewRecipe } from '@/lib/visibility';

export async function PUT(
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
    const body = await req.json();
    const stars = body.stars == null || body.stars === '' ? null : Number(body.stars);
    if (stars != null && (!Number.isInteger(stars) || stars < 1 || stars > 5)) {
      return NextResponse.json({ error: 'stars must be 1–5 or empty' }, { status: 400 });
    }
    await setRecipeRating(user.id, params.id, stars);
    return NextResponse.json({ stars });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
