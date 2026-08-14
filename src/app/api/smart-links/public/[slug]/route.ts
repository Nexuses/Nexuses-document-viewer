import { NextRequest, NextResponse } from 'next/server';
import { getSmartLinkBySlug, incrementSmartLinkViews } from '@/lib/smart-links';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const link = await getSmartLinkBySlug(slug);
  if (!link) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(link);
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const link = await getSmartLinkBySlug(slug);
  if (!link?._id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  await incrementSmartLinkViews(link._id);
  return NextResponse.json({ success: true });
}
