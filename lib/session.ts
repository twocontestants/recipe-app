import { NextRequest, NextResponse } from 'next/server';
import { isSessionId, SESSION_COOKIE } from './auth';
import { getSessionUser, touchSession } from './db';
import type { AuthUser } from './roles';

export async function optionalUser(req: NextRequest): Promise<AuthUser | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!isSessionId(token)) return null;
  const user = await getSessionUser(token);
  if (!user) return null;
  await touchSession(token);
  return user;
}

export async function requireUser(req: NextRequest): Promise<AuthUser | NextResponse> {
  const user = await optionalUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }
  return user;
}

export function isAuthUser(value: AuthUser | NextResponse): value is AuthUser {
  return !(value instanceof NextResponse);
}
