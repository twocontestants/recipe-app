import { NextRequest, NextResponse } from 'next/server';
import { getPlannerNotes, getPlannerNotesInRange, setPlannerNote } from '@/lib/db';
import { PLANNER_RANGE_MAX_DAYS, inclusiveDayCount, isDayIso } from '@/lib/plannerMonth';
import { isAuthUser, requireUser } from '@/lib/session';

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!isAuthUser(user)) return user;
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  if (from && to) {
    if (!isDayIso(from) || !isDayIso(to) || from > to) {
      return NextResponse.json({ error: 'from and to must be YYYY-MM-DD with from ≤ to' }, { status: 400 });
    }
    if (inclusiveDayCount(from, to) > PLANNER_RANGE_MAX_DAYS) {
      return NextResponse.json({ error: 'date range is too long' }, { status: 400 });
    }
    const notes = await getPlannerNotesInRange(from, to, user.id);
    return NextResponse.json(notes);
  }
  const weekStart = searchParams.get('weekStart');
  if (!weekStart) return NextResponse.json({}, { status: 400 });
  const notes = await getPlannerNotes(weekStart, user.id);
  return NextResponse.json(notes);
}

export async function PUT(req: NextRequest) {
  const user = await requireUser(req);
  if (!isAuthUser(user)) return user;
  const weekStart = new URL(req.url).searchParams.get('weekStart');
  if (!weekStart) return NextResponse.json({ error: 'weekStart required' }, { status: 400 });
  const { dayOfWeek, note } = await req.json();
  await setPlannerNote(weekStart, dayOfWeek, note ?? '', user.id);
  return NextResponse.json({ success: true });
}
