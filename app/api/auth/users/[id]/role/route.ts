import { NextRequest, NextResponse } from 'next/server';
import { countModerators, getUserById, updateUserRole } from '@/lib/db';
import { isRole, wouldRemoveLastModerator } from '@/lib/roles';
import { isModerator } from '@/lib/roles';
import { isAuthUser, requireUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const actor = await requireUser(req);
    if (!isAuthUser(actor)) return actor;
    if (!isModerator(actor.role)) {
      return NextResponse.json({ error: 'Moderators only' }, { status: 403 });
    }
    const body = await req.json();
    if (!isRole(body.role)) {
      return NextResponse.json({ error: 'role must be cook, publisher, or moderator' }, { status: 400 });
    }
    const target = await getUserById(params.id);
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const mods = await countModerators();
    if (wouldRemoveLastModerator(target.role, body.role, mods)) {
      return NextResponse.json({ error: 'The platform needs at least one moderator' }, { status: 409 });
    }
    const updated = await updateUserRole(params.id, body.role);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
