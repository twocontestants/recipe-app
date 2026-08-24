import { NextResponse } from 'next/server';
import { JESSICA_LOGIN, setupDatabase } from '@/lib/db';

// Creates/migrates DB tables — must run per-request, never at build.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await setupDatabase();
    return NextResponse.json({
      success: true,
      jessica_login: JESSICA_LOGIN,
      message:
        'Database setup complete. Sign in as Jessica with BOOTSTRAP_OWNER_PASSWORD from the host that runs this app.',
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
