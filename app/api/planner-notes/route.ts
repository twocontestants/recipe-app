import { NextRequest, NextResponse } from 'next/server';
import { getPlannerNotes, setPlannerNote } from '@/lib/db';
import { isAuthUser, requireUser } from '@/lib/session';

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!isAuthUser(user)) return user;
  const weekStart = new URL(req.url).searchParams.get('weekStart');
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
