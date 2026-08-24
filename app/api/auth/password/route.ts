import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { getUserWithPassword, updateUserPassword } from '@/lib/db';
import { parsePasswordChangeBody } from '@/lib/passwordChange';
import { isAuthUser, requireUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest) {
  try {
    const actor = await requireUser(req);
    if (!isAuthUser(actor)) return actor;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Current and new password are required' }, { status: 400 });
    }

    const parsed = parsePasswordChangeBody(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const stored = await getUserWithPassword(actor.id);
    if (!stored || !(await verifyPassword(parsed.currentPassword, stored.password_hash))) {
      return NextResponse.json({ error: 'Current password is wrong' }, { status: 401 });
    }

    await updateUserPassword(actor.id, await hashPassword(parsed.newPassword));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
