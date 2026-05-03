import { NextResponse } from 'next/server';
import { setupDatabase } from '@/lib/db';

export async function GET() {
  try {
    await setupDatabase();
    return NextResponse.json({ success: true, message: 'Database setup complete' });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
