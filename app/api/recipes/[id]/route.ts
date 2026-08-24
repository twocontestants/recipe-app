import { NextRequest, NextResponse } from 'next/server';
import { deleteRecipe, getRecipeById, updateRecipe } from '@/lib/db';
import { isAuthUser, optionalUser, requireUser } from '@/lib/session';
import { canEditRecipe, canPublishRecipe, canViewRecipe } from '@/lib/visibility';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await optionalUser(req);
    const recipe = await getRecipeById(params.id, user?.id ?? null);
    if (!recipe || !canViewRecipe(user, recipe)) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }
    return NextResponse.json({ ...recipe, can_publish: canPublishRecipe(user, recipe) });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const existing = await getRecipeById(params.id, user.id);
    if (!existing || !canViewRecipe(user, existing)) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }
    if (!canEditRecipe(user, existing)) {
      return NextResponse.json({ error: 'You can duplicate this recipe to edit your own copy' }, { status: 403 });
    }
    const body = await req.json();
    delete body.owner_id;
    delete body.visibility;
    const recipe = await updateRecipe(params.id, body);
    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }
    return NextResponse.json({ ...recipe, can_publish: canPublishRecipe(user, recipe) });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const existing = await getRecipeById(params.id, user.id);
    if (!existing || !canViewRecipe(user, existing)) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }
    if (!canEditRecipe(user, existing)) {
      return NextResponse.json({ error: 'Only the owner can delete this recipe' }, { status: 403 });
    }
    const deleted = await deleteRecipe(params.id, user.id);
    if (!deleted) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
