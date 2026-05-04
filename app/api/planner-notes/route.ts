import { NextRequest, NextResponse } from 'next/server';
import { getPlannerNotes, setPlannerNote } from '@/lib/db';

export async function GET(req: NextRequest) {
  const weekStart = new URL(req.url).searchParams.get('weekStart');
  if (!weekStart) return NextResponse.json({}, { status: 400 });
  const notes = await getPlannerNotes(weekStart);
  return NextResponse.json(notes);
}

export async function PUT(req: NextRequest) {
  const weekStart = new URL(req.url).searchParams.get('weekStart');
  if (!weekStart) return NextResponse.json({ error: 'weekStart required' }, { status: 400 });
  const { dayOfWeek, note } = await req.json();
  await setPlannerNote(weekStart, dayOfWeek, note ?? '');
  return NextResponse.json({ success: true });
}
