import { NextRequest, NextResponse } from 'next/server';
import { optionalUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await optionalUser(req);
    if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
