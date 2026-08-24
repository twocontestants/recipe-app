import { NextRequest, NextResponse } from 'next/server';
import { getRecipeById, setRecipeNote } from '@/lib/db';
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
    const note = String(body.note ?? '');
    await setRecipeNote(user.id, params.id, note);
    return NextResponse.json({ note: note.trim() });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
