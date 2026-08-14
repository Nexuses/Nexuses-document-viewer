import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSmartLinkStats } from '@/lib/smart-links';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const stats = await getSmartLinkStats();
  return NextResponse.json(stats);
}
