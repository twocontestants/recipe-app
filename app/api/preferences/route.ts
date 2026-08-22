import { NextRequest, NextResponse } from 'next/server';
import { getAppSetting, setAppSetting } from '@/lib/db';
import { indexToDayKey, parseDayOfWeek, parseWeekStartDay } from '@/lib/plannerDays';

export const dynamic = 'force-dynamic';

const CATEGORY_PREF_KEY = 'categoryPrefMode';
const WEEK_START_KEY = 'weekStartDay';
const VALID_PREF = ['ask', 'always', 'never'];

export async function GET() {
  try {
    const [mode, weekRaw] = await Promise.all([
      getAppSetting(CATEGORY_PREF_KEY),
      getAppSetting(WEEK_START_KEY),
    ]);
    return NextResponse.json({
      categoryPrefMode: mode && VALID_PREF.includes(mode) ? mode : 'ask',
      weekStartDay: parseWeekStartDay(weekRaw),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    let updated = false;

    if (body.categoryPrefMode !== undefined) {
      if (!VALID_PREF.includes(body.categoryPrefMode)) {
        return NextResponse.json({ error: 'invalid categoryPrefMode' }, { status: 400 });
      }
      await setAppSetting(CATEGORY_PREF_KEY, body.categoryPrefMode);
      updated = true;
    }

    if (body.weekStartDay !== undefined) {
      const day = parseDayOfWeek(body.weekStartDay);
      if (day === null) {
        return NextResponse.json({ error: 'invalid weekStartDay' }, { status: 400 });
      }
      await setAppSetting(WEEK_START_KEY, indexToDayKey(day));
      updated = true;
    }

    if (!updated) {
      return NextResponse.json({ error: 'nothing to update' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
