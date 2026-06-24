import { NextRequest, NextResponse } from 'next/server';
import { getAppSetting, setAppSetting } from '@/lib/db';

export const dynamic = 'force-dynamic';

const CATEGORY_PREF_KEY = 'categoryPrefMode';
const VALID = ['ask', 'always', 'never'];

// GET /api/preferences → { categoryPrefMode }
export async function GET() {
  try {
    const mode = (await getAppSetting(CATEGORY_PREF_KEY)) ?? 'ask';
    return NextResponse.json({ categoryPrefMode: VALID.includes(mode) ? mode : 'ask' });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PUT /api/preferences  body: { categoryPrefMode: 'ask' | 'always' | 'never' }
export async function PUT(req: NextRequest) {
  try {
    const { categoryPrefMode } = await req.json();
    if (!VALID.includes(categoryPrefMode)) {
      return NextResponse.json({ error: 'invalid categoryPrefMode' }, { status: 400 });
    }
    await setAppSetting(CATEGORY_PREF_KEY, categoryPrefMode);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
