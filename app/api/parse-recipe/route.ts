import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }

    const prompt = `Parse the following recipe text and extract structured data from it.

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "title": "Recipe name",
  "description": "Brief description if present, otherwise empty string",
  "servings": 4,
  "prep_time": null,
  "cook_time": null,
  "ingredients": [
    { "amount": "2", "unit": "cups", "name": "flour" }
  ],
  "steps": [
    "First step description.",
    "Second step description."
  ],
  "tags": [],
  "primary_protein": null
}

Rules:
- "amount" should be a string like "2", "1/2", "¼", or empty string if not specified
- "unit" should be the unit like "cups", "tbsp", "g", "kg", or empty string if not specified  
- "name" is the ingredient name including any notes like "finely chopped" or "at room temperature"
- "prep_time" and "cook_time" should be integers (minutes) or null
- "servings" should be an integer, default to 4 if not specified
- Steps should be clean, complete sentences
- "primary_protein": the single dominant protein source. Choose from: chicken, beef, pork, lamb, fish, seafood, tofu, eggs, legumes, dairy — or null if unclear or vegetable-only
- Extract tags from any cuisine/category info if present

Recipe text:
${text}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude API error: ${err}`);
    }

    const data = await response.json();
    const raw = data.content?.[0]?.text ?? '';

    // Strip any accidental markdown fences
    const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Parse recipe error:', error);
    return NextResponse.json(
      { error: `Failed to parse recipe: ${String(error)}` },
      { status: 500 }
    );
  }
}
