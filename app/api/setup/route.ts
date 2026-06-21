import { NextResponse } from 'next/server';
import { setupDatabase } from '@/lib/db';

// Creates/migrates DB tables — must run per-request, never at build.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await setupDatabase();
    return NextResponse.json({ success: true, message: 'Database setup complete' });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
