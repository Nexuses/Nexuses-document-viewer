import { NextResponse } from 'next/server';
import { getProjectUserSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getProjectUserSession();
    return NextResponse.json({
      authenticated: !!session,
      user: session || null,
    });
  } catch {
    return NextResponse.json({ authenticated: false, user: null }, { status: 500 });
  }
}
