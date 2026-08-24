import { NextRequest, NextResponse } from 'next/server';
import { listUsers } from '@/lib/db';
import { isModerator } from '@/lib/roles';
import { isAuthUser, requireUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    if (!isModerator(user.role)) {
      return NextResponse.json({ error: 'Moderators only' }, { status: 403 });
    }
    return NextResponse.json(await listUsers());
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
