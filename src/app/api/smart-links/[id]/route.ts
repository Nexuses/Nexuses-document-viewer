import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  deleteSmartLink,
  getSmartLinkById,
  slugExists,
  slugify,
  updateSmartLink,
} from '@/lib/smart-links';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const link = await getSmartLinkById(id);
  if (!link) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(link);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const existing = await getSmartLinkById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.title === 'string') updates.title = body.title.trim();
    if (typeof body.description === 'string') updates.description = body.description;
    if (typeof body.coverImage === 'string') updates.coverImage = body.coverImage;
    if (typeof body.companyLogo === 'string') updates.companyLogo = body.companyLogo;
    if (body.status === 'draft' || body.status === 'published') updates.status = body.status;
    if (Array.isArray(body.content)) updates.content = body.content;

    if (typeof body.slug === 'string') {
      const slug = slugify(body.slug);
      if (await slugExists(slug, id)) {
        return NextResponse.json({ error: 'Slug already in use' }, { status: 400 });
      }
      updates.slug = slug;
    }

    const updated = await updateSmartLink(id, updates);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update smart link error:', error);
    return NextResponse.json({ error: 'Failed to update smart link' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const ok = await deleteSmartLink(id);
  if (!ok) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
