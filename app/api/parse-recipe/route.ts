import { NextRequest, NextResponse } from 'next/server';
import { parseRecipeText } from '@/lib/recipeTextParser';
import { autoTag } from '@/lib/autotag';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const parsed = parseRecipeText(text);
    const auto = autoTag(parsed.title, parsed.ingredients);
    return NextResponse.json({
      ...parsed,
      primary_protein: parsed.primary_protein || auto.primary_protein || '',
      tags: auto.tags,
    });
  } catch (error) {
    console.error('Parse recipe error:', error);
    return NextResponse.json(
      { error: `Failed to parse recipe: ${String(error)}` },
      { status: 500 }
    );
  }
}
