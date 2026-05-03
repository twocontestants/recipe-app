import { NextRequest, NextResponse } from 'next/server';
import { scrapeRecipe } from '@/lib/scraper';

export async function POST(req: NextRequest) {
  try {
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
    return NextResponse.json({ ...recipe, source_url: url });
  } catch (error) {
    console.error('Scrape error:', error);
    return NextResponse.json(
      { error: `Failed to scrape recipe: ${String(error)}` },
      { status: 500 }
    );
  }
}
