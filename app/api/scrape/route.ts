import { NextRequest, NextResponse } from 'next/server';
import { scrapeRecipe } from '@/lib/scraper';
import { autoTag } from '@/lib/autotag';
import { isAuthUser, requireUser } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    const recipe = await scrapeRecipe(url);
    const { primary_protein, tags } = autoTag(recipe.title, recipe.ingredients);
    return NextResponse.json({ ...recipe, source_url: url, primary_protein: primary_protein ?? '', tags });
  } catch (error) {
    console.error('Scrape error:', error);
    return NextResponse.json(
      { error: `Failed to scrape recipe: ${String(error)}` },
      { status: 500 }
    );
  }
}
