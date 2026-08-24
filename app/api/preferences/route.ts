import { NextRequest, NextResponse } from 'next/server';
import { getAppSettings, setAppSetting } from '@/lib/db';
import { indexToDayKey, parseDayOfWeek, parseWeekStartDay } from '@/lib/plannerDays';
import { PREFERENCE_KEYS } from '@/lib/settingsLoad';
import { isAuthUser, requireUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

const CATEGORY_PREF_KEY = 'categoryPrefMode';
const WEEK_START_KEY = 'weekStartDay';
const VALID_PREF = ['ask', 'always', 'never'];

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const settings = await getAppSettings(user.id, PREFERENCE_KEYS);
    const mode = settings[CATEGORY_PREF_KEY];
    return NextResponse.json({
      categoryPrefMode: mode && VALID_PREF.includes(mode) ? mode : 'ask',
      weekStartDay: parseWeekStartDay(settings[WEEK_START_KEY]),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const body = await req.json();
    let updated = false;

    if (body.categoryPrefMode !== undefined) {
      if (!VALID_PREF.includes(body.categoryPrefMode)) {
        return NextResponse.json({ error: 'invalid categoryPrefMode' }, { status: 400 });
      }
      await setAppSetting(user.id, CATEGORY_PREF_KEY, body.categoryPrefMode);
      updated = true;
    }

    if (body.weekStartDay !== undefined) {
      const day = parseDayOfWeek(body.weekStartDay);
      if (day === null) {
        return NextResponse.json({ error: 'invalid weekStartDay' }, { status: 400 });
      }
      await setAppSetting(user.id, WEEK_START_KEY, indexToDayKey(day));
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
