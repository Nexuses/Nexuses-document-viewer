import { NextRequest, NextResponse } from 'next/server';
import { getSmartLinkActor } from '@/lib/auth';
import { getProjectAdminStats, getSmartLinkStats } from '@/lib/smart-links';

export async function GET(request: NextRequest) {
  const actor = await getSmartLinkActor(request);
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (actor.role === 'project') {
    const stats = await getProjectAdminStats(actor.projectId);
    return NextResponse.json(stats);
  }
  const stats = await getSmartLinkStats();
  return NextResponse.json(stats);
}
