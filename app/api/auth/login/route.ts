import { NextRequest, NextResponse } from 'next/server';
import { newSessionId, SESSION_COOKIE, sessionCookieOptions, verifyPassword } from '@/lib/auth';
import { createSession, getUserByLogin, setupDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await setupDatabase();
    const body = await req.json();
    const login = String(body.login ?? body.email ?? '').trim();
    const password = String(body.password ?? '');
    if (!login || !password) {
      return NextResponse.json({ error: 'Sign-in name and password are required' }, { status: 400 });
    }
    const found = await getUserByLogin(login);
    if (!found || !(await verifyPassword(password, found.password_hash))) {
      return NextResponse.json({ error: 'Wrong sign-in name or password' }, { status: 401 });
    }
    const sessionId = newSessionId();
    await createSession(found.id, sessionId);
    const res = NextResponse.json({
      id: found.id,
      login_name: found.login_name,
      display_name: found.display_name,
      role: found.role,
    });
    res.cookies.set(SESSION_COOKIE, sessionId, sessionCookieOptions());
    return res;
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
