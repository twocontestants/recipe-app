import { NextRequest, NextResponse } from 'next/server';
import { parseRecipeText } from '@/lib/recipeTextParser';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const parsed = parseRecipeText(text);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Parse recipe error:', error);
    return NextResponse.json(
      { error: `Failed to parse recipe: ${String(error)}` },
      { status: 500 }
    );
  }
}
