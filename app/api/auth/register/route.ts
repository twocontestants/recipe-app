import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, newSessionId, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth';
import { createSession, createUser, getUserByLogin, setupDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(req: NextRequest) {
  try {
    await setupDatabase();
    const body = await req.json();
    const email = String(body.email ?? '').trim();
    const password = String(body.password ?? '');
    const displayName = String(body.display_name ?? '').trim() || email.split('@')[0];

    if (!looksLikeEmail(email)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }
    if (await getUserByLogin(email)) {
      return NextResponse.json({ error: 'That email is already registered' }, { status: 409 });
    }

    const user = await createUser({
      login_name: email,
      display_name: displayName,
      password_hash: await hashPassword(password),
      role: 'cook',
    });
    const sessionId = newSessionId();
    await createSession(user.id, sessionId);
    const res = NextResponse.json(
      { id: user.id, login_name: user.login_name, display_name: user.display_name, role: user.role },
      { status: 201 },
    );
    res.cookies.set(SESSION_COOKIE, sessionId, sessionCookieOptions());
    return res;
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
