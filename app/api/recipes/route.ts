import { NextRequest, NextResponse } from 'next/server';
import { createRecipe, listRecipeCards } from '@/lib/db';
import { canPublishRecipe } from '@/lib/visibility';
import { isAuthUser, optionalUser, requireUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await optionalUser(req);
    const { searchParams } = new URL(req.url);
    const includePublic = searchParams.get('includePublic') === '1';
    const ownedOnly = searchParams.get('ownedOnly') === '1';
    const recipes = await listRecipeCards({
      viewerId: user?.id ?? null,
      includePublic,
      ownedOnly,
    });
    return NextResponse.json(recipes.map(r => ({
      ...r,
      can_publish: canPublishRecipe(user, r),
    })));
  } catch (error) {
    console.error('GET /api/recipes error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const body = await req.json();

    if (!body.title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const recipe = await createRecipe({
      title: body.title,
      description: body.description,
      source_url: body.source_url,
      image_url: body.image_url,
      servings: body.servings || 4,
      prep_time: body.prep_time,
      cook_time: body.cook_time,
      ingredients: body.ingredients || [],
      steps: body.steps || [],
      tags: body.tags || [],
      primary_protein: body.primary_protein || null,
      owner_id: user.id,
      visibility: 'private',
    });

    return NextResponse.json({ ...recipe, can_publish: canPublishRecipe(user, recipe) }, { status: 201 });
  } catch (error) {
    console.error('POST /api/recipes error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
